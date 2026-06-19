import { Node } from '@xyflow/react';
import { SimulationNodeData, SimulationParams } from '@/types';
import { runSimulation } from '@/lib/core/simulation-engine';
import { 
  SimulationConfig, 
  SimulationState, 
  SimulationResults, 
  NodeMetrics, 
  Bottleneck,
  DEFAULT_SIMULATION_CONFIG,
  VALID_SIMULATION_PROPERTIES,
  VALID_LOAD_PROFILES,
  SimulationProperty,
  LoadProfile
} from './simulation-types';
import { ParsedCommand } from './parser';

// Global simulation state (in a real app, this would be in a store)
let simulationState: SimulationState = {
  config: { ...DEFAULT_SIMULATION_CONFIG },
  isRunning: false,
  resultsHistory: []
};

// Async simulation state
let simulationProgress: { elapsed: number; total: number } | null = null;
let simulationStartTime: number | null = null;
let simulationTimer: NodeJS.Timeout | null = null;

export interface CommandResult {
  success: boolean;
  message: string;
  data?: any;
}

/**
 * Convert AQL SimulationConfig to UI SimulationParams
 */
function aqlConfigToUIParams(config: SimulationConfig): Partial<SimulationParams> {
  return {
    simulationDurationSeconds: config.duration,
    concurrentUsers: config.clients,
    requestsPerSecPerUser: Math.round(config.load_per_user * 10) / 10, // Round to 1 decimal place
    payloadSizeMB: config.payload_size,
    loadProfile: config.load_profile,
    spikeFrequency: config.spike_frequency ?? 3,
    spikeIntensity: config.spike_intensity ?? 2
  };
}

/**
 * Convert UI SimulationParams to AQL SimulationConfig
 */
function uiParamsToAQLConfig(params: SimulationParams): SimulationConfig {
  return {
    duration: params.simulationDurationSeconds,
    load_per_user: params.requestsPerSecPerUser,
    clients: params.concurrentUsers,
    payload_size: params.payloadSizeMB,
    load_profile: params.loadProfile,
    spike_frequency: params.spikeFrequency,
    spike_intensity: params.spikeIntensity
  };
}

/**
 * Validate a simulation property value
 */
function validateSimulationProperty(property: string, value: any): { valid: boolean; error?: string } {
  if (!VALID_SIMULATION_PROPERTIES.includes(property as SimulationProperty)) {
    return { valid: false, error: `Unknown simulation property: ${property}` };
  }

  switch (property) {
    case 'duration':
      const time = Number(value);
      if (isNaN(time) || time <= 0) {
        return { valid: false, error: `${property} must be a positive number` };
      }
      break;
    
    case 'load_per_user':
    case 'clients':
      const count = Number(value);
      if (isNaN(count) || count <= 0) {
        return { valid: false, error: `${property} must be a positive number` };
      }
      break;
    
    case 'payload_size':
      const payload = Number(value);
      if (isNaN(payload) || payload <= 0) {
        return { valid: false, error: `payload_size must be a positive number` };
      }
      break;
    
    case 'load_profile':
      if (!VALID_LOAD_PROFILES.includes(value as LoadProfile)) {
        return { valid: false, error: `load_profile must be one of: ${VALID_LOAD_PROFILES.join(', ')}` };
      }
      break;
    
    case 'spike_frequency':
      const freq = Number(value);
      if (isNaN(freq) || freq < 1 || freq > 10) {
        return { valid: false, error: `spike_frequency must be between 1 and 10` };
      }
      break;
    
    case 'spike_intensity':
      const intensity = Number(value);
      if (isNaN(intensity) || intensity < 1.5 || intensity > 5) {
        return { valid: false, error: `spike_intensity must be between 1.5 and 5` };
      }
      break;
  }

  return { valid: true };
}

/**
 * Validate spike parameters and auto-switch load profile if needed
 */
function validateSpikeParameters(
  property: string, 
  value: any, 
  currentConfig: SimulationConfig
): { valid: boolean; error?: string; autoSwitchProfile?: boolean } {
  // If setting spike parameters and current load profile is not repeating_spike
  if ((property === 'spike_frequency' || property === 'spike_intensity') && 
      currentConfig.load_profile !== 'repeating_spike') {
    return { 
      valid: true, 
      autoSwitchProfile: true,
      error: `Automatically switched load_profile to repeating_spike to use spike parameters`
    };
  }
  
  return { valid: true };
}

/**
 * Execute a sim_set command to update a single simulation property
 */
export function executeSimSetCommand(
  parsed: ParsedCommand, 
  onUpdateUIParams?: (params: Partial<SimulationParams>) => void
): CommandResult {
  if (!parsed.simProperty || parsed.simValue === undefined) {
    return { success: false, message: 'Invalid sim_set command' };
  }

  const validation = validateSimulationProperty(parsed.simProperty, parsed.simValue);
  if (!validation.valid) {
    return { success: false, message: validation.error || 'Invalid simulation property' };
  }

  // Check if we need to auto-switch to repeating_spike for spike parameters
  const spikeValidation = validateSpikeParameters(parsed.simProperty, parsed.simValue, simulationState.config);
  let message = `Set ${parsed.simProperty} = ${parsed.simValue}`;
  
  if (spikeValidation.autoSwitchProfile) {
    // Auto-switch to repeating_spike
    simulationState.config.load_profile = 'repeating_spike';
    message += `\n${spikeValidation.error}`;
  }

  // Update the simulation config
  (simulationState.config as any)[parsed.simProperty] = parsed.simValue;

  // Update UI parameters if callback provided
  if (onUpdateUIParams) {
    const uiParams = aqlConfigToUIParams(simulationState.config);
    onUpdateUIParams(uiParams);
  }

  return { 
    success: true, 
    message 
  };
}

/**
 * Execute a sim_config command to update multiple simulation properties
 */
export function executeSimConfigCommand(
  parsed: ParsedCommand,
  onUpdateUIParams?: (params: Partial<SimulationParams>) => void
): CommandResult {
  if (!parsed.simProperties) {
    return { success: false, message: 'Invalid sim_config command' };
  }

  const configUpdates: Partial<SimulationConfig> = {};
  const invalidProperties: string[] = [];

  for (const [property, value] of Object.entries(parsed.simProperties)) {
    const validation = validateSimulationProperty(property, value);
    
    if (!validation.valid) {
      invalidProperties.push(property);
      continue;
    }

    (configUpdates as any)[property] = value;
  }

  if (Object.keys(configUpdates).length === 0) {
    return { 
      success: false, 
      message: `No valid properties found. Invalid: ${invalidProperties.join(', ')}` 
    };
  }

  // Apply valid updates
  Object.assign(simulationState.config, configUpdates);

  // Update UI parameters if callback provided
  if (onUpdateUIParams) {
    const uiParams = aqlConfigToUIParams(simulationState.config);
    onUpdateUIParams(uiParams);
  }

  const message = `Updated ${Object.keys(configUpdates).length} simulation properties`;
  if (invalidProperties.length > 0) {
    return { 
      success: true, 
      message: `${message} (ignored invalid: ${invalidProperties.join(', ')})` 
    };
  }

  return { success: true, message };
}

/**
 * Execute a sim_reset command to reset simulation config to defaults
 */
export function executeSimResetCommand(
  onUpdateUIParams?: (params: Partial<SimulationParams>) => void,
  onResetSimulation?: () => void
): CommandResult {
  // Trigger the UI's reset functionality
  if (onResetSimulation) {
    onResetSimulation();
    simulationState.config = { ...DEFAULT_SIMULATION_CONFIG };
    simulationState.lastError = undefined;
    
    return { 
      success: true, 
      message: 'Reset simulation via UI' 
    };
  }

  return {
    success: false,
    message: 'UI reset not available'
  };
}

/**
 * Execute a sim_run command to start a simulation
 */
export function executeSimRunCommand(
  parsed: ParsedCommand,
  nodes: Node<SimulationNodeData>[],
  onRunSimulation?: () => void
): CommandResult {
  if (simulationState.isRunning) {
    return { success: false, message: 'Simulation is already running' };
  }

  if (nodes.length === 0) {
    return { success: false, message: 'No architecture nodes defined' };
  }

  // Apply any overrides for this run
  let runConfig = { ...simulationState.config };
  if (parsed.simOverrides) {
    for (const [property, value] of Object.entries(parsed.simOverrides)) {
      const validation = validateSimulationProperty(property, value);
      if (validation.valid) {
        (runConfig as any)[property] = value;
      }
    }
  }

  // Update the simulation state with any overrides
  simulationState.config = runConfig;

  // Trigger the UI's simulation system
  if (onRunSimulation) {
    onRunSimulation();
    simulationState.isRunning = true;
    return {
      success: true,
      message: `Simulation started via UI. Duration: ${runConfig.duration}s. Check the UI for progress.`
    };
  }

  return {
    success: false,
    message: 'UI simulation not available'
  };
}

/**
 * Execute a sim_stop command to stop a running simulation
 */
export function executeSimStopCommand(
  onStopSimulation?: () => void
): CommandResult {
  if (!simulationState.isRunning) {
    return { success: false, message: 'No simulation is currently running' };
  }

  // Trigger the UI's stop simulation
  if (onStopSimulation) {
    onStopSimulation();
    simulationState.isRunning = false;
    simulationProgress = null;
    simulationStartTime = null;
    simulationState.lastError = 'Simulation was stopped by user';
    
    return { 
      success: true, 
      message: 'Simulation stopped via UI' 
    };
  }

  return {
    success: false,
    message: 'UI simulation not available'
  };
}

/**
 * Execute a show_sim command to display simulation configuration or status
 */
export function executeShowSimCommand(parsed: ParsedCommand): CommandResult {
  const queryType = parsed.queryType || 'config';

  if (queryType === 'status') {
    const status = simulationState.isRunning ? 'Running' : 'Stopped';
    
    if (simulationState.isRunning && simulationProgress) {
      const progressPercent = Math.round((simulationProgress.elapsed / simulationProgress.total) * 100);
      const elapsed = simulationProgress.elapsed;
      const total = simulationProgress.total;
      const message = `Simulation Status: Running\nProgress: ${elapsed}s / ${total}s (${progressPercent}%)\nStarted: ${simulationStartTime ? new Date(simulationStartTime).toLocaleTimeString() : 'Unknown'}`;
      
      return {
        success: true,
        message,
        data: { status, isRunning: simulationState.isRunning, progress: simulationProgress }
      };
    }
    
    const lastRun = simulationState.currentResults 
      ? `Last run: ${simulationState.currentResults.timestamp.toLocaleString()}`
      : 'No runs yet';
    
    return {
      success: true,
      message: `Simulation Status: ${status}\n${lastRun}`,
      data: { status, isRunning: simulationState.isRunning }
    };
  }

  // Show configuration
  const configLines = [
    'Simulation Configuration:',
    `  Duration: ${simulationState.config.duration}s`,
    `  Load per user: ${simulationState.config.load_per_user} RPS`,
    `  Clients: ${simulationState.config.clients}`,
    `  Payload Size: ${simulationState.config.payload_size} MB`,
    `  Load Profile: ${simulationState.config.load_profile}`,
    ...(simulationState.config.load_profile === 'repeating_spike' ? [
      `  Spike Frequency: ${simulationState.config.spike_frequency}`,
      `  Spike Intensity: ${simulationState.config.spike_intensity}x`
    ] : [])
  ];

  return {
    success: true,
    message: configLines.join('\n'),
    data: simulationState.config
  };
}

/**
 * Execute a show_metrics command to display simulation results
 */
export function executeShowMetricsCommand(parsed: ParsedCommand): CommandResult {
  if (!simulationState.currentResults) {
    return { success: false, message: 'No simulation results available. Run a simulation first.' };
  }

  const queryType = parsed.queryType || 'all';
  const results = simulationState.currentResults;

  switch (queryType) {
    case 'latency':
      const latencyLines = [
        'Latency Metrics:',
        `  Average: ${results.averageLatency.toFixed(2)}ms`,
        `  95th percentile: ${results.p95Latency.toFixed(2)}ms`,
        `  99th percentile: ${results.p99Latency.toFixed(2)}ms`
      ];
      return {
        success: true,
        message: latencyLines.join('\n'),
        data: { averageLatency: results.averageLatency, p95Latency: results.p95Latency, p99Latency: results.p99Latency }
      };

    case 'throughput':
      const throughputLines = [
        'Throughput Metrics:',
        `  Total requests: ${results.totalRequests}`,
        `  Successful: ${results.successfulRequests}`,
        `  Failed: ${results.failedRequests}`,
        `  Average throughput: ${results.throughput.toFixed(2)} RPS`
      ];
      return {
        success: true,
        message: throughputLines.join('\n'),
        data: { totalRequests: results.totalRequests, successfulRequests: results.successfulRequests, failedRequests: results.failedRequests, throughput: results.throughput }
      };

    case 'errors':
      const errorLines = [
        'Error Metrics:',
        `  Error rate: ${(results.errorRate * 100).toFixed(2)}%`,
        `  Failed requests: ${results.failedRequests}`,
        `  Success rate: ${((1 - results.errorRate) * 100).toFixed(2)}%`
      ];
      return {
        success: true,
        message: errorLines.join('\n'),
        data: { errorRate: results.errorRate, failedRequests: results.failedRequests }
      };

    default:
      // Show all metrics
      const allLines = [
        'Simulation Results Summary:',
        `  Duration: ${results.duration}s`,
        `  Total requests: ${results.totalRequests}`,
        `  Successful: ${results.successfulRequests}`,
        `  Failed: ${results.failedRequests}`,
        `  Error rate: ${(results.errorRate * 100).toFixed(2)}%`,
        `  Average latency: ${results.averageLatency.toFixed(2)}ms`,
        `  95th percentile: ${results.p95Latency.toFixed(2)}ms`,
        `  99th percentile: ${results.p99Latency.toFixed(2)}ms`,
        `  Throughput: ${results.throughput.toFixed(2)} RPS`
      ];
      return {
        success: true,
        message: allLines.join('\n'),
        data: results
      };
  }
}

/**
 * Execute a show_bottlenecks command to display performance bottlenecks
 */
export function executeShowBottlenecksCommand(): CommandResult {
  if (!simulationState.currentResults) {
    return { success: false, message: 'No simulation results available. Run a simulation first.' };
  }

  const bottlenecks = simulationState.currentResults.bottlenecks;
  
  if (bottlenecks.length === 0) {
    return { success: true, message: 'No bottlenecks detected in the simulation.' };
  }

  const bottleneckLines = ['Performance Bottlenecks:'];
  bottlenecks.forEach((bottleneck, index) => {
    bottleneckLines.push(
      `  ${index + 1}. ${bottleneck.nodeLabel} (${bottleneck.severity.toUpperCase()})`,
      `     ${bottleneck.description}`,
      `     ${bottleneck.metric}: ${bottleneck.value} (threshold: ${bottleneck.threshold})`
    );
  });

  return {
    success: true,
    message: bottleneckLines.join('\n'),
    data: bottlenecks
  };
}

/**
 * Get current simulation state
 */
export function getSimulationState(): SimulationState {
  return simulationState;
}

/**
 * Generate mock simulation results (placeholder implementation)
 */
function generateMockSimulationResults(config: SimulationConfig, nodes: Node<SimulationNodeData>[]): SimulationResults {
  const totalLoad = config.load_per_user * config.clients;
  const totalRequests = totalLoad * config.duration;
  const successfulRequests = Math.floor(totalRequests * 0.95); // 95% success rate
  const failedRequests = totalRequests - successfulRequests;
  
  // Generate mock node metrics
  const nodeMetrics: Record<string, NodeMetrics> = {};
  nodes.forEach(node => {
    nodeMetrics[node.id] = {
      nodeId: node.id,
      nodeLabel: node.data.label,
      requestsProcessed: Math.floor(totalRequests / nodes.length),
      averageLatency: Math.random() * 100 + 10, // 10-110ms
      p95Latency: Math.random() * 200 + 50,   // 50-250ms
      p99Latency: Math.random() * 500 + 100,  // 100-600ms
      throughput: totalLoad / nodes.length,
      errorRate: Math.random() * 0.05,        // 0-5% error rate
      utilization: Math.random() * 0.8 + 0.1, // 10-90% utilization
      queueLength: Math.random() * 10         // 0-10 average queue length
    };
  });

  // Generate mock bottlenecks
  const bottlenecks: Bottleneck[] = [];
  nodes.forEach(node => {
    if (Math.random() > 0.7) { // 30% chance of bottleneck
      const utilization = nodeMetrics[node.id].utilization;
      if (utilization > 0.8) {
        bottlenecks.push({
          nodeId: node.id,
          nodeLabel: node.data.label,
          severity: utilization > 0.95 ? 'critical' : 'high',
          metric: 'utilization',
          value: utilization,
          threshold: 0.8,
          description: `High utilization detected`
        });
      }
    }
  });

  return {
    id: `sim_${Date.now()}`,
    timestamp: new Date(),
    config: { ...config },
    totalRequests,
    successfulRequests,
    failedRequests,
    averageLatency: 50,
    p95Latency: 150,
    p99Latency: 300,
    throughput: totalLoad,
    errorRate: failedRequests / totalRequests,
    nodeMetrics,
    bottlenecks,
    duration: config.duration
  };
}
