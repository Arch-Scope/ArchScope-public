import { ComponentConfig, RateLimitAlgorithm } from '@/types';

export interface ParsedCommand {
  type: 'set' | 'config' | 'reset_config' | 'sim_set' | 'sim_config' | 'sim_run' | 'sim_stop' | 'sim_reset' | 'show_sim' | 'show_metrics' | 'show_bottlenecks' | 'show_services' | 'load_preset' | 'save_preset' | 'delete_preset' | 'list_preset' | 'unknown';
  label?: string;
  property?: string;
  value?: string | number | boolean;
  properties?: Record<string, string | number | boolean>;
  simProperty?: string;
  simValue?: string | number | boolean;
  simProperties?: Record<string, string | number | boolean>;
  simOverrides?: Record<string, string | number | boolean>;
  queryType?: string;
  presetName?: string;
  presetDescription?: string;
  error?: string;
}

/**
 * Parse a single property set command
 * Syntax: set <label> <property> = <value>
 */
export function parseSetCommand(command: string): ParsedCommand {
  const parts = command.trim().split(/\s+/);
  
  if (parts.length < 4) {
    return { type: 'unknown', error: 'Invalid set command. Usage: set <label> <property> = <value>' };
  }
  
  if (parts.length > 5) {
    return { type: 'unknown', error: 'Invalid set command. Too many arguments. Usage: set <label> <property> = <value>' };
  }
  
  const label = parts[1];
  const property = parts[2];
  const equalsIndex = parts.indexOf('=');
  
  if (equalsIndex === -1) {
    return { type: 'unknown', error: 'Invalid set command. Missing "=" operator' };
  }
  
  if (equalsIndex !== 3) {
    return { type: 'unknown', error: 'Invalid set command. Expected format: set <label> <property> = <value>' };
  }
  
  const valueStr = parts.slice(equalsIndex + 1).join(' ');
  const value = parseValue(valueStr);
  
  return {
    type: 'set',
    label,
    property,
    value
  };
}

/**
 * Parse a multi-property config command
 * Syntax: config <label> { <property>: <value>, ... }
 */
export function parseConfigCommand(command: string): ParsedCommand {
  const parts = command.trim().split(/\s+/);
  
  if (parts.length < 2) {
    return { type: 'unknown', error: 'Invalid config command. Usage: config <label> { <property>: <value>, ... }' };
  }
  
  const label = parts[1];
  const braceStart = command.indexOf('{');
  const braceEnd = command.indexOf('}');
  
  if (braceStart === -1 || braceEnd === -1) {
    return { type: 'unknown', error: 'Invalid config command. Missing { } block' };
  }
  
  const blockContent = command.slice(braceStart + 1, braceEnd).trim();
  const properties: Record<string, string | number | boolean> = {};
  
  // Parse key-value pairs separated by commas
  const pairs = blockContent.split(',').map(p => p.trim()).filter(p => p);
  
  for (const pair of pairs) {
    const colonIndex = pair.indexOf(':');
    if (colonIndex === -1) {
      return { type: 'unknown', error: `Invalid property pair: ${pair}` };
    }
    
    const key = pair.slice(0, colonIndex).trim();
    const valueStr = pair.slice(colonIndex + 1).trim();
    const value = parseValue(valueStr);
    
    properties[key] = value;
  }
  
  return {
    type: 'config',
    label,
    properties
  };
}

/**
 * Parse a reset config command
 * Syntax: reset config <label>
 */
export function parseResetConfigCommand(command: string): ParsedCommand {
  const parts = command.trim().split(/\s+/);
  
  if (parts.length < 3) {
    return { type: 'unknown', error: 'Invalid reset config command. Usage: reset config <label>' };
  }
  
  const label = parts[2];
  
  return {
    type: 'reset_config',
    label
  };
}

/**
 * Parse a value string into the appropriate type
 */
function parseValue(valueStr: string): string | number | boolean {
  valueStr = valueStr.trim();
  
  // Remove quotes from strings
  if ((valueStr.startsWith('"') && valueStr.endsWith('"')) || 
      (valueStr.startsWith("'") && valueStr.endsWith("'"))) {
    return valueStr.slice(1, -1);
  }
  
  // Parse booleans
  if (valueStr.toLowerCase() === 'true') return true;
  if (valueStr.toLowerCase() === 'false') return false;
  
  // Parse numbers
  const num = parseFloat(valueStr);
  if (!isNaN(num)) {
    return num;
  }
  
  // Return as string
  return valueStr;
}

/**
 * Parse a simulation set command
 * Syntax: sim_set <property> = <value>
 */
export function parseSimSetCommand(command: string): ParsedCommand {
  const parts = command.trim().split(/\s+/);
  
  if (parts.length < 4) {
    return { type: 'unknown', error: 'Invalid sim_set command. Usage: sim_set <property> = <value>' };
  }
  
  if (parts.length > 5) {
    return { type: 'unknown', error: 'Invalid sim_set command. Too many arguments. Usage: sim_set <property> = <value>' };
  }
  
  const property = parts[1];
  const equalsIndex = parts.indexOf('=');
  
  if (equalsIndex === -1) {
    return { type: 'unknown', error: 'Invalid sim_set command. Missing "=" operator' };
  }
  
  if (equalsIndex !== 2) {
    return { type: 'unknown', error: 'Invalid sim_set command. Expected format: sim_set <property> = <value>' };
  }
  
  const valueStr = parts.slice(equalsIndex + 1).join(' ');
  const value = parseValue(valueStr);
  
  return {
    type: 'sim_set',
    simProperty: property,
    simValue: value
  };
}

/**
 * Parse a simulation config command
 * Syntax: sim_config { <property>: <value>, ... }
 */
export function parseSimConfigCommand(command: string): ParsedCommand {
  const parts = command.trim().split(/\s+/);
  
  if (parts.length < 1) {
    return { type: 'unknown', error: 'Invalid sim_config command. Usage: sim_config { <property>: <value>, ... }' };
  }
  
  const braceStart = command.indexOf('{');
  const braceEnd = command.indexOf('}');
  
  if (braceStart === -1 || braceEnd === -1) {
    return { type: 'unknown', error: 'Invalid sim_config command. Missing { } block' };
  }
  
  const blockContent = command.slice(braceStart + 1, braceEnd).trim();
  const properties: Record<string, string | number | boolean> = {};
  
  // Parse key-value pairs separated by commas
  const pairs = blockContent.split(',').map(p => p.trim()).filter(p => p);
  
  for (const pair of pairs) {
    const colonIndex = pair.indexOf(':');
    if (colonIndex === -1) {
      return { type: 'unknown', error: `Invalid property pair: ${pair}` };
    }
    
    const key = pair.slice(0, colonIndex).trim();
    const valueStr = pair.slice(colonIndex + 1).trim();
    const value = parseValue(valueStr);
    
    properties[key] = value;
  }
  
  return {
    type: 'sim_config',
    simProperties: properties
  };
}

/**
 * Parse a simulation run command
 * Syntax: sim_run [property=value ...]
 */
export function parseSimRunCommand(command: string): ParsedCommand {
  const parts = command.trim().split(/\s+/);
  const overrides: Record<string, string | number | boolean> = {};
  
  // Parse optional overrides like duration=300
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    const equalIndex = part.indexOf('=');
    
    if (equalIndex !== -1) {
      const key = part.slice(0, equalIndex).trim();
      const valueStr = part.slice(equalIndex + 1).trim();
      const value = parseValue(valueStr);
      overrides[key] = value;
    }
  }
  
  return {
    type: 'sim_run',
    simOverrides: Object.keys(overrides).length > 0 ? overrides : undefined
  };
}

/**
 * Parse a simulation stop command
 * Syntax: sim_stop
 */
export function parseSimStopCommand(command: string): ParsedCommand {
  const parts = command.trim().split(/\s+/);
  
  if (parts.length > 1) {
    return { type: 'unknown', error: 'Invalid sim_stop command. Usage: sim_stop' };
  }
  
  return { type: 'sim_stop' };
}

/**
 * Parse a simulation reset command
 * Syntax: sim_reset
 */
export function parseSimResetCommand(command: string): ParsedCommand {
  const parts = command.trim().split(/\s+/);
  
  if (parts.length > 1) {
    return { type: 'unknown', error: 'Invalid sim_reset command. Usage: sim_reset' };
  }
  
  return { type: 'sim_reset' };
}

/**
 * Parse a show simulation command
 * Syntax: show_sim [status|config]
 */
export function parseShowSimCommand(command: string): ParsedCommand {
  const parts = command.trim().split(/\s+/);
  
  if (parts.length > 2) {
    return { type: 'unknown', error: 'Invalid show_sim command. Usage: show_sim [status|config]' };
  }
  
  return {
    type: 'show_sim',
    queryType: parts[1] || 'config'
  };
}

/**
 * Parse a show metrics command
 * Syntax: show_metrics [latency|throughput|errors]
 */
export function parseShowMetricsCommand(command: string): ParsedCommand {
  const parts = command.trim().split(/\s+/);
  
  if (parts.length > 2) {
    return { type: 'unknown', error: 'Invalid show_metrics command. Usage: show_metrics [latency|throughput|errors]' };
  }
  
  return {
    type: 'show_metrics',
    queryType: parts[1] || 'all'
  };
}

/**
 * Parse a show bottlenecks command
 * Syntax: show_bottlenecks
 */
export function parseShowBottlenecksCommand(command: string): ParsedCommand {
  const parts = command.trim().split(/\s+/);
  
  if (parts.length > 1) {
    return { type: 'unknown', error: 'Invalid show_bottlenecks command. Usage: show_bottlenecks' };
  }
  
  return { type: 'show_bottlenecks' };
}

/**
 * Parse a load preset command
 * Syntax: load_preset <preset_name>
 * Preset names can contain spaces (e.g., "Url Shortener")
 */
export function parseLoadPresetCommand(command: string): ParsedCommand {
  const parts = command.trim().split(/\s+/);
  
  if (parts.length < 2) {
    return { type: 'unknown', error: 'Invalid load_preset command. Usage: load_preset <preset_name>' };
  }
  
  // Preset name can contain spaces, so take everything after the command
  const presetName = parts.slice(1).join(' ');
  
  return {
    type: 'load_preset',
    presetName
  };
}

/**
 * Parse a save preset command
 * Syntax: save_preset <preset_name> [as "<description>"]
 */
export function parseSavePresetCommand(command: string): ParsedCommand {
  const parts = command.trim().split(/\s+/);
  
  if (parts.length < 2) {
    return { type: 'unknown', error: 'Invalid save_preset command. Usage: save_preset <preset_name> [as "<description>"]' };
  }
  
  const presetName = parts[1];
  let presetDescription: string | undefined;
  
  // Check for optional "as" keyword and description
  const asIndex = parts.findIndex((part, index) => index >= 2 && part.toLowerCase() === 'as');
  
  if (asIndex !== -1) {
    if (asIndex + 1 >= parts.length) {
      return { type: 'unknown', error: 'Invalid save_preset command. Missing description after "as"' };
    }
    
    // Join remaining parts as description (in case it has spaces)
    presetDescription = parts.slice(asIndex + 1).join(' ');
    
    // Remove quotes if present
    if ((presetDescription.startsWith('"') && presetDescription.endsWith('"')) || 
        (presetDescription.startsWith("'") && presetDescription.endsWith("'"))) {
      presetDescription = presetDescription.slice(1, -1);
    }
  }
  
  return {
    type: 'save_preset',
    presetName,
    presetDescription
  };
}

/**
 * Parse a delete preset command
 * Syntax: delete_preset <preset_name>
 */
export function parseDeletePresetCommand(command: string): ParsedCommand {
  const parts = command.trim().split(/\s+/);
  
  if (parts.length < 2) {
    return { type: 'unknown', error: 'Invalid delete_preset command. Usage: delete_preset <preset_name>' };
  }
  
  if (parts.length > 2) {
    return { type: 'unknown', error: 'Invalid delete_preset command. Too many arguments. Usage: delete_preset <preset_name>' };
  }
  
  const presetName = parts[1];
  
  return {
    type: 'delete_preset',
    presetName
  };
}

/**
 * Parse a list preset command
 * Syntax: list_preset
 */
export function parseListPresetCommand(command: string): ParsedCommand {
  const parts = command.trim().split(/\s+/);
  
  if (parts.length > 1) {
    return { type: 'unknown', error: 'Invalid list_preset command. Usage: list_preset' };
  }
  
  return { type: 'list_preset' };
}

/**
 * Parse a show services command
 * Syntax: show_services [component_type]
 */
export function parseShowServicesCommand(command: string): ParsedCommand {
  const parts = command.trim().split(/\s+/);
  
  if (parts.length > 2) {
    return { type: 'unknown', error: 'Invalid show_services command. Usage: show_services [component_type]' };
  }
  
  return {
    type: 'show_services',
    queryType: parts[1] || 'all'
  };
}

/**
 * Main parser function that routes to the appropriate parser
 */
export function parseAQLCommand(command: string): ParsedCommand {
  const parts = command.trim().split(/\s+/);
  const cmd = parts[0].toLowerCase();
  
  if (cmd === 'set') {
    return parseSetCommand(command);
  }
  
  if (cmd === 'config') {
    return parseConfigCommand(command);
  }
  
  if (cmd === 'reset' && parts[1]?.toLowerCase() === 'config') {
    return parseResetConfigCommand(command);
  }
  
  if (cmd === 'sim_set') {
    return parseSimSetCommand(command);
  }
  
  if (cmd === 'sim_config') {
    return parseSimConfigCommand(command);
  }
  
  if (cmd === 'sim_run') {
    return parseSimRunCommand(command);
  }
  
  if (cmd === 'sim_stop') {
    return parseSimStopCommand(command);
  }
  
  if (cmd === 'sim_reset') {
    return parseSimResetCommand(command);
  }
  
  if (cmd === 'show_sim') {
    return parseShowSimCommand(command);
  }
  
  if (cmd === 'show_metrics') {
    return parseShowMetricsCommand(command);
  }
  
  if (cmd === 'show_bottlenecks') {
    return parseShowBottlenecksCommand(command);
  }
  
  if (cmd === 'load_preset') {
    return parseLoadPresetCommand(command);
  }
  
  if (cmd === 'save_preset') {
    return parseSavePresetCommand(command);
  }
  
  if (cmd === 'delete_preset') {
    return parseDeletePresetCommand(command);
  }
  
  if (cmd === 'list_preset') {
    return parseListPresetCommand(command);
  }
  
  if (cmd === 'show_services') {
    return parseShowServicesCommand(command);
  }
  
  return { type: 'unknown', error: `Unknown command: ${cmd}` };
}

/**
 * Map AQL property names to ComponentConfig field names
 */
export function mapPropertyToConfigField(property: string): keyof ComponentConfig | null {
  const mapping: Record<string, keyof ComponentConfig> = {
    // Primary mappings
    'latency': 'customLatencyMs',
    'maxrps': 'customMaxRps',
    'cost': 'customCostPerHour',
    'hitrate': 'cacheHitRate',
    'ttl': 'cacheTtlSeconds',
    'maxmessages': 'queueMaxMessages',
    'processingtime': 'queueProcessingTimeMs',
    'algorithm': 'rateLimitAlgorithm',
    'bucketsize': 'rateLimitBucketSize',
    'refillrate': 'rateLimitRefillRate',
    'windowseconds': 'rateLimitWindowSeconds',
    'maxrequests': 'rateLimitMaxRequests',
    'rediscounterttl': 'redisCounterTtlSeconds',
    
    // Common aliases
    'max_rps': 'customMaxRps',
    'max-rps': 'customMaxRps',
    'bucket_size': 'rateLimitBucketSize',
    'bucket-size': 'rateLimitBucketSize',
    'processing_time': 'queueProcessingTimeMs',
    'processing-time': 'queueProcessingTimeMs',
    'window_seconds': 'rateLimitWindowSeconds',
    'window-seconds': 'rateLimitWindowSeconds',
    'max_requests': 'rateLimitMaxRequests',
    'max-requests': 'rateLimitMaxRequests',
    'redis_counter_ttl': 'redisCounterTtlSeconds',
    'redis-counter-ttl': 'redisCounterTtlSeconds',
    'cache_ttl': 'cacheTtlSeconds',
    'cache-ttl': 'cacheTtlSeconds',
    'cache_hit_rate': 'cacheHitRate',
    'cache-hit-rate': 'cacheHitRate',
    'custom_latency': 'customLatencyMs',
    'custom-latency': 'customLatencyMs',
    'custom_cost': 'customCostPerHour',
    'custom-cost': 'customCostPerHour',
    'rate_limit_algorithm': 'rateLimitAlgorithm',
    'rate-limit-algorithm': 'rateLimitAlgorithm',
    'rate_limit_refill_rate': 'rateLimitRefillRate',
    'rate-limit-refill-rate': 'rateLimitRefillRate',
  };
  
  // Try exact match first
  if (mapping[property]) {
    return mapping[property];
  }
  
  // Try case-insensitive match
  const lowerProperty = property.toLowerCase();
  for (const key in mapping) {
    if (key.toLowerCase() === lowerProperty) {
      return mapping[key];
    }
  }
  
  return null;
}

/**
 * Convert parsed value to the appropriate type for the config field
 */
export function convertValueForField(
  field: keyof ComponentConfig, 
  value: string | number | boolean
): any {
  switch (field) {
    case 'customLatencyMs': {
      const num = Number(value);
      if (isNaN(num)) {
        return null; // Invalid numeric value
      }
      if (num <= 0) {
        return null; // Latency must be positive
      }
      return num;
    }
    
    case 'customMaxRps':
    case 'cacheTtlSeconds':
    case 'queueMaxMessages':
    case 'rateLimitBucketSize':
    case 'rateLimitRefillRate':
    case 'rateLimitWindowSeconds':
    case 'rateLimitMaxRequests':
    case 'redisCounterTtlSeconds': {
      const num = Number(value);
      if (isNaN(num)) {
        return null; // Invalid numeric value
      }
      if (num < 0) {
        return null; // Must be non-negative
      }
      return num;
    }
    
    case 'queueProcessingTimeMs': {
      const num = Number(value);
      if (isNaN(num)) {
        return null; // Invalid numeric value
      }
      if (num <= 0) {
        return null; // Processing time must be positive
      }
      return num;
    }
    
    case 'cacheHitRate': {
      const num = Number(value);
      if (isNaN(num)) {
        return null;
      }
      // Hit rate is 0-1, but users might input 0-100
      const normalizedRate = num > 1 ? num / 100 : num;
      if (normalizedRate < 0 || normalizedRate > 1) {
        return null; // Hit rate must be between 0 and 1
      }
      return normalizedRate;
    }
    
    case 'rateLimitAlgorithm': {
      const validAlgorithms: RateLimitAlgorithm[] = ['token_bucket', 'fixed_window', 'sliding_window', 'leaky_bucket'];
      const algStr = String(value).toLowerCase();
      if (validAlgorithms.includes(algStr as RateLimitAlgorithm)) {
        return algStr as RateLimitAlgorithm;
      }
      return null; // Invalid algorithm
    }
    
    default:
      return value;
  }
}
