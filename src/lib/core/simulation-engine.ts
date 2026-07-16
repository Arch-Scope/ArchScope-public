import { Node, Edge } from "@xyflow/react";
import {
  SimulationNodeData,
  SimulationParams,
  SimulationResult,
  NodeMetrics,
  BottleneckInfo,
  LatencyBreakdownItem,
  TimeSeriesDataPoint,
  LoadProfile,
  TimeComplexity,
} from "@/types";
import { getLoadMultiplier } from "./load-profile";
import { getServiceById } from "../services";

interface GraphNode {
  id: string;
  data: SimulationNodeData;
  children: string[];
  parents: string[];
}

function buildGraph(
  nodes: Node<SimulationNodeData>[],
  edges: Edge[],
): Map<string, GraphNode> {
  const graph = new Map<string, GraphNode>();

  for (const node of nodes) {
    graph.set(node.id, {
      id: node.id,
      data: node.data as SimulationNodeData,
      children: [],
      parents: [],
    });
  }

  for (const edge of edges) {
    const source = graph.get(edge.source);
    const target = graph.get(edge.target);
    if (source && target) {
      if (!source.children.includes(edge.target)) {
        source.children.push(edge.target);
      }
      if (!target.parents.includes(edge.source)) {
        target.parents.push(edge.source);
      }
    }
  }

  return graph;
}

function findEntryNodes(graph: Map<string, GraphNode>): string[] {
  const entries: string[] = [];
  for (const [id, node] of graph) {
    // Only client-type nodes are entry points
    // A node with no parents but not a client is just a floating disconnected node
    if (node.data.componentType === "client") {
      entries.push(id);
    }
  }
  // Fallback: if no client node exists, use nodes with no parents that also have children
  if (entries.length === 0) {
    for (const [id, node] of graph) {
      if (node.parents.length === 0 && node.children.length > 0) {
        entries.push(id);
      }
    }
  }
  return entries;
}

// This is the payload size (in MB) we treat as the "starting point" — at this
// size, every complexity class behaves the same (multiplier = 1, no change).
// It matches the smallest payload size used across all existing presets, so
// old simulations keep giving the exact same results as before this feature
// was added — nothing breaks for people who never touch this new setting.
const REFERENCE_PAYLOAD_MB = 0.001;

// Without a ceiling, an O(n^2) node with a huge payload could produce a
// latency number in the thousands of milliseconds — technically "correct"
// math, but useless to look at and makes every other metric on screen hard
// to read. We cap it here, same idea as the existing 10x cap on load below.
const MAX_COMPLEXITY_MULTIPLIER = 50;

// Given a complexity setting and how big the payload is, work out how much
// to multiply the base latency by.
//
// Example: if complexity is O(n^2) and the payload is twice the reference
// size, ratio = 2, so multiplier = 2^2 = 4 → latency becomes 4x bigger.
function getComplexityMultiplier(
  complexity: TimeComplexity | undefined,
  payloadSizeMB: number,
): number {
  // No complexity set, or explicitly O(1) → no extra scaling at all.
  if (!complexity || complexity === "O(1)") return 1;

  // How many times bigger is the current payload compared to our reference
  // point? (Math.max guards against payload being 0 or missing, so we never
  // divide into something weird.)
  const ratio =
    Math.max(payloadSizeMB, REFERENCE_PAYLOAD_MB) / REFERENCE_PAYLOAD_MB;

  let multiplier: number;
  switch (complexity) {
    case "O(log n)":
      // Grows very slowly — even a big payload only nudges latency up a bit.
      multiplier = Math.log2(ratio + 1);
      break;
    case "O(n)":
      // Grows in direct proportion to payload size.
      multiplier = ratio;
      break;
    case "O(n log n)":
      // A bit worse than linear — common for things like sorting.
      multiplier = ratio * Math.log2(ratio + 1);
      break;
    case "O(n^2)":
      // Grows with the SQUARE of the ratio — this is what makes
      // "payload x2 → latency x4" true.
      multiplier = ratio ** 2;
      break;
    default:
      multiplier = 1;
  }

  // Never let the multiplier exceed our safety ceiling.
  return Math.min(multiplier, MAX_COMPLEXITY_MULTIPLIER);
}

//  Works out how long a node takes to respond, combining:
//   1) its base latency (from the selected AWS service)
//   2) how much slower it gets from payload size + complexity (NEW)
//   3) how much slower it gets from being under heavy request load (existing)
function getEffectiveLatency(
  data: SimulationNodeData,
  rps: number,
  payloadSizeMB: number,
): number {
  // Idle node: not processing any requests, so latency is 0
  if (rps === 0) return 0;

  const service = getServiceById(data.config.serviceId);
  if (!service) return 50;

  const baseLatency = data.config.customLatencyMs ?? service.baseLatencyMs;
  const maxRps = data.config.customMaxRps ?? service.maxRps;
  // NEW: work out how much payload size + complexity should slow this node down.
  const complexityMultiplier = getComplexityMultiplier(
    data.config.timeComplexity,
    payloadSizeMB,
  );

  if (
    data.componentType === "cache" &&
    data.config.cacheHitRate !== undefined
  ) {
    // Cache node only contributes its own lookup latency. On a miss, the downstream
    // DB node (already in the graph) adds its own latency via path traversal.
    // Still apply complexity scaling here too, in case the cache lookup itself
    // is configured as something other than O(1).
    return baseLatency * complexityMultiplier;
  }

  // Latency increases under load (queuing theory approximation)
  const utilization = Math.min(rps / maxRps, 0.99);
  // M/M/1 queue: avgWait = serviceTime / (1 - utilization)
  const loadMultiplier = 1 / (1 - utilization);

  // Final latency = base time, slowed down by BOTH payload/complexity AND load.
  return baseLatency * complexityMultiplier * Math.min(loadMultiplier, 10);
}

function getEffectiveCost(data: SimulationNodeData, rps: number): number {
  const service = getServiceById(data.config.serviceId);
  if (!service) return 0;

  const baseCost = data.config.customCostPerHour ?? service.baseCostPerHour;

  // Provisioned/always-on services: pay base cost even at 0 RPS (server is running)
  // EC2, RDS, ElastiCache, ALB etc. are billed by the hour regardless of traffic
  let totalCost = baseCost;

  // Lambda/serverless: $0 at 0 RPS, scales purely with invocations
  if (service.id === "lambda" || service.id === "lambda_worker") {
    if (rps === 0) return 0;
    const invocationsPerHour = rps * 3600;
    const computeSeconds = invocationsPerHour * (service.baseLatencyMs / 1000);
    totalCost =
      computeSeconds * 0.0000166667 + (invocationsPerHour / 1000000) * 0.2;
  }

  // SQS: $0 at 0 RPS, scales with messages
  if (service.id === "sqs") {
    if (rps === 0) return 0;
    const messagesPerHour = rps * 3600;
    totalCost = (messagesPerHour / 1000000) * 0.4;
  }

  return totalCost;
}

function traversePaths(
  graph: Map<string, GraphNode>,
  startNodes: string[],
): string[][] {
  const paths: string[][] = [];

  function dfs(nodeId: string, currentPath: string[]) {
    const node = graph.get(nodeId);
    if (!node) return;

    currentPath.push(nodeId);

    if (node.children.length === 0) {
      paths.push([...currentPath]);
    } else {
      for (const childId of node.children) {
        if (!currentPath.includes(childId)) {
          dfs(childId, currentPath);
        }
      }
    }

    currentPath.pop();
  }

  for (const startId of startNodes) {
    dfs(startId, []);
  }

  return paths;
}

// ── Load profile: re-exported from shared module ─────────────────────────────
export { getLoadMultiplier } from "./load-profile";

// ── Rate limit state for one simulation run ──────────────────────────────────
interface RLState {
  tokens: number;
  lastRefillSec: number;
  windowStartSec: number;
  requestCount: number;
}

function checkRateLimitSim(
  cfg: SimulationNodeData["config"],
  state: RLState,
  nowSec: number,
): boolean {
  const algo = cfg.rateLimitAlgorithm ?? "token_bucket";
  const ttl = cfg.redisCounterTtlSeconds ?? 60;

  if (algo === "token_bucket" || algo === "leaky_bucket") {
    const bucketSize = cfg.rateLimitBucketSize ?? 100;
    const refillRate = cfg.rateLimitRefillRate ?? 10;
    if (nowSec - state.windowStartSec > ttl) {
      state.tokens = bucketSize;
      state.windowStartSec = nowSec;
      state.lastRefillSec = nowSec;
    }
    const elapsed = nowSec - state.lastRefillSec;
    state.tokens = Math.min(bucketSize, state.tokens + elapsed * refillRate);
    state.lastRefillSec = nowSec;
    if (state.tokens >= 1) {
      state.tokens -= 1;
      return true;
    }
    return false;
  }

  if (algo === "fixed_window") {
    const maxReq = cfg.rateLimitMaxRequests ?? 100;
    const windowSec = cfg.rateLimitWindowSeconds ?? 60;
    if (nowSec - state.windowStartSec > windowSec) {
      state.requestCount = 0;
      state.windowStartSec = nowSec;
    }
    state.requestCount++;
    return state.requestCount <= maxReq;
  }

  if (algo === "sliding_window") {
    const maxReq = cfg.rateLimitMaxRequests ?? 100;
    const windowSec = cfg.rateLimitWindowSeconds ?? 60;
    const elapsed = nowSec - state.windowStartSec;
    if (elapsed > windowSec) {
      state.tokens = state.requestCount;
      state.windowStartSec = nowSec;
      state.requestCount = 0;
    }
    const overlap = Math.max(0, 1 - elapsed / windowSec);
    const weighted = state.tokens * overlap + state.requestCount;
    state.requestCount++;
    return weighted < maxReq;
  }

  return true;
}

// ── Traffic distribution via BFS ─────────────────────────────────────────────
function distributeRps(
  graph: Map<string, GraphNode>,
  entryNodes: string[],
  totalRps: number,
): Map<string, number> {
  // Use Kahn's topological-sort style propagation so that nodes with multiple
  // parents receive RPS contributions from ALL parents before they propagate
  // downstream. This fixes cases like: RL → LB → [API1, API2] where the LB
  // correctly splits and each API server only gets half.

  const nodeRpsMap = new Map<string, number>();
  // Track how many parents have already contributed to each node
  const parentsContributed = new Map<string, number>();

  for (const id of entryNodes) nodeRpsMap.set(id, totalRps);

  const queue = [...entryNodes];
  const enqueued = new Set<string>(entryNodes);

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    const node = graph.get(nodeId);
    if (!node) continue;

    const rps = nodeRpsMap.get(nodeId) ?? 0;
    const uniqueChildren = [...new Set(node.children)];
    if (uniqueChildren.length === 0) continue;

    const isLB = node.data.componentType === "load_balancer";
    const rpsPerChild = isLB ? rps / uniqueChildren.length : rps;

    for (const childId of uniqueChildren) {
      const childNode = graph.get(childId);
      const totalParents = childNode?.parents.length ?? 1;

      // How to combine RPS from multiple parents:
      // - If the child has ANY LB parent, only accumulate contributions FROM
      //   LB parents (sum them). Non-LB edges that bypass the LB are ignored
      //   for RPS — the LB is the intended distributor.
      // - If the child has NO LB parents, take the MAX of all contributions.
      //   This prevents double-counting when two parallel paths (e.g. API1
      //   and API2) both fan into the same downstream node (e.g. Cache).
      const hasAnyLBParent =
        childNode?.parents.some(
          (pid) => graph.get(pid)?.data.componentType === "load_balancer",
        ) ?? false;

      const prev = nodeRpsMap.get(childId) ?? 0;
      if (hasAnyLBParent) {
        // Only accumulate from LB parents; skip non-LB contributions
        if (isLB) {
          nodeRpsMap.set(childId, prev + rpsPerChild);
        }
      } else {
        nodeRpsMap.set(childId, Math.max(prev, rpsPerChild));
      }

      const contributed = (parentsContributed.get(childId) ?? 0) + 1;
      parentsContributed.set(childId, contributed);

      // Only enqueue the child once all its parents have contributed
      if (contributed >= totalParents && !enqueued.has(childId)) {
        enqueued.add(childId);
        queue.push(childId);
      }
    }
  }

  return nodeRpsMap;
}

// ── RL → Queue → Worker topology detected at prepare time ────────────────────
interface QueueWorkerInfo {
  queueMaxMessages: number;
  workerCapacityRps: number; // total drain rate across ALL workers
  workerLatencyMs: number; // avg latency of a single worker
  workerCount: number;
  workerNodeIds: string[];
}

// ── Real-time simulation context (returned by prepareSimulation) ─────────────
export interface SimulationContext {
  nodeMetrics: Record<string, NodeMetrics>;
  latencyBreakdown: LatencyBreakdownItem[];
  bottlenecks: BottleneckInfo[];
  totalCostPerHour: number;
  totalRps: number;
  maxPathLatency: number;
  overloadErrorFrac: number;
  // Per-user rate limit states — one bucket per simulated user
  rlStates: RLState[] | null;
  rlNode: { config: SimulationNodeData["config"] } | null;
  concurrentUsers: number;
  effectiveMaxRps: number;
  // Variable load
  loadProfile: LoadProfile;
  simulationDurationSeconds: number;
  spikeFrequency: number;
  spikeIntensity: number;
  // Queue/worker overflow support
  queueWorker: QueueWorkerInfo | null;
  queueDepth: number;
}

export function prepareSimulation(
  nodes: Node<SimulationNodeData>[],
  edges: Edge[],
  params: SimulationParams,
): SimulationContext {
  const graph = buildGraph(nodes, edges);
  const entryNodes = findEntryNodes(graph);
  const totalRps = params.concurrentUsers * params.requestsPerSecPerUser;
  const nodeRpsMap = distributeRps(graph, entryNodes, totalRps);
  const nodeMetrics: Record<string, NodeMetrics> = {};
  let totalCostPerHour = 0;

  for (const [nodeId, graphNode] of graph) {
    const { data } = graphNode;
    const service = getServiceById(data.config.serviceId);
    if (!service) continue;
    const maxRpsForNode = data.config.customMaxRps ?? service.maxRps;
    const nodeRps = nodeRpsMap.get(nodeId) ?? 0;

    // For rate limiters, utilization is based on the node's processing capacity (maxRps),
    // NOT the rate limit policy. Rate limiting (allow/reject) is handled separately in simulateTick.
    const utilization = Math.min((nodeRps / maxRpsForNode) * 100, 100);
    // NEW: pass payload size so this node's latency reflects its time complexity
    const avgLatency = getEffectiveLatency(data, nodeRps, params.payloadSizeMB);
    const p99Latency = avgLatency * 2.5;
    const costPerHour = getEffectiveCost(data, nodeRps);
    const errorRate = utilization > 95 ? (utilization - 95) * 4 : 0;
    const metrics: NodeMetrics = {
      avgLatencyMs: Math.round(avgLatency * 100) / 100,
      p99LatencyMs: Math.round(p99Latency * 100) / 100,
      throughputRps: Math.min(nodeRps, maxRpsForNode),
      utilizationPercent: Math.round(utilization * 100) / 100,
      costPerHour: Math.round(costPerHour * 10000) / 10000,
      costPerMonth: Math.round(costPerHour * 730 * 100) / 100,
      isBottleneck: utilization > 80,
      errorRate: Math.round(errorRate * 100) / 100,
    };
    if (data.componentType === "cache") {
      const hitRate = data.config.cacheHitRate ?? 0.8;
      metrics.cacheHits = Math.round(nodeRps * hitRate);
      metrics.cacheMisses = Math.round(nodeRps * (1 - hitRate));
    }
    if (data.componentType === "message_queue") {
      metrics.queueDepth = Math.round(
        nodeRps * ((data.config.queueProcessingTimeMs ?? 100) / 1000),
      );
    }
    nodeMetrics[nodeId] = metrics;
    totalCostPerHour += costPerHour;
  }

  const rlNodeFull = [...graph.values()].find(
    (n) => n.data.componentType === "rate_limiter",
  );

  // ── Detect Queue → Worker(s) topology (works with or without upstream RL) ──
  // Must happen BEFORE traversePaths so worker metrics are correct for latency breakdown.
  let queueWorker: QueueWorkerInfo | null = null;
  let queueNodeId: string | null = null;
  const workerNodeIdSet = new Set<string>();
  for (const [nodeId, node] of graph) {
    if (node.data.componentType !== "message_queue") continue;
    const queueMaxMessages = node.data.config.queueMaxMessages ?? 10000;
    const processingTimeMs = node.data.config.queueProcessingTimeMs ?? 100;
    const drainRatePerWorkerPerSec = Math.max(
      1,
      Math.floor(1000 / processingTimeMs),
    );
    const workerNodeIds: string[] = [];
    let totalLatencyMs = 0;
    let totalCapacityRps = 0;
    for (const childId of node.children) {
      const child = graph.get(childId);
      if (child?.data.componentType === "worker") {
        const workerService = getServiceById(child.data.config.serviceId);
        const workerMaxRps =
          child.data.config.customMaxRps ?? workerService?.maxRps ?? 500;
        const workerLatencyMs =
          child.data.config.customLatencyMs ??
          workerService?.baseLatencyMs ??
          100;
        totalCapacityRps += Math.min(drainRatePerWorkerPerSec, workerMaxRps);
        totalLatencyMs += workerLatencyMs;
        workerNodeIds.push(childId);
        workerNodeIdSet.add(childId);
      }
    }
    if (workerNodeIds.length > 0) {
      queueWorker = {
        queueMaxMessages,
        workerCapacityRps: totalCapacityRps,
        workerLatencyMs: totalLatencyMs / workerNodeIds.length,
        workerCount: workerNodeIds.length,
        workerNodeIds,
      };
      queueNodeId = nodeId;
      break;
    }
  }

  // ── Patch queue & worker node metrics with realistic RPS ────────────────────
  if (queueWorker && queueNodeId) {
    const rlRefillRate = rlNodeFull?.data.config.rateLimitRefillRate ?? null;
    const queueInboundRps =
      rlRefillRate !== null
        ? Math.max(0, totalRps - rlRefillRate)
        : (nodeRpsMap.get(queueNodeId) ?? totalRps);
    const totalDrainRps = queueWorker.workerCapacityRps;

    const queueNode = graph.get(queueNodeId);
    if (queueNode) {
      const queueService = getServiceById(queueNode.data.config.serviceId);
      const queueMaxRps =
        queueNode.data.config.customMaxRps ?? queueService?.maxRps ?? 30000;
      // NEW: pass payload size here too, so the queue's own latency scales correctly
      const queueLatency = getEffectiveLatency(
        queueNode.data,
        queueInboundRps,
        params.payloadSizeMB,
      );
      const queueUtil = Math.min((queueInboundRps / queueMaxRps) * 100, 100);
      nodeMetrics[queueNodeId] = {
        avgLatencyMs: Math.round(queueLatency * 100) / 100,
        p99LatencyMs: Math.round(queueLatency * 2.5 * 100) / 100,
        throughputRps: queueInboundRps,
        utilizationPercent: Math.round(queueUtil * 100) / 100,
        costPerHour: nodeMetrics[queueNodeId]?.costPerHour ?? 0,
        costPerMonth: nodeMetrics[queueNodeId]?.costPerMonth ?? 0,
        isBottleneck: queueUtil > 80,
        errorRate: 0,
        queueDepth: Math.round(
          queueInboundRps *
            ((queueNode.data.config.queueProcessingTimeMs ?? 100) / 1000),
        ),
      };
    }

    const rpsPerWorker = totalDrainRps / queueWorker.workerCount;
    for (const wId of queueWorker.workerNodeIds) {
      const workerNode = graph.get(wId);
      if (!workerNode) continue;
      const workerService = getServiceById(workerNode.data.config.serviceId);
      const workerMaxRps =
        workerNode.data.config.customMaxRps ?? workerService?.maxRps ?? 500;
      // NEW: workers process the payload too, so they need the same scaling
      const workerLatency = getEffectiveLatency(
        workerNode.data,
        rpsPerWorker,
        params.payloadSizeMB,
      );
      const workerUtil = Math.min((rpsPerWorker / workerMaxRps) * 100, 100);
      nodeMetrics[wId] = {
        avgLatencyMs: Math.round(workerLatency * 100) / 100,
        p99LatencyMs: Math.round(workerLatency * 2.5 * 100) / 100,
        throughputRps: rpsPerWorker,
        utilizationPercent: Math.round(workerUtil * 100) / 100,
        costPerHour: nodeMetrics[wId]?.costPerHour ?? 0,
        costPerMonth: nodeMetrics[wId]?.costPerMonth ?? 0,
        isBottleneck: workerUtil > 80,
        errorRate: 0,
      };
    }
  }

  // ── Traverse paths for synchronous (client-facing) latency only ───────────
  // Workers are async — the client fires-and-forgets to the queue and doesn't
  // wait for worker completion, so they must not inflate the critical path.
  const paths = traversePaths(graph, entryNodes);
  let maxPathLatency = 0;
  const nodeLatencyContributions = new Map<string, number>();
  for (const path of paths) {
    let pathLatency = 0;
    for (const nodeId of path) {
      if (workerNodeIdSet.has(nodeId)) continue; // async — skip from sync critical path
      const m = nodeMetrics[nodeId];
      if (m) {
        pathLatency += m.avgLatencyMs;
        nodeLatencyContributions.set(
          nodeId,
          Math.max(nodeLatencyContributions.get(nodeId) ?? 0, m.avgLatencyMs),
        );
      }
    }
    maxPathLatency = Math.max(maxPathLatency, pathLatency);
  }

  let totalLatency = 0;
  for (const [, l] of nodeLatencyContributions) totalLatency += l;
  const latencyBreakdown: LatencyBreakdownItem[] = [];
  for (const [nodeId, latency] of nodeLatencyContributions) {
    const gn = graph.get(nodeId);
    if (gn)
      latencyBreakdown.push({
        nodeId,
        nodeLabel: gn.data.label,
        componentType: gn.data.componentType,
        avgLatencyMs: Math.round(latency * 100) / 100,
        percentOfTotal:
          totalLatency > 0
            ? Math.round((latency / totalLatency) * 10000) / 100
            : 0,
      });
  }
  latencyBreakdown.sort((a, b) => b.avgLatencyMs - a.avgLatencyMs);

  const bottlenecks: BottleneckInfo[] = [];
  for (const [nodeId, metrics] of Object.entries(nodeMetrics)) {
    if (!metrics.isBottleneck) continue;
    const gn = graph.get(nodeId);
    if (!gn) continue;
    let suggestion = "Increase instance count or upgrade to a higher tier";
    if (metrics.utilizationPercent > 95)
      suggestion = `CRITICAL: At ${metrics.utilizationPercent.toFixed(0)}% utilization. Immediately scale up or upgrade tier.`;
    else if (gn.data.componentType === "cache")
      suggestion = "Improve cache hit rate or add more cache nodes";
    else if (gn.data.componentType === "database")
      suggestion =
        "Add read replicas, implement caching layer, or upgrade instance";
    else if (gn.data.componentType === "message_queue")
      suggestion =
        "Add more consumers/workers or upgrade to a higher-throughput queue";
    bottlenecks.push({
      nodeId,
      nodeLabel: gn.data.label,
      reason: `${metrics.utilizationPercent.toFixed(0)}% utilization (>${metrics.utilizationPercent > 95 ? "95" : "80"}% threshold)`,
      utilization: metrics.utilizationPercent,
      suggestion,
    });
  }
  bottlenecks.sort((a, b) => b.utilization - a.utilization);

  // One independent RLState per simulated user — rate limiting is per-user, not per system
  const rlStates: RLState[] | null = rlNodeFull
    ? Array.from({ length: params.concurrentUsers }, () => ({
        tokens: rlNodeFull.data.config.rateLimitBucketSize ?? 100,
        lastRefillSec: 0,
        windowStartSec: 0,
        requestCount: 0,
      }))
    : null;
  const rlNode = rlNodeFull ? { config: rlNodeFull.data.config } : null;

  const overloadErrorFrac = Math.max(
    0,
    ...Object.values(nodeMetrics).map((m) => (m.errorRate ?? 0) / 100),
  );
  const effectiveMaxRps = Math.min(
    ...Object.entries(nodeMetrics)
      .filter(([, m]) => m.throughputRps > 0)
      .map(([, m]) => m.throughputRps),
  );

  return {
    nodeMetrics,
    latencyBreakdown,
    bottlenecks,
    totalCostPerHour,
    totalRps,
    maxPathLatency,
    overloadErrorFrac,
    rlStates,
    rlNode,
    concurrentUsers: params.concurrentUsers,
    effectiveMaxRps,
    loadProfile: params.loadProfile ?? "constant",
    simulationDurationSeconds: params.simulationDurationSeconds,
    spikeFrequency: params.spikeFrequency ?? 3,
    spikeIntensity: params.spikeIntensity ?? 3,
    queueWorker,
    queueDepth: 0,
  };
}

// One tick = one simulated second. Mutates rlStates and ctx.queueDepth in-place.
export function simulateTick(
  ctx: SimulationContext,
  second: number,
): TimeSeriesDataPoint {
  const {
    totalRps,
    maxPathLatency,
    overloadErrorFrac,
    rlStates,
    rlNode,
    loadProfile,
    simulationDurationSeconds,
    queueWorker,
    concurrentUsers,
  } = ctx;

  // Apply load profile to get RPS for this tick
  const multiplier = getLoadMultiplier(
    loadProfile,
    second,
    simulationDurationSeconds,
    ctx.spikeFrequency,
    ctx.spikeIntensity,
  );
  const tickRps = totalRps * multiplier;
  const requestsThisSec = Math.round(tickRps);

  let stepSuccess = 0,
    stepFailed = 0,
    stepRateLimited = 0,
    stepQueued = 0,
    stepDrained = 0,
    stepLatencySum = 0;

  for (let r = 0; r < requestsThisSec; r++) {
    const nowSec = second + r / Math.max(requestsThisSec, 1);
    // Assign each simulated request to a user (round-robin) and check that user's own bucket
    const userIdx = r % Math.max(concurrentUsers, 1);
    let isRateLimited = false;
    if (rlNode && rlStates) {
      isRateLimited = !checkRateLimitSim(
        rlNode.config,
        rlStates[userIdx],
        nowSec,
      );
    }
    if (isRateLimited) {
      if (queueWorker && ctx.queueDepth < queueWorker.queueMaxMessages) {
        // Overflow into queue instead of dropping
        ctx.queueDepth++;
        stepQueued++;
      } else {
        stepRateLimited++;
      }
    } else if (Math.random() < overloadErrorFrac) {
      stepFailed++;
    } else {
      stepSuccess++;
      stepLatencySum += maxPathLatency * (1 + (Math.random() - 0.5) * 0.2);
    }
  }

  // ── Worker drains the queue ───────────────────────────────────────────────
  // The worker is dedicated to the queue path — it drains at a fixed rate
  // determined by 1000 / processingTimePerMessage (set on the queue node).
  if (queueWorker && ctx.queueDepth > 0) {
    const drained = Math.min(ctx.queueDepth, queueWorker.workerCapacityRps);
    ctx.queueDepth -= drained;
    stepDrained += drained;
    stepSuccess += drained;
    stepLatencySum +=
      drained *
      (maxPathLatency + queueWorker.workerLatencyMs) *
      (1 + (Math.random() - 0.5) * 0.1);
  }

  return {
    second,
    successful: stepSuccess,
    failed: stepFailed,
    rateLimited: stepRateLimited,
    queued: stepQueued,
    drained: stepDrained,
    queueDepth: ctx.queueDepth,
    rps: requestsThisSec,
    avgLatencyMs:
      stepSuccess > 0
        ? Math.round((stepLatencySum / stepSuccess) * 100) / 100
        : 0,
  };
}

export function finalizeSimulation(
  ctx: SimulationContext,
  timeSeries: TimeSeriesDataPoint[],
  params: SimulationParams,
): SimulationResult {
  const {
    nodeMetrics,
    latencyBreakdown,
    bottlenecks,
    totalCostPerHour,
    totalRps,
    maxPathLatency,
    effectiveMaxRps,
  } = ctx;

  let totalSuccessful = 0,
    totalFailed = 0,
    totalRateLimited = 0,
    totalQueued = 0,
    totalDrained = 0;
  const latencySamples: number[] = [];
  for (const pt of timeSeries) {
    totalSuccessful += pt.successful;
    totalFailed += pt.failed;
    totalRateLimited += pt.rateLimited;
    totalQueued += pt.queued;
    totalDrained += pt.drained ?? 0;
    if (pt.successful > 0) latencySamples.push(pt.avgLatencyMs);
  }
  // Still-buffered = total enqueued minus total drained (items never yet processed)
  const stillBuffered = totalQueued - totalDrained;

  const avgEndToEndLatencyMs =
    latencySamples.length > 0
      ? Math.round(
          (latencySamples.reduce((a, b) => a + b, 0) / latencySamples.length) *
            100,
        ) / 100
      : Math.round(maxPathLatency * 100) / 100;
  const sorted = [...latencySamples].sort((a, b) => a - b);
  const p99EndToEndLatencyMs =
    sorted.length > 0
      ? Math.round(sorted[Math.floor(sorted.length * 0.99)] * 100) / 100
      : Math.round(maxPathLatency * 2.5 * 100) / 100;

  const resolvedRequests = totalSuccessful + totalFailed + totalRateLimited;
  return {
    totalRequests: resolvedRequests + stillBuffered,
    successfulRequests: totalSuccessful,
    failedRequests: totalFailed,
    rateLimitedRequests: totalRateLimited,
    queuedRequests: stillBuffered,
    avgEndToEndLatencyMs,
    p99EndToEndLatencyMs,
    maxThroughputRps: Math.round(
      effectiveMaxRps === Infinity ? totalRps : effectiveMaxRps,
    ),
    actualThroughputRps: Math.round(
      Math.min(
        totalRps,
        effectiveMaxRps === Infinity ? totalRps : effectiveMaxRps,
      ),
    ),
    totalCostPerHour: Math.round(totalCostPerHour * 10000) / 10000,
    totalCostPerMonth: Math.round(totalCostPerHour * 730 * 100) / 100,
    bottlenecks,
    nodeMetrics,
    latencyBreakdown,
    timeSeries,
  };
}

export function runSimulation(
  nodes: Node<SimulationNodeData>[],
  edges: Edge[],
  params: SimulationParams,
): SimulationResult {
  const ctx = prepareSimulation(nodes, edges, params);
  const timeSeries: TimeSeriesDataPoint[] = [];
  for (let sec = 0; sec < params.simulationDurationSeconds; sec++) {
    timeSeries.push(simulateTick(ctx, sec));
  }
  return finalizeSimulation(ctx, timeSeries, params);
}
