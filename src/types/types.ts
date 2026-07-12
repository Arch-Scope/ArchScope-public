export type ComponentType =
  | 'client'
  | 'load_balancer'
  | 'api_server'
  | 'cache'
  | 'database'
  | 'message_queue'
  | 'worker'
  | 'notification_service'
  | 'rate_limiter';

export type RateLimitAlgorithm =
  | 'token_bucket'
  | 'fixed_window'
  | 'sliding_window'
  | 'leaky_bucket';

export type TimeComplexity =
  | 'O(1)'
  | 'O(log n)'
  | 'O(n)'
  | 'O(n log n)'
  | 'O(n^2)';

export interface AwsServiceOption {
  id: string;
  name: string;
  provider: 'AWS' | 'GCP' | 'Azure' | 'Generic';
  componentType: ComponentType;
  baseCostPerHour: number; // USD per hour
  baseLatencyMs: number; // base latency in ms
  maxRps: number; // max requests per second per instance
  maxThroughputMBps: number; // max throughput in MB/s per instance
  description: string;
  pricingLastUpdated: string; // ISO date when pricing was last updated
  pricingDisclaimer: string; // Disclaimer about pricing accuracy
}

export interface ComponentConfig {
  serviceId: string; // which AwsServiceOption is selected
  timeComplexity?: TimeComplexity; // how latency scales with payload size; omitted = O(1), no scaling
  customLatencyMs?: number;
  customMaxRps?: number;
  customCostPerHour?: number;
  cacheTtlSeconds?: number; // for cache components
  cacheHitRate?: number; // 0-1 for cache components
  queueMaxMessages?: number; // for message queue
  queueProcessingTimeMs?: number; // for message queue consumer
  // Rate limiter config
  rateLimitAlgorithm?: RateLimitAlgorithm;
  rateLimitBucketSize?: number; // token bucket: max tokens / leaky bucket: bucket capacity
  rateLimitRefillRate?: number; // token bucket: tokens/sec refill rate
  rateLimitWindowSeconds?: number; // fixed/sliding window: window duration in seconds
  rateLimitMaxRequests?: number; // fixed/sliding window: max requests per window
  // Redis counter config
  redisCounterTtlSeconds?: number; // how long before counter expires and resets
}

export interface SimulationNodeData {
  label: string;
  componentType: ComponentType;
  config: ComponentConfig;
  metrics?: NodeMetrics;
  [key: string]: unknown;
}

export interface NodeMetrics {
  avgLatencyMs: number;
  p99LatencyMs: number;
  throughputRps: number;
  utilizationPercent: number;
  costPerHour: number;
  costPerMonth: number;
  isBottleneck: boolean;
  queueDepth?: number;
  cacheHits?: number;
  cacheMisses?: number;
  errorRate?: number;
}

export type LoadProfile = 'constant' | 'sine' | 'repeating_spike';

export interface SimulationParams {
  concurrentUsers: number;
  requestsPerSecPerUser: number;
  payloadSizeMB: number;
  simulationDurationSeconds: number;
  loadProfile: LoadProfile;
  spikeFrequency: number;   // spikes per simulation (1–10)
  spikeIntensity: number;   // peak multiplier (1.5–5x)
}

export interface TimeSeriesDataPoint {
  second: number;
  successful: number;
  failed: number;
  rateLimited: number;
  queued: number;
  drained?: number;
  queueDepth: number;
  avgLatencyMs: number;
  rps: number;
}

export interface SimulationResult {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  rateLimitedRequests: number;
  queuedRequests: number;
  avgEndToEndLatencyMs: number;
  p99EndToEndLatencyMs: number;
  maxThroughputRps: number;
  actualThroughputRps: number;
  totalCostPerHour: number;
  totalCostPerMonth: number;
  bottlenecks: BottleneckInfo[];
  nodeMetrics: Record<string, NodeMetrics>;
  latencyBreakdown: LatencyBreakdownItem[];
  timeSeries: TimeSeriesDataPoint[];
}

export interface BottleneckInfo {
  nodeId: string;
  nodeLabel: string;
  reason: string;
  utilization: number;
  suggestion: string;
}

export interface LatencyBreakdownItem {
  nodeId: string;
  nodeLabel: string;
  componentType: ComponentType;
  avgLatencyMs: number;
  percentOfTotal: number;
}

export interface DesignPreset {
  id: string;
  name: string;
  description: string;
  nodes: Array<{
    id: string;
    type: string;
    position: { x: number; y: number };
    data: SimulationNodeData;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    sourceHandle?: string;
    targetHandle?: string;
    animated?: boolean;
  }>;
  simulationParams: SimulationParams;
}
