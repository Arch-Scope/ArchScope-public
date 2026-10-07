import type { Edge, Node } from '@xyflow/react'
import type {
  SimulationNodeData,
  SimulationParams,
  TimeSeriesDataPoint,
} from '@/types'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  finalizeSimulation,
  prepareSimulation,
  runSimulation,
  simulateTick,
} from '../simulation-engine'

const params = (overrides: Partial<SimulationParams> = {}): SimulationParams => ({
  concurrentUsers: 10,
  requestsPerSecPerUser: 1,
  payloadSizeMB: 0.001,
  simulationDurationSeconds: 3,
  loadProfile: 'constant',
  spikeFrequency: 3,
  spikeIntensity: 3,
  ...overrides,
})

function node(
  id: string,
  componentType: SimulationNodeData['componentType'],
  serviceId: string,
  config: Partial<SimulationNodeData['config']> = {},
): Node<SimulationNodeData> {
  return {
    id,
    type: 'simulationNode',
    position: { x: 0, y: 0 },
    data: {
      label: id.toUpperCase(),
      componentType,
      config: { serviceId, ...config },
    },
  }
}

const edge = (source: string, target: string): Edge => ({
  id: `${source}-${target}`,
  source,
  target,
})

const simpleGraph = (apiConfig: Partial<SimulationNodeData['config']> = {}) => ({
  nodes: [
    node('client', 'client', 'client'),
    node('api', 'api_server', 'ec2_t3_medium', apiConfig),
    node('db', 'database', 'rds_postgres'),
  ],
  edges: [edge('client', 'api'), edge('api', 'db')],
})

afterEach(() => vi.restoreAllMocks())

describe('prepareSimulation request flow and graph handling', () => {
  it('propagates request rate through a path and sums path latency', () => {
    const { nodes, edges } = simpleGraph({ customMaxRps: 10000 })
    const ctx = prepareSimulation(nodes, edges, params({ concurrentUsers: 2 }))

    expect(ctx.totalRps).toBe(2)
    expect(ctx.nodeMetrics.api.throughputRps).toBe(2)
    expect(ctx.nodeMetrics.db.throughputRps).toBe(2)
    expect(ctx.maxPathLatency).toBeGreaterThan(0)
    expect(ctx.latencyBreakdown.map(({ nodeId }) => nodeId)).toContain('api')
    expect(ctx.latencyBreakdown.map(({ nodeId }) => nodeId)).toContain('db')
    expect(ctx.latencyBreakdown.reduce((sum, item) => sum + item.percentOfTotal, 0)).toBeCloseTo(100)
  })

  it('falls back to parentless connected nodes when no client exists', () => {
    const nodes = [node('api', 'api_server', 'ec2_t3_medium'), node('db', 'database', 'rds_postgres')]
    const ctx = prepareSimulation(nodes, [edge('api', 'db')], params())

    expect(ctx.nodeMetrics.api.throughputRps).toBe(10)
    expect(ctx.nodeMetrics.db.throughputRps).toBe(10)
  })

  it('does not assign traffic to disconnected non-client nodes', () => {
    const { nodes, edges } = simpleGraph()
    nodes.push(node('floating', 'database', 'rds_postgres'))
    const ctx = prepareSimulation(nodes, edges, params())

    expect(ctx.nodeMetrics.floating.throughputRps).toBe(0)
    expect(ctx.nodeMetrics.floating.avgLatencyMs).toBe(0)
  })

  it('divides load balancer traffic among children and combines parallel branches', () => {
    const nodes = [
      node('client', 'client', 'client'),
      node('lb', 'load_balancer', 'alb'),
      node('api-a', 'api_server', 'ec2_t3_medium'),
      node('api-b', 'api_server', 'ec2_t3_medium'),
    ]
    const ctx = prepareSimulation(nodes, [edge('client', 'lb'), edge('lb', 'api-a'), edge('lb', 'api-b')], params())

    expect(ctx.nodeMetrics['api-a'].throughputRps).toBe(5)
    expect(ctx.nodeMetrics['api-b'].throughputRps).toBe(5)
  })

  it('uses the maximum upstream contribution at a shared non-load-balancer node', () => {
    const nodes = [
      node('client', 'client', 'client'),
      node('api-a', 'api_server', 'ec2_t3_medium'),
      node('api-b', 'api_server', 'ec2_t3_medium'),
      node('db', 'database', 'rds_postgres'),
    ]
    const ctx = prepareSimulation(nodes, [edge('client', 'api-a'), edge('client', 'api-b'), edge('api-a', 'db'), edge('api-b', 'db')], params())

    expect(ctx.nodeMetrics.db.throughputRps).toBe(10)
  })

  it('ignores unknown edge endpoints and duplicate edges', () => {
    const { nodes } = simpleGraph()
    const ctx = prepareSimulation(nodes, [edge('client', 'api'), edge('client', 'api'), edge('missing', 'api')], params())

    expect(ctx.nodeMetrics.api.throughputRps).toBe(10)
    expect(ctx.maxPathLatency).toBeGreaterThan(0)
  })

  it('ignores components whose service id is unknown', () => {
    const nodes = [node('client', 'client', 'not-a-service'), node('api', 'api_server', 'missing')]
    const ctx = prepareSimulation(nodes, [edge('client', 'api')], params())

    expect(ctx.nodeMetrics).toEqual({})
    expect(ctx.totalCostPerHour).toBe(0)
    expect(ctx.maxPathLatency).toBe(0)
    expect(ctx.effectiveMaxRps).toBe(Infinity)
  })
})

describe('latency modeling', () => {
  it('applies custom latency, complexity scaling, and queueing under load', () => {
    const { nodes, edges } = simpleGraph({ customLatencyMs: 10, customMaxRps: 20, timeComplexity: 'O(n)' })
    const baseline = prepareSimulation(nodes, edges, params({ concurrentUsers: 1, payloadSizeMB: 0.001 }))
    const scaled = prepareSimulation(nodes, edges, params({ concurrentUsers: 1, payloadSizeMB: 0.002 }))
    const loaded = prepareSimulation(nodes, edges, params({ concurrentUsers: 19, payloadSizeMB: 0.001 }))

    expect(baseline.nodeMetrics.api.avgLatencyMs).toBe(10.53)
    expect(scaled.nodeMetrics.api.avgLatencyMs).toBe(21.05)
    expect(loaded.nodeMetrics.api.avgLatencyMs).toBe(100)
    expect(baseline.nodeMetrics.api.p99LatencyMs).toBe(26.32)
  })

  it('supports all complexity classes, caps growth, and treats missing complexity as constant', () => {
    const latencies = (complexity?: SimulationNodeData['config']['timeComplexity'], payloadSizeMB = 0.002) => {
      const { nodes, edges } = simpleGraph({ customLatencyMs: 10, customMaxRps: 10000, timeComplexity: complexity })
      return prepareSimulation(nodes, edges, params({ concurrentUsers: 1, payloadSizeMB })).nodeMetrics.api.avgLatencyMs
    }

    expect(latencies('O(1)')).toBe(10)
    expect(latencies('O(log n)')).toBeCloseTo(15.85)
    expect(latencies('O(n)')).toBe(20)
    expect(latencies('O(n log n)')).toBeCloseTo(31.7)
    expect(latencies('O(n^2)')).toBe(40)
    expect(latencies(undefined)).toBe(10)
    expect(latencies('O(n^2)', 1)).toBe(500.05)
  })

  it('uses a safe fallback latency for unknown services and zero for idle nodes', () => {
    const unknown = node('unknown', 'api_server', 'missing')
    const ctx = prepareSimulation([unknown], [], params())
    expect(ctx.maxPathLatency).toBe(0)

    // Unknown services are excluded from metrics by prepareSimulation; a disconnected
    // known service keeps its latency at zero because it receives no traffic.
    const idle = prepareSimulation([node('idle', 'api_server', 'ec2_t3_medium')], [], params())
    expect(idle.nodeMetrics.idle.avgLatencyMs).toBe(0)
  })

  it('uses cache lookup latency without applying queue load and records hit/miss counts', () => {
    const nodes = [node('client', 'client', 'client'), node('cache', 'cache', 'elasticache_redis', { cacheHitRate: 0.75, customLatencyMs: 4 })]
    const ctx = prepareSimulation(nodes, [edge('client', 'cache')], params({ concurrentUsers: 20 }))

    expect(ctx.nodeMetrics.cache.avgLatencyMs).toBe(4)
    expect(ctx.nodeMetrics.cache.cacheHits).toBe(15)
    expect(ctx.nodeMetrics.cache.cacheMisses).toBe(5)
  })

  it('keeps latency breakdown to the slowest contribution across paths', () => {
    const nodes = [
      node('client', 'client', 'client'), node('api-a', 'api_server', 'ec2_t3_medium', { customLatencyMs: 3 }),
      node('api-b', 'api_server', 'ec2_t3_medium', { customLatencyMs: 9 }), node('db', 'database', 'rds_postgres', { customLatencyMs: 5 }),
    ]
    const ctx = prepareSimulation(nodes, [edge('client', 'api-a'), edge('client', 'api-b'), edge('api-a', 'db'), edge('api-b', 'db')], params())

    expect(ctx.nodeMetrics.db.avgLatencyMs).toBeGreaterThan(5)
    expect(ctx.maxPathLatency).toBeGreaterThan(0)
  })
})

describe('cost, throughput, and bottlenecks', () => {
  it('sums provisioned service cost and honors custom cost and capacity', () => {
    const nodes = [
      node('client', 'client', 'client'),
      node('api', 'api_server', 'ec2_t3_medium', { customCostPerHour: 2, customMaxRps: 5 }),
    ]
    const ctx = prepareSimulation(nodes, [edge('client', 'api')], params())

    expect(ctx.totalCostPerHour).toBe(2)
    expect(ctx.nodeMetrics.api.costPerHour).toBe(2)
    expect(ctx.nodeMetrics.api.costPerMonth).toBe(1460)
    expect(ctx.nodeMetrics.api.throughputRps).toBe(5)
  })

  it('models Lambda and SQS as usage-based and zero-cost when idle', () => {
    const lambda = prepareSimulation([node('lambda', 'worker', 'lambda')], [], params({ concurrentUsers: 0 }))
    const sqs = prepareSimulation([node('sqs', 'message_queue', 'sqs')], [], params({ concurrentUsers: 0 }))
    const activeLambda = prepareSimulation([node('client', 'client', 'client'), node('lambda', 'worker', 'lambda')], [edge('client', 'lambda')], params({ concurrentUsers: 1 }))
    const activeSqs = prepareSimulation([node('client', 'client', 'client'), node('sqs', 'message_queue', 'sqs')], [edge('client', 'sqs')], params({ concurrentUsers: 1 }))

    expect(lambda.totalCostPerHour).toBe(0)
    expect(sqs.totalCostPerHour).toBe(0)
    expect(activeLambda.totalCostPerHour).toBeGreaterThan(0)
    expect(activeSqs.totalCostPerHour).toBeGreaterThan(0)
  })

  it('detects and sorts bottlenecks with critical and component-specific suggestions', () => {
    const nodes = [
      node('client', 'client', 'client'),
      node('api', 'api_server', 'ec2_t3_medium', { customMaxRps: 9 }),
      node('db', 'database', 'rds_postgres', { customMaxRps: 10 }),
    ]
    const ctx = prepareSimulation(nodes, [edge('client', 'api'), edge('api', 'db')], params({ concurrentUsers: 9 }))

    expect(ctx.bottlenecks[0].utilization).toBeGreaterThanOrEqual(ctx.bottlenecks[1].utilization)
    expect(ctx.bottlenecks[0].suggestion).toContain('CRITICAL')
    expect(ctx.bottlenecks.find(({ nodeId }) => nodeId === 'db')?.suggestion).toContain('read replicas')
    expect(ctx.overloadErrorFrac).toBeGreaterThan(0)
  })

  it('adds cache and queue metrics and applies component bottleneck guidance', () => {
    const cacheNodes = [node('client', 'client', 'client'), node('cache', 'cache', 'elasticache_redis', { customMaxRps: 10 })]
    const cacheCtx = prepareSimulation(cacheNodes, [edge('client', 'cache')], params({ concurrentUsers: 9 }))
    expect(cacheCtx.nodeMetrics.cache.cacheHits).toBe(7)
    expect(cacheCtx.nodeMetrics.cache.cacheMisses).toBe(2)
    expect(cacheCtx.bottlenecks[0].suggestion).toContain('cache hit rate')

    const queueNodes = [node('client', 'client', 'client'), node('queue', 'message_queue', 'sqs', { customMaxRps: 10, queueProcessingTimeMs: 200 })]
    const queueCtx = prepareSimulation(queueNodes, [edge('client', 'queue')], params({ concurrentUsers: 9 }))
    expect(queueCtx.nodeMetrics.queue.queueDepth).toBe(2)
    expect(queueCtx.bottlenecks[0].suggestion).toContain('consumers/workers')
  })

  it('treats an infinite-capacity path as total-RPS capacity', () => {
    const ctx = prepareSimulation([node('client', 'client', 'client'), node('sink', 'notification_service', 'noop')], [edge('client', 'sink')], params())
    expect(ctx.effectiveMaxRps).toBe(Infinity)
  })
})

describe('simulateTick rate limiting and queueing', () => {
  it('records successful requests and deterministic latency for a normal tick', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const { nodes, edges } = simpleGraph()
    const ctx = prepareSimulation(nodes, edges, params({ concurrentUsers: 2 }))
    const point = simulateTick(ctx, 0)

    expect(point).toMatchObject({ second: 0, successful: 2, failed: 0, rateLimited: 0, queued: 0, rps: 2 })
    expect(point.avgLatencyMs).toBe(ctx.maxPathLatency)
  })

  it('applies sine and repeating-spike load profiles', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const { nodes, edges } = simpleGraph()
    const sine = prepareSimulation(nodes, edges, params({ concurrentUsers: 10, loadProfile: 'sine', simulationDurationSeconds: 4 }))
    const spike = prepareSimulation(nodes, edges, params({ concurrentUsers: 10, loadProfile: 'repeating_spike', simulationDurationSeconds: 4, spikeFrequency: 1, spikeIntensity: 2 }))

    expect(simulateTick(sine, 0).rps).toBeGreaterThan(0)
    expect(simulateTick(spike, 2).rps).toBeGreaterThanOrEqual(10)
  })

  it('enforces token bucket limits independently per user', () => {
    const nodes = [node('client', 'client', 'client'), node('rl', 'rate_limiter', 'rate_limiter', { rateLimitAlgorithm: 'token_bucket', rateLimitBucketSize: 1, rateLimitRefillRate: 0 })]
    const ctx = prepareSimulation(nodes, [edge('client', 'rl')], params({ concurrentUsers: 2, requestsPerSecPerUser: 2 }))
    const point = simulateTick(ctx, 0)

    expect(point.successful).toBe(2)
    expect(point.rateLimited).toBe(2)
  })

  it('resets token buckets after TTL and supports leaky bucket settings', () => {
    const nodes = [node('client', 'client', 'client'), node('rl', 'rate_limiter', 'rate_limiter', { rateLimitAlgorithm: 'leaky_bucket', rateLimitBucketSize: 1, rateLimitRefillRate: 0, redisCounterTtlSeconds: 1 })]
    const ctx = prepareSimulation(nodes, [edge('client', 'rl')], params({ concurrentUsers: 1, requestsPerSecPerUser: 2 }))
    expect(simulateTick(ctx, 0).rateLimited).toBe(1)
    expect(simulateTick(ctx, 3).successful).toBe(1)
  })

  it('supports fixed and sliding windows and resets their counters', () => {
    const makeCtx = (algorithm: 'fixed_window' | 'sliding_window') => {
      const nodes = [node('client', 'client', 'client'), node('rl', 'rate_limiter', 'rate_limiter', { rateLimitAlgorithm: algorithm, rateLimitMaxRequests: 1, rateLimitWindowSeconds: 1, rateLimitBucketSize: 0 })]
      return prepareSimulation(nodes, [edge('client', 'rl')], params({ concurrentUsers: 1, requestsPerSecPerUser: 2 }))
    }
    const fixed = makeCtx('fixed_window')
    const sliding = makeCtx('sliding_window')

    const fixedFirst = simulateTick(fixed, 0)
    const fixedAfterReset = simulateTick(fixed, 3)
    const slidingFirst = simulateTick(sliding, 0)
    const slidingAfterReset = simulateTick(sliding, 3)
    expect(fixedFirst.rateLimited).toBe(1)
    expect(fixedAfterReset.successful).toBe(1)
    expect(fixedAfterReset.rateLimited).toBe(1)
    expect(slidingFirst.rateLimited).toBe(1)
    expect(slidingAfterReset.successful).toBe(1)
    expect(slidingAfterReset.rateLimited).toBe(1)
  })

  it('queues limited requests, drains within worker capacity, and respects queue capacity', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const nodes = [
      node('client', 'client', 'client'),
      node('rl', 'rate_limiter', 'rate_limiter', { rateLimitBucketSize: 0, rateLimitRefillRate: 0 }),
      node('queue', 'message_queue', 'sqs', { queueMaxMessages: 2, queueProcessingTimeMs: 1000 }),
      node('worker', 'worker', 'lambda_worker', { customMaxRps: 1 }),
    ]
    const ctx = prepareSimulation(nodes, [edge('client', 'rl'), edge('rl', 'queue'), edge('queue', 'worker')], params({ concurrentUsers: 3 }))
    const point = simulateTick(ctx, 0)

    expect(point.queued).toBe(2)
    expect(point.rateLimited).toBe(1)
    expect(point.drained).toBe(1)
    expect(point.queueDepth).toBe(1)
  })

  it('counts overload failures and returns zero latency when nothing succeeds', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0)
    const { nodes, edges } = simpleGraph({ customMaxRps: 1 })
    const ctx = prepareSimulation(nodes, edges, params({ concurrentUsers: 2 }))
    const point = simulateTick(ctx, 0)

    expect(point.failed).toBe(2)
    expect(point.avgLatencyMs).toBe(0)
  })

  it('handles a zero-request tick without dividing by zero', () => {
    const { nodes, edges } = simpleGraph()
    const ctx = prepareSimulation(nodes, edges, params({ concurrentUsers: 0 }))
    expect(simulateTick(ctx, 0)).toMatchObject({ rps: 0, successful: 0, avgLatencyMs: 0 })
  })
})

describe('finalizeSimulation and runSimulation', () => {
  it('aggregates requests, latency percentiles, cost, bottlenecks, and time series', () => {
    const { nodes, edges } = simpleGraph()
    const ctx = prepareSimulation(nodes, edges, params())
    const series: TimeSeriesDataPoint[] = [
      { second: 0, successful: 2, failed: 1, rateLimited: 1, queued: 3, drained: 1, queueDepth: 2, avgLatencyMs: 10, rps: 4 },
      { second: 1, successful: 1, failed: 0, rateLimited: 0, queued: 0, drained: 0, queueDepth: 2, avgLatencyMs: 20, rps: 1 },
    ]
    const result = finalizeSimulation(ctx, series, params())

    expect(result.totalRequests).toBe(7)
    expect(result.successfulRequests).toBe(3)
    expect(result.failedRequests).toBe(1)
    expect(result.rateLimitedRequests).toBe(1)
    expect(result.queuedRequests).toBe(2)
    expect(result.avgEndToEndLatencyMs).toBe(15)
    expect(result.p99EndToEndLatencyMs).toBe(20)
    expect(result.totalCostPerMonth).toBeCloseTo(result.totalCostPerHour * 730)
    expect(result.timeSeries).toBe(series)
  })

  it('uses modeled latency fallbacks when no time-series point succeeded', () => {
    const { nodes, edges } = simpleGraph()
    const ctx = prepareSimulation(nodes, edges, params())
    const result = finalizeSimulation(ctx, [], params())

    expect(result.totalRequests).toBe(0)
    expect(result.avgEndToEndLatencyMs).toBe(Math.round(ctx.maxPathLatency * 100) / 100)
    expect(result.p99EndToEndLatencyMs).toBe(Math.round(ctx.maxPathLatency * 2.5 * 100) / 100)
  })

  it('runs all simulation seconds and produces the expected constant-load request count', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const { nodes, edges } = simpleGraph()
    const result = runSimulation(nodes, edges, params({ concurrentUsers: 2, simulationDurationSeconds: 4 }))

    expect(result.timeSeries).toHaveLength(4)
    expect(result.totalRequests).toBe(8)
    expect(result.successfulRequests).toBe(8)
    expect(result.actualThroughputRps).toBe(2)
  })
})
