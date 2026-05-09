import { SCENARIOS, pickRandom } from '@/data';
import type { RequestHop } from '@/data';

type SimulateRequestBody = any;

// ---------------- GLOBAL RATE LIMIT ----------------
type RateLimitEntry = {
    tokens: number;
    lastRefill: number;
    windowStart: number;
    requestCount: number;
};

const g = globalThis as typeof globalThis & {
    __rateLimitState?: Map<string, RateLimitEntry>;
};

if (!g.__rateLimitState) g.__rateLimitState = new Map();
const rateLimitState = g.__rateLimitState;

// HELPERS 

function checkRateLimit(node: any, now: number) {
    const algorithm = node.rateLimitAlgorithm ?? 'token_bucket';
    const stateKey = node.id;
    const ttlSeconds = node.redisCounterTtlSeconds ?? 60;

    const bucketSize = node.rateLimitBucketSize ?? 100;
    const refillRate = node.rateLimitRefillRate ?? 10;

    let state = rateLimitState.get(stateKey);
    if (!state || now - state.windowStart > ttlSeconds * 1000) {
        state = { tokens: bucketSize, lastRefill: now, windowStart: now, requestCount: 0 };
        rateLimitState.set(stateKey, state);
    }

    const elapsedSec = (now - state.lastRefill) / 1000;
    state.tokens = Math.min(bucketSize, state.tokens + elapsedSec * refillRate);
    state.lastRefill = now;
    state.requestCount++;

    if (state.tokens >= 1) {
        state.tokens -= 1;
        return { allowed: true };
    } else {
        const waitMs = Math.ceil((1 - state.tokens) / refillRate * 1000);
        return { allowed: false, retryAfterMs: waitMs };
    }
}

function simulateLatency(componentType: string): number {
    const baseLatencies: Record<string, number> = {
        client: 0,
        load_balancer: 1 + Math.random() * 3,
        api_server: 8 + Math.random() * 25,
        cache: 0.2 + Math.random() * 1.5,
        database: 3 + Math.random() * 12,
        message_queue: 2 + Math.random() * 8,
        worker: 50 + Math.random() * 200,
        notification_service: 10 + Math.random() * 50,
        rate_limiter: 0.5 + Math.random() * 2,
    };
    return Math.round((baseLatencies[componentType] ?? 10) * 100) / 100;
}

function traverseGraph(nodes: any[], edges: any[]) {
    const adjacency = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    for (const node of nodes) {
        adjacency.set(node.id, []);
        inDegree.set(node.id, 0);
    }

    for (const edge of edges) {
        adjacency.get(edge.source)?.push(edge.target);
        inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
    }

    const entryNodes = nodes
        .filter((n) => n.componentType === 'client' || ((inDegree.get(n.id) ?? 0) === 0))
        .map((n) => n.id);

    const visited = new Set<string>();
    const order: string[] = [];
    const queue = [...entryNodes];

    while (queue.length > 0) {
        const current = queue.shift()!;
        if (visited.has(current)) continue;
        visited.add(current);
        order.push(current);

        const children = adjacency.get(current) ?? [];
        for (const child of children) {
            if (!visited.has(child)) queue.push(child);
        }
    }

    return order;
}

// ---------------- MAIN ----------------

export const simulationService = {
    async run(body: SimulateRequestBody) {
        const { scenarioId, endpointIndex, payloadIndex, graph } = body;

        const scenario = SCENARIOS.find((s) => s.id === scenarioId);
        if (!scenario) throw new Error('Scenario not found');

        const endpoint = scenario.endpoints[endpointIndex];
        if (!endpoint) throw new Error('Endpoint not found');

        const payload =
            payloadIndex !== undefined
                ? endpoint.samplePayloads[payloadIndex % endpoint.samplePayloads.length]
                : pickRandom(endpoint.samplePayloads);

        const response =
            payloadIndex !== undefined
                ? endpoint.sampleResponses[payloadIndex % endpoint.sampleResponses.length]
                : pickRandom(endpoint.sampleResponses);

        const nodeOrder = traverseGraph(graph.nodes, graph.edges);
        const nodeMap = new Map(graph.nodes.map((n: any) => [n.id, n]));

        if (nodeOrder.length < 2 || graph.edges.length === 0) {
            return {
                error: 'Invalid architecture',
                message: 'Connect components properly',
                hops: [],
                totalLatencyMs: 0,
            };
        }

        const hops: any[] = [];
        let cumulativeLatency = 0;
        let rateLimited = false;
        let retryAfter: number | undefined;

        const now = Date.now();

        for (const nodeId of nodeOrder) {
            const node = nodeMap.get(nodeId) as any;
            if (!node) continue;

            const latency = simulateLatency(node.componentType);
            cumulativeLatency += latency;

            if (node.componentType === 'rate_limiter') {
                const rl = checkRateLimit(node, now);

                if (!rl.allowed) {
                    rateLimited = true;
                    retryAfter = rl.retryAfterMs;
                    break;
                }
            }

            hops.push({
                nodeId: node.id,
                nodeLabel: node.label,
                componentType: node.componentType,
                latencyMs: latency,
                timestamp: now + cumulativeLatency,
            });
        }

        const totalLatencyMs = hops.reduce((sum, h) => sum + h.latencyMs, 0);

        if (rateLimited) {
            return {
                statusCode: 429,
                retryAfter,
                hops,
                totalLatencyMs,
            };
        }

        return {
            statusCode: 200,
            request: { method: endpoint.method, path: endpoint.path, payload },
            response: { body: response },
            hops,
            totalLatencyMs,
        };
    },
};