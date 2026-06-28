import { Node, Edge } from '@xyflow/react';
import { SimulationNodeData, ComponentConfig, SimulationParams } from '@/types';
import { getServiceById, getDefaultConfigForComponent } from '@/lib/services';
import { ParsedCommand, mapPropertyToConfigField, convertValueForField } from './parser';
import {
  executeSimSetCommand,
  executeSimConfigCommand,
  executeSimResetCommand,
  executeSimRunCommand,
  executeSimStopCommand,
  executeShowSimCommand,
  executeShowMetricsCommand,
  executeShowBottlenecksCommand,
  executeShowServicesCommand
} from './simulation-handlers';
import {
  executeLoadPresetCommand,
  executeSavePresetCommand,
  executeDeletePresetCommand,
  executeListPresetCommand
} from './preset-handlers';

export interface CommandResult {
  success: boolean;
  message: string;
  pendingConfirmation?: boolean;
  confirmationPrompt?: string;
}

/**
 * Execute a set command to update a single property on a node
 */
export function executeSetCommand(
  parsed: ParsedCommand,
  nodes: Node<SimulationNodeData>[],
  updateNode: (nodeId: string, data: Partial<SimulationNodeData>) => void
): CommandResult {
  if (!parsed.label || !parsed.property || parsed.value === undefined) {
    return { success: false, message: 'Invalid set command' };
  }

  // Find node by label (case-insensitive)
  const node = nodes.find(n => n.data.label.toLowerCase() === parsed.label!.toLowerCase());
  
  if (!node) {
    return { success: false, message: `Node "${parsed.label}" not found` };
  }

  const configField = mapPropertyToConfigField(parsed.property);
  
  if (!configField) {
    return { success: false, message: `Unknown property: ${parsed.property}` };
  }

  const convertedValue = convertValueForField(configField, parsed.value);
  
  if (convertedValue === null) {
    return { success: false, message: `Invalid value for ${parsed.property}: ${parsed.value}` };
  }
  
  updateNode(node.id, {
    config: {
      ...node.data.config,
      [configField]: convertedValue
    } as any
  });

  return { 
    success: true, 
    message: `Set ${parsed.property} = ${parsed.value} on node "${parsed.label}"` 
  };
}

/**
 * Execute a config command to update multiple properties on a node
 */
export function executeMultiConfigCommand(
  parsed: ParsedCommand,
  nodes: Node<SimulationNodeData>[],
  updateNode: (nodeId: string, data: Partial<SimulationNodeData>) => void
): CommandResult {
  if (!parsed.label || !parsed.properties) {
    return { success: false, message: 'Invalid config command' };
  }

  // Find node by label (case-insensitive)
  const node = nodes.find(n => n.data.label.toLowerCase() === parsed.label!.toLowerCase());
  
  if (!node) {
    return { success: false, message: `Node "${parsed.label}" not found` };
  }

  const configUpdates: Partial<ComponentConfig> = {};
  const unknownProperties: string[] = [];

  for (const [property, value] of Object.entries(parsed.properties)) {
    const configField = mapPropertyToConfigField(property);
    
    if (!configField) {
      unknownProperties.push(property);
      continue;
    }

    const convertedValue = convertValueForField(configField, value);
    if (convertedValue === null) {
      unknownProperties.push(property);
      continue;
    }
    (configUpdates as any)[configField] = convertedValue;
  }

  if (Object.keys(configUpdates).length === 0) {
    return { 
      success: false, 
      message: `No valid properties found. Unknown: ${unknownProperties.join(', ')}` 
    };
  }

  updateNode(node.id, {
    config: {
      ...node.data.config,
      ...configUpdates
    } as any
  });

  const message = `Updated ${Object.keys(configUpdates).length} properties on node "${parsed.label}"`;
  if (unknownProperties.length > 0) {
    return { 
      success: true, 
      message: `${message} (ignored unknown: ${unknownProperties.join(', ')})` 
    };
  }

  return { success: true, message };
}

/**
 * Execute a reset config command to reset a node's config to service defaults
 */
export function executeResetConfigCommand(
  parsed: ParsedCommand,
  nodes: Node<SimulationNodeData>[],
  updateNode: (nodeId: string, data: Partial<SimulationNodeData>) => void
): CommandResult {
  if (!parsed.label) {
    return { success: false, message: 'Invalid reset config command' };
  }

  // Find node by label (case-insensitive)
  const node = nodes.find(n => n.data.label.toLowerCase() === parsed.label!.toLowerCase());
  
  if (!node) {
    return { success: false, message: `Node "${parsed.label}" not found` };
  }

  const componentType = node.data.componentType;
  const defaultConfig = getDefaultConfigForComponent(componentType);

  // Reset to service defaults
  updateNode(node.id, {
    config: defaultConfig
  });

  return { 
    success: true, 
    message: `Reset config for node "${parsed.label}" to service defaults` 
  };
}

/**
 * Execute any parsed configuration command
 */
export async function executeConfigCommand(
  parsed: ParsedCommand,
  nodes: Node<SimulationNodeData>[],
  edges: Edge[],
  updateNode: (nodeId: string, data: Partial<SimulationNodeData>) => void,
  setNodes?: (nodes: Node<SimulationNodeData>[]) => void,
  setEdges?: (edges: Edge[]) => void,
  setSimulationParams?: (params: SimulationParams) => void,
  currentSimulationParams?: SimulationParams,
  onUpdateUIParams?: (params: Partial<SimulationParams>) => void,
  onRunSimulation?: () => void,
  onStopSimulation?: () => void,
  onResetSimulation?: () => void,
  onSimulationComplete?: (results: any) => void,
  deleteConfirmed?: boolean,
  token?: string,
  setCurrentDesignName?: (name: string) => void
): Promise<CommandResult> {
  switch (parsed.type) {
    case 'set':
      return executeSetCommand(parsed, nodes, updateNode);
    case 'config':
      return executeMultiConfigCommand(parsed, nodes, updateNode);
    case 'reset_config':
      return executeResetConfigCommand(parsed, nodes, updateNode);
    case 'sim_set':
      return executeSimSetCommand(parsed, onUpdateUIParams);
    case 'sim_config':
      return executeSimConfigCommand(parsed, onUpdateUIParams);
    case 'sim_reset':
      return executeSimResetCommand(onUpdateUIParams, onResetSimulation);
    case 'sim_run':
      return executeSimRunCommand(parsed, nodes, onRunSimulation, onSimulationComplete);
    case 'sim_stop':
      return executeSimStopCommand(onStopSimulation);
    case 'show_sim':
      return executeShowSimCommand(parsed);
    case 'show_metrics':
      return executeShowMetricsCommand(parsed);
    case 'show_bottlenecks':
      return executeShowBottlenecksCommand();
    case 'show_services':
      return executeShowServicesCommand(parsed);
    case 'load_preset':
      if (!setNodes || !setEdges || !setSimulationParams) {
        return { success: false, message: 'Missing required callbacks for load_preset' };
      }
      return executeLoadPresetCommand(parsed, setNodes, setEdges, setSimulationParams, setCurrentDesignName, token);
    case 'save_preset':
      if (!currentSimulationParams) {
        return { success: false, message: 'Missing current simulation params for save_preset' };
      }
      return executeSavePresetCommand(parsed, nodes, edges, currentSimulationParams, token);
    case 'delete_preset':
      return executeDeletePresetCommand(parsed, deleteConfirmed || false, token);
    case 'list_preset':
      return executeListPresetCommand(token);
    default:
      return { success: false, message: parsed.error || 'Unknown command' };
  }
}
