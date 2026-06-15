import { Node } from '@xyflow/react';
import { SimulationNodeData, ComponentConfig } from '@/types';
import { getServiceById, COMPONENT_DEFAULTS } from '@/lib/services';
import { ParsedCommand, mapPropertyToConfigField, convertValueForField } from './parser';

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
  
  updateNode(node.id, {
    config: {
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
    (configUpdates as any)[configField] = convertedValue;
  }

  if (Object.keys(configUpdates).length === 0) {
    return { 
      success: false, 
      message: `No valid properties found. Unknown: ${unknownProperties.join(', ')}` 
    };
  }

  updateNode(node.id, {
    config: configUpdates as any
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
  const defaultServiceId = COMPONENT_DEFAULTS[componentType];
  const service = getServiceById(defaultServiceId);

  if (!service) {
    return { success: false, message: `Service not found for component type: ${componentType}` };
  }

  // Reset to service defaults
  updateNode(node.id, {
    config: {
      serviceId: defaultServiceId,
      customLatencyMs: undefined,
      customMaxRps: undefined,
      customCostPerHour: undefined,
      cacheTtlSeconds: undefined,
      cacheHitRate: componentType === 'cache' ? 0.8 : undefined,
      queueMaxMessages: undefined,
      queueProcessingTimeMs: componentType === 'message_queue' ? 100 : undefined,
      rateLimitAlgorithm: undefined,
      rateLimitBucketSize: undefined,
      rateLimitRefillRate: undefined,
      rateLimitWindowSeconds: undefined,
      rateLimitMaxRequests: undefined,
      redisCounterTtlSeconds: undefined,
    }
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
  updateNode: (nodeId: string, data: Partial<SimulationNodeData>) => void
): CommandResult {
  switch (parsed.type) {
    case 'set':
      return executeSetCommand(parsed, nodes, updateNode);
    case 'config':
      return executeMultiConfigCommand(parsed, nodes, updateNode);
    case 'reset_config':
      return executeResetConfigCommand(parsed, nodes, updateNode);
    default:
      return { success: false, message: parsed.error || 'Unknown command' };
  }
}
