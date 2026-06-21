import { AwsServiceOption, ComponentType, ComponentConfig } from '@/types';

// Helper function to add pricing metadata to services
function withPricing(service: Omit<AwsServiceOption, 'pricingLastUpdated' | 'pricingDisclaimer'>): AwsServiceOption {
  return {
    ...service,
    pricingLastUpdated: '2026-04-13',
    pricingDisclaimer: 'Pricing is for simulation purposes only and may not reflect current AWS rates. Users should override costs with actual pricing for accurate estimates.',
  };
}

export const SERVICE_CATALOG: AwsServiceOption[] = [

  // Load Balancer
  {
    id: 'alb',
    name: 'AWS ALB',
    provider: 'AWS',
    componentType: 'load_balancer',
    baseCostPerHour: 0.0281, // ~25% increase from 2024 pricing + LCU charges
    baseLatencyMs: 2,
    maxRps: 100000,
    maxThroughputMBps: 3000,
    description: 'Application Load Balancer with layer 7 routing, path-based routing',
    pricingLastUpdated: '2026-04-13',
    pricingDisclaimer: 'Pricing is for simulation purposes only and may not reflect current AWS rates. Users should override costs with actual pricing for accurate estimates.',
  },
  {
    id: 'nlb',
    name: 'AWS NLB',
    provider: 'AWS',
    componentType: 'load_balancer',
    baseCostPerHour: 0.0225,
    baseLatencyMs: 0.1,
    maxRps: 1000000,
    maxThroughputMBps: 10000,
    description: 'Network Load Balancer with ultra-low latency, layer 4',
    pricingLastUpdated: '2026-04-13',
    pricingDisclaimer: 'Pricing is for simulation purposes only and may not reflect current AWS rates. Users should override costs with actual pricing for accurate estimates.',
  },
  {
    id: 'nginx',
    name: 'Nginx (self-managed)',
    provider: 'Generic',
    componentType: 'load_balancer',
    baseCostPerHour: 0.05, // cost of EC2 instance running nginx
    baseLatencyMs: 1,
    maxRps: 50000,
    maxThroughputMBps: 1000,
    description: 'Self-managed Nginx reverse proxy on EC2',
    pricingLastUpdated: '2026-04-13',
    pricingDisclaimer: 'Pricing is for simulation purposes only and may not reflect current AWS rates. Users should override costs with actual pricing for accurate estimates.',
  },

  // API Server
  {
    id: 'ec2_t3_medium',
    name: 'AWS EC2 t3.medium',
    provider: 'AWS',
    componentType: 'api_server',
    baseCostPerHour: 0.0520, // ~25% increase from 2024 pricing
    baseLatencyMs: 15,
    maxRps: 1000,
    maxThroughputMBps: 600,
    description: '2 vCPU, 4GB RAM — good for low-medium traffic APIs',
    pricingLastUpdated: '2026-04-13',
    pricingDisclaimer: 'Pricing is for simulation purposes only and may not reflect current AWS rates. Users should override costs with actual pricing for accurate estimates.',
  },
  {
    id: 'ec2_c5_xlarge',
    name: 'AWS EC2 c5.xlarge',
    provider: 'AWS',
    componentType: 'api_server',
    baseCostPerHour: 0.2125, // ~25% increase from 2024 pricing
    baseLatencyMs: 10,
    maxRps: 5000,
    maxThroughputMBps: 1250,
    description: '4 vCPU, 8GB RAM — compute optimized for high-traffic APIs',
    pricingLastUpdated: '2026-04-13',
    pricingDisclaimer: 'Pricing is for simulation purposes only and may not reflect current AWS rates. Users should override costs with actual pricing for accurate estimates.',
  },
  {
    id: 'ec2_c5_4xlarge',
    name: 'AWS EC2 c5.4xlarge',
    provider: 'AWS',
    componentType: 'api_server',
    baseCostPerHour: 0.68,
    baseLatencyMs: 5,
    maxRps: 20000,
    maxThroughputMBps: 5000,
    description: '16 vCPU, 32GB RAM — high-performance compute',
    pricingLastUpdated: '2026-04-13',
    pricingDisclaimer: 'Pricing is for simulation purposes only and may not reflect current AWS rates. Users should override costs with actual pricing for accurate estimates.',
  },
  {
    id: 'lambda',
    name: 'AWS Lambda',
    provider: 'AWS',
    componentType: 'api_server',
    baseCostPerHour: 0.00, // pay per invocation: $0.20/million + compute
    baseLatencyMs: 50, // cold start averaged in
    maxRps: 3000, // default concurrency limit
    maxThroughputMBps: 500,
    description: 'Serverless compute — pay per request, auto-scales, cold starts',
    pricingLastUpdated: '2026-04-13',
    pricingDisclaimer: 'Pricing is for simulation purposes only and may not reflect current AWS rates. Users should override costs with actual pricing for accurate estimates.',
  },
  {
    id: 'fargate',
    name: 'AWS Fargate',
    provider: 'AWS',
    componentType: 'api_server',
    baseCostPerHour: 0.05,
    baseLatencyMs: 12,
    maxRps: 2000,
    maxThroughputMBps: 500,
    description: 'Serverless containers — no server management',
    pricingLastUpdated: '2026-04-13',
    pricingDisclaimer: 'Pricing is for simulation purposes only and may not reflect current AWS rates. Users should override costs with actual pricing for accurate estimates.',
  },

  // Cache
  {
    id: 'elasticache_redis',
    name: 'AWS ElastiCache (Redis)',
    provider: 'AWS',
    componentType: 'cache',
    baseCostPerHour: 0.0850, // ~25% increase from 2024 pricing
    baseLatencyMs: 0.5,
    maxRps: 100000,
    maxThroughputMBps: 1500,
    description: 'Managed Redis — sub-millisecond latency, up to 500 nodes',
    pricingLastUpdated: '2026-04-13',
    pricingDisclaimer: 'Pricing is for simulation purposes only and may not reflect current AWS rates. Users should override costs with actual pricing for accurate estimates.',
  },
  {
    id: 'elasticache_memcached',
    name: 'AWS ElastiCache (Memcached)',
    provider: 'AWS',
    componentType: 'cache',
    baseCostPerHour: 0.047,
    baseLatencyMs: 0.4,
    maxRps: 150000,
    maxThroughputMBps: 1500,
    description: 'Managed Memcached — simple key-value caching',
    pricingLastUpdated: '2026-04-13',
    pricingDisclaimer: 'Pricing is for simulation purposes only and may not reflect current AWS rates. Users should override costs with actual pricing for accurate estimates.',
  },
  {
    id: 'redis_self',
    name: 'Redis (self-managed)',
    provider: 'Generic',
    componentType: 'cache',
    baseCostPerHour: 0.05,
    baseLatencyMs: 0.3,
    maxRps: 120000,
    maxThroughputMBps: 1000,
    description: 'Self-managed Redis on EC2',
    pricingLastUpdated: '2026-04-13',
    pricingDisclaimer: 'Pricing is for simulation purposes only and may not reflect current AWS rates. Users should override costs with actual pricing for accurate estimates.',
  },

  // Database
  {
    id: 'rds_mysql',
    name: 'AWS RDS MySQL',
    provider: 'AWS',
    componentType: 'database',
    baseCostPerHour: 0.2138, // ~25% increase from 2024 pricing
    baseLatencyMs: 5,
    maxRps: 10000,
    maxThroughputMBps: 600,
    description: 'Managed MySQL — Multi-AZ, automated backups, read replicas',
    pricingLastUpdated: '2026-04-13',
    pricingDisclaimer: 'Pricing is for simulation purposes only and may not reflect current AWS rates. Users should override costs with actual pricing for accurate estimates.',
  },
  {
    id: 'rds_postgres',
    name: 'AWS RDS PostgreSQL',
    provider: 'AWS',
    componentType: 'database',
    baseCostPerHour: 0.185,
    baseLatencyMs: 5,
    maxRps: 10000,
    maxThroughputMBps: 600,
    description: 'Managed PostgreSQL — ACID compliant, extensible',
    pricingLastUpdated: '2026-04-13',
    pricingDisclaimer: 'Pricing is for simulation purposes only and may not reflect current AWS rates. Users should override costs with actual pricing for accurate estimates.',
  },
  {
    id: 'aurora',
    name: 'AWS Aurora',
    provider: 'AWS',
    componentType: 'database',
    baseCostPerHour: 0.29,
    baseLatencyMs: 3,
    maxRps: 50000,
    maxThroughputMBps: 2000,
    description: 'MySQL/PostgreSQL compatible — 5x throughput, auto-scaling storage',
    pricingLastUpdated: '2026-04-13',
    pricingDisclaimer: 'Pricing is for simulation purposes only and may not reflect current AWS rates. Users should override costs with actual pricing for accurate estimates.',
  },
  {
    id: 'dynamodb',
    name: 'AWS DynamoDB',
    provider: 'AWS',
    componentType: 'database',
    baseCostPerHour: 0.00065, // per WCU, on-demand pricing
    baseLatencyMs: 2,
    maxRps: 40000, // per table partition
    maxThroughputMBps: 1000,
    description: 'Fully managed NoSQL — single-digit ms latency at any scale',
    pricingLastUpdated: '2026-04-13',
    pricingDisclaimer: 'Pricing is for simulation purposes only and may not reflect current AWS rates. Users should override costs with actual pricing for accurate estimates.',
  },
  {
    id: 'mongodb_atlas',
    name: 'MongoDB Atlas M30',
    provider: 'Generic',
    componentType: 'database',
    baseCostPerHour: 0.54,
    baseLatencyMs: 4,
    maxRps: 15000,
    maxThroughputMBps: 800,
    description: 'Managed MongoDB — flexible schema, horizontal scaling',
    pricingLastUpdated: '2026-04-13',
    pricingDisclaimer: 'Pricing is for simulation purposes only and may not reflect current AWS rates. Users should override costs with actual pricing for accurate estimates.',
  },

  // Message Queue
  {
    id: 'sqs',
    name: 'AWS SQS',
    provider: 'AWS',
    componentType: 'message_queue',
    baseCostPerHour: 0.00004, // $0.40/million requests
    baseLatencyMs: 5,
    maxRps: 30000,
    maxThroughputMBps: 256,
    description: 'Fully managed message queue — unlimited throughput, at-least-once delivery',
    pricingLastUpdated: '2026-04-13',
    pricingDisclaimer: 'Pricing is for simulation purposes only and may not reflect current AWS rates. Users should override costs with actual pricing for accurate estimates.',
  },
  {
    id: 'sns',
    name: 'AWS SNS',
    provider: 'AWS',
    componentType: 'message_queue',
    baseCostPerHour: 0.00005,
    baseLatencyMs: 3,
    maxRps: 30000,
    maxThroughputMBps: 256,
    description: 'Pub/sub messaging — fan-out to multiple subscribers',
    pricingLastUpdated: '2026-04-13',
    pricingDisclaimer: 'Pricing is for simulation purposes only and may not reflect current AWS rates. Users should override costs with actual pricing for accurate estimates.',
  },
  {
    id: 'kafka_msk',
    name: 'AWS MSK (Kafka)',
    provider: 'AWS',
    componentType: 'message_queue',
    baseCostPerHour: 0.21, // kafka.m5.large
    baseLatencyMs: 2,
    maxRps: 100000,
    maxThroughputMBps: 3000,
    description: 'Managed Apache Kafka — high-throughput streaming platform',
    pricingLastUpdated: '2026-04-13',
    pricingDisclaimer: 'Pricing is for simulation purposes only and may not reflect current AWS rates. Users should override costs with actual pricing for accurate estimates.',
  },
  {
    id: 'rabbitmq',
    name: 'AWS MQ (RabbitMQ)',
    provider: 'AWS',
    componentType: 'message_queue',
    baseCostPerHour: 0.13,
    baseLatencyMs: 3,
    maxRps: 20000,
    maxThroughputMBps: 500,
    description: 'Managed RabbitMQ — flexible routing, multiple protocols',
    pricingLastUpdated: '2026-04-13',
    pricingDisclaimer: 'Pricing is for simulation purposes only and may not reflect current AWS rates. Users should override costs with actual pricing for accurate estimates.',
  },

  // Worker / Compute
  {
    id: 'ec2_worker',
    name: 'AWS EC2 Worker (c5.2xlarge)',
    provider: 'AWS',
    componentType: 'worker',
    baseCostPerHour: 0.34,
    baseLatencyMs: 100,
    maxRps: 500,
    maxThroughputMBps: 2500,
    description: '8 vCPU, 16GB RAM — background job processing',
    pricingLastUpdated: '2026-04-13',
    pricingDisclaimer: 'Pricing is for simulation purposes only and may not reflect current AWS rates. Users should override costs with actual pricing for accurate estimates.',
  },
  {
    id: 'lambda_worker',
    name: 'AWS Lambda Worker',
    provider: 'AWS',
    componentType: 'worker',
    baseCostPerHour: 0.0,
    baseLatencyMs: 200,
    maxRps: 1000,
    maxThroughputMBps: 500,
    description: 'Serverless worker — event-driven processing',
    pricingLastUpdated: '2026-04-13',
    pricingDisclaimer: 'Pricing is for simulation purposes only and may not reflect current AWS rates. Users should override costs with actual pricing for accurate estimates.',
  },

  // Notification
  {
    id: 'ses',
    name: 'AWS SES',
    provider: 'AWS',
    componentType: 'notification_service',
    baseCostPerHour: 0.0001,
    baseLatencyMs: 100,
    maxRps: 200,
    maxThroughputMBps: 10,
    description: 'Email sending service — transactional and bulk emails',
    pricingLastUpdated: '2026-04-13',
    pricingDisclaimer: 'Pricing is for simulation purposes only and may not reflect current AWS rates. Users should override costs with actual pricing for accurate estimates.',
  },
  {
    id: 'push_sns',
    name: 'AWS SNS (Push)',
    provider: 'AWS',
    componentType: 'notification_service',
    baseCostPerHour: 0.00005,
    baseLatencyMs: 50,
    maxRps: 30000,
    maxThroughputMBps: 100,
    description: 'Push notifications to mobile devices, SMS, email',
    pricingLastUpdated: '2026-04-13',
    pricingDisclaimer: 'Pricing is for simulation purposes only and may not reflect current AWS rates. Users should override costs with actual pricing for accurate estimates.',
  },

  // Rate Limiter
  {
    id: 'rate_limiter_generic',
    name: 'Rate Limiter Middleware',
    provider: 'Generic',
    componentType: 'rate_limiter',
    baseCostPerHour: 0.05, // EC2 t3.small running rate limiter service
    baseLatencyMs: 1, // sub-ms overhead per request
    maxRps: 50000,
    maxThroughputMBps: 500,
    description: 'In-process rate limiting middleware — enforces request limits per user/IP using configurable algorithms',
    pricingLastUpdated: '2026-04-13',
    pricingDisclaimer: 'Pricing is for simulation purposes only and may not reflect current AWS rates. Users should override costs with actual pricing for accurate estimates.',
  },
  {
    id: 'rate_limiter_redis',
    name: 'Redis-backed Rate Limiter',
    provider: 'Generic',
    componentType: 'rate_limiter',
    baseCostPerHour: 0.118, // EC2 t3.small + ElastiCache cache.t4g.small
    baseLatencyMs: 2, // includes Redis round-trip
    maxRps: 100000,
    maxThroughputMBps: 1000,
    description: 'Distributed rate limiter using Redis for shared counters — consistent across multiple instances',
    pricingLastUpdated: '2026-04-13',
    pricingDisclaimer: 'Pricing is for simulation purposes only and may not reflect current AWS rates. Users should override costs with actual pricing for accurate estimates.',
  },

  // Redis Counter (dedicated for rate limiting)
  {
    id: 'redis_counter',
    name: 'Redis Counter (ElastiCache t4g.small)',
    provider: 'AWS',
    componentType: 'cache',
    baseCostPerHour: 0.034, // cache.t4g.small on-demand
    baseLatencyMs: 0.3,
    maxRps: 200000,
    maxThroughputMBps: 1000,
    description: 'Dedicated Redis for rate limit counters — INCR + EXPIRE per request. $0.034/hr (~$24.82/mo)',
    pricingLastUpdated: '2026-04-13',
    pricingDisclaimer: 'Pricing is for simulation purposes only and may not reflect current AWS rates. Users should override costs with actual pricing for accurate estimates.',
  },

  // Client (placeholder)
  {
    id: 'web_client',

    name: 'Web/Mobile Client',
    provider: 'Generic',
    componentType: 'client',
    baseCostPerHour: 0,
    baseLatencyMs: 0,
    maxRps: Infinity,
    maxThroughputMBps: Infinity,
    description: 'User devices — browsers, mobile apps, smart TVs',
    pricingLastUpdated: '2026-04-13',
    pricingDisclaimer: 'Pricing is for simulation purposes only and may not reflect current AWS rates. Users should override costs with actual pricing for accurate estimates.',
  },
];

export function getServicesForType(type: ComponentType): AwsServiceOption[] {
  return SERVICE_CATALOG.filter((s) => s.componentType === type);
}

export function getServiceById(id: string): AwsServiceOption | undefined {
  return SERVICE_CATALOG.find((s) => s.id === id);
}

export const COMPONENT_DEFAULTS: Record<ComponentType, string> = {
  client: 'web_client',
  load_balancer: 'alb',
  api_server: 'ec2_c5_xlarge',
  cache: 'elasticache_redis',
  database: 'rds_postgres',
  message_queue: 'sqs',
  worker: 'ec2_worker',
  notification_service: 'push_sns',
  rate_limiter: 'rate_limiter_redis',
};

export const COMPONENT_LABELS: Record<ComponentType, string> = {
  client: 'Client',
  load_balancer: 'Load Balancer',
  api_server: 'API Server',
  cache: 'Cache',
  database: 'Database',
  message_queue: 'Message Queue',
  worker: 'Worker',
  notification_service: 'Notification Service',
  rate_limiter: 'Rate Limiter',
};

export const COMPONENT_COLORS: Record<ComponentType, string> = {
  client: '#6366f1',
  load_balancer: '#10b981',
  api_server: '#f59e0b',
  cache: '#ef4444',
  database: '#3b82f6',
  message_queue: '#ec4899',
  worker: '#f97316',
  notification_service: '#84cc16',
  rate_limiter: '#dc2626',
};

/**
 * Get default configuration for a component type based on its default service
 */
export function getDefaultConfigForComponent(componentType: ComponentType): ComponentConfig {
  const defaultServiceId = COMPONENT_DEFAULTS[componentType];
  const service = getServiceById(defaultServiceId);
  
  if (!service) {
    // Fallback to empty config with required serviceId
    return {
      serviceId: defaultServiceId,
    };
  }
  
  return {
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
  };
}
