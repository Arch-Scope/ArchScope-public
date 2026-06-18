import { Node } from '@xyflow/react';
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
  executeShowBottlenecksCommand
} from './simulation-handlers';

export interface CommandResult {
  success: boolean;
  message: string;
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
export function executeConfigCommand(
  parsed: ParsedCommand,
  nodes: Node<SimulationNodeData>[],
  updateNode: (nodeId: string, data: Partial<SimulationNodeData>) => void,
  onUpdateUIParams?: (params: Partial<SimulationParams>) => void,
  onRunSimulation?: () => void,
  onStopSimulation?: () => void,
  onResetSimulation?: () => void
): CommandResult {
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
      return executeSimRunCommand(parsed, nodes, onRunSimulation);
    case 'sim_stop':
      return executeSimStopCommand(onStopSimulation);
    case 'show_sim':
      return executeShowSimCommand(parsed);
    case 'show_metrics':
      return executeShowMetricsCommand(parsed);
    case 'show_bottlenecks':
      return executeShowBottlenecksCommand();
    default:
      return { success: false, message: parsed.error || 'Unknown command' };
  }
}
