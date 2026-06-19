export interface SimulationConfig {
  duration: number;           // Simulation duration in seconds
  load_per_user: number;      // Requests per second per user
  clients: number;           // Number of concurrent clients
  payload_size: number;      // Payload size in MB
  load_profile: 'constant' | 'sine' | 'repeating_spike';
  spike_frequency?: number;    // spikes per simulation (1-10) - only for repeating_spike
  spike_intensity?: number;    // peak multiplier (1.5-5x) - only for repeating_spike
}

export interface NodeMetrics {
  nodeId: string;
  nodeLabel: string;
  requestsProcessed: number;
  averageLatency: number;
  p95Latency: number;
  p99Latency: number;
  throughput: number;
  errorRate: number;
  utilization: number;       // 0-1, how much of capacity was used
  queueLength: number;       // Average queue length during simulation
}

export interface Bottleneck {
  nodeId: string;
  nodeLabel: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metric: 'latency' | 'throughput' | 'errors' | 'utilization';
  value: number;
  threshold: number;
  description: string;
}

export interface SimulationResults {
  id: string;
  timestamp: Date;
  config: SimulationConfig;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatency: number;
  p95Latency: number;
  p99Latency: number;
  throughput: number;
  errorRate: number;
  nodeMetrics: Record<string, NodeMetrics>;
  bottlenecks: Bottleneck[];
  duration: number;          // Actual simulation duration in seconds
}

export interface SimulationState {
  config: SimulationConfig;
  isRunning: boolean;
  currentResults?: SimulationResults;
  resultsHistory: SimulationResults[];
  lastError?: string;
}

export const DEFAULT_SIMULATION_CONFIG: SimulationConfig = {
  duration: 300,        // 5 minutes
  load_per_user: 10,    // 10 RPS per user
  clients: 100,        // 100 concurrent clients
  payload_size: 0.001,  // 1KB default payload
  load_profile: 'constant',
  spike_frequency: 3,
  spike_intensity: 2
};

export const VALID_SIMULATION_PROPERTIES = [
  'duration',
  'load_per_user', 
  'clients',
  'payload_size',
  'load_profile',
  'spike_frequency',
  'spike_intensity'
] as const;

export const VALID_LOAD_PROFILES = [
  'constant',
  'sine', 
  'repeating_spike'
] as const;

export type SimulationProperty = typeof VALID_SIMULATION_PROPERTIES[number];
export type LoadProfile = typeof VALID_LOAD_PROFILES[number];
