import { ComponentConfig, RateLimitAlgorithm } from '@/types';

export interface ParsedCommand {
  type: 'set' | 'config' | 'reset_config' | 'unknown';
  label?: string;
  property?: string;
  value?: string | number | boolean;
  properties?: Record<string, string | number | boolean>;
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
