import { DesignPreset } from '@/types';

export const PRESETS: DesignPreset[] = [
  {
    id: 'Url Shortener',
    name: 'URL Shortener',
    description: 'Shorten long URLs and redirect via short codes',
    simulationParams: {
      concurrentUsers: 1000,
      requestsPerSecPerUser: 1,
      payloadSizeMB: 0.001,
      simulationDurationSeconds: 10,
      loadProfile: 'repeating_spike' as const,
      spikeFrequency: 2,
      spikeIntensity: 2,
    },
    nodes: [
      {
        id: 'client',
        type: 'infra',
        position: { x: 400, y: 450 },
        data: {
          label: 'Client',
          componentType: 'client',
          config: { serviceId: 'web_client' },
        },
      },
      {
        id: 'lb',
        type: 'infra',
        position: { x: 400, y: 600 },
        data: {
          label: 'Load Balancer',
          componentType: 'load_balancer',
          config: { serviceId: 'alb' },
        },
      },
      {
        id: 'api1',
        type: 'infra',
        position: { x: 225, y: 750 },
        data: {
          label: 'API Server 1',
          componentType: 'api_server',
          config: { serviceId: 'ec2_c5_xlarge' },
        },
      },
      {
        id: 'api2',
        type: 'infra',
        position: { x: 400, y: 750 },
        data: {
          label: 'API Server 2',
          componentType: 'api_server',
          config: { serviceId: 'ec2_c5_xlarge' },
        },
      },
      {
        id: 'api3',
        type: 'infra',
        position: { x: 575, y: 750 },
        data: {
          label: 'API Server 3',
          componentType: 'api_server',
          config: { serviceId: 'ec2_c5_xlarge' },
        },
      },
      {
        id: 'cache1',
        type: 'infra',
        position: { x: 300, y: 900 },
        data: {
          label: 'URL Cache 1',
          componentType: 'cache',
          config: { serviceId: 'elasticache_redis', cacheHitRate: 0.85 },
        },
      },
      {
        id: 'cache2',
        type: 'infra',
        position: { x: 500, y: 900 },
        data: {
          label: 'URL Cache 2',
          componentType: 'cache',
          config: { serviceId: 'elasticache_redis', cacheHitRate: 0.85 },
        },
      },
      {
        id: 'db',
        type: 'infra',
        position: { x: 400, y: 1050 },
        data: {
          label: 'URL Database',
          componentType: 'database',
          config: { serviceId: 'dynamodb' },
        },
      },
    ],
    edges: [
      { id: 'e-client-lb', source: 'client', target: 'lb', sourceHandle: 'bottom-source', targetHandle: 'top-target' },
      { id: 'e-lb-api1', source: 'lb', target: 'api1', animated: true,  sourceHandle: 'bottom-source', targetHandle: 'top-target' },
      { id: 'e-lb-api2', source: 'lb', target: 'api2', animated: true, sourceHandle: 'bottom-source', targetHandle: 'top-target' },
      { id: 'e-lb-api3', source: 'lb', target: 'api3', animated: true, sourceHandle: 'bottom-source', targetHandle: 'top-target' },
      { id: 'e-api1-cache1', source: 'api1', target: 'cache1', sourceHandle: 'bottom-source', targetHandle: 'top-target' },
      { id: 'e-api2-cache1', source: 'api2', target: 'cache1', sourceHandle: 'bottom-source', targetHandle: 'top-target' },
      { id: 'e-api3-cache2', source: 'api3', target: 'cache2', sourceHandle: 'bottom-source', targetHandle: 'top-target' },
      { id: 'e-cache1-db', source: 'cache1', target: 'db', sourceHandle: 'bottom-source', targetHandle: 'top-target' },
      { id: 'e-cache2-db', source: 'cache2', target: 'db', sourceHandle: 'bottom-source', targetHandle: 'top-target' },
    ],
  }
];
