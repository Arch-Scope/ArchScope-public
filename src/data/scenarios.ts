export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export interface ScenarioEndpoint {
  method: HttpMethod;
  path: string;
  description: string;
  samplePayloads: Record<string, unknown>[];
  sampleResponses: Record<string, unknown>[];
}

export interface ComponentDataFlow {
  nodeLabel: string;
  receives: string;
  processes: string;
  outputs: string;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  endpoints: ScenarioEndpoint[];
  componentDataFlows: Record<string, ComponentDataFlow>;
}

export interface LiveRequest {
  id: string;
  timestamp: number;
  method: HttpMethod;
  path: string;
  payload: Record<string, unknown> | null;
  status: 'pending' | 'in_flight' | 'success' | 'error';
  responseStatus?: number;
  response?: Record<string, unknown> | null;
  latencyMs?: number;
  hops: RequestHop[];
  warnings?: string[];
}

export interface RequestHop {
  nodeId: string;
  nodeLabel: string;
  componentType: string;
  action: string;
  dataIn: unknown;
  dataOut: unknown;
  latencyMs: number;
  timestamp: number;
  status?: 'ok' | 'rate_limited';
}

// --------------- Scenario definitions ---------------

const URL_SHORTENER_PAYLOADS = [
  { long_url: 'https://www.amazon.com/dp/B09V3KXJPB/ref=cm_sw_r_cp_api_i_dl_XXXXXX?encoding=UTF8&psc=1' },
  { long_url: 'https://stackoverflow.com/questions/218384/what-is-a-nullpointerexception-and-how-do-i-fix-it' },
  { long_url: 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms/edit#gid=0' },
  { long_url: 'https://github.com/vercel/next.js/tree/canary/packages/create-next-app' },
  { long_url: 'https://medium.com/@johndoe/understanding-system-design-interviews-a-comprehensive-guide-2024-abc123def456' },
  { long_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf&index=1' },
];

const URL_SHORTENER_RESPONSES = [
  { short_url: 'https://short.ly/a8Kd2x', original_url: 'https://www.amazon.com/dp/B09V3KXJPB/...', created_at: '2024-03-15T10:30:00Z', expires_at: '2025-03-15T10:30:00Z' },
  { short_url: 'https://short.ly/bQ9m4z', original_url: 'https://stackoverflow.com/questions/...', created_at: '2024-03-15T10:30:01Z', expires_at: '2025-03-15T10:30:01Z' },
  { short_url: 'https://short.ly/cR1n7w', original_url: 'https://docs.google.com/spreadsheets/...', created_at: '2024-03-15T10:30:02Z', expires_at: '2025-03-15T10:30:02Z' },
  { short_url: 'https://short.ly/dT5p3v', original_url: 'https://github.com/vercel/next.js/...', created_at: '2024-03-15T10:30:03Z', expires_at: '2025-03-15T10:30:03Z' },
  { short_url: 'https://short.ly/eU8q6y', original_url: 'https://medium.com/@johndoe/...', created_at: '2024-03-15T10:30:04Z', expires_at: '2025-03-15T10:30:04Z' },
  { short_url: 'https://short.ly/fV2r9x', original_url: 'https://www.youtube.com/watch?v=...', created_at: '2024-03-15T10:30:05Z', expires_at: '2025-03-15T10:30:05Z' },
];

const YOUTUBE_UPLOAD_PAYLOADS = [
  { title: 'How to Build a URL Shortener', description: 'Full system design tutorial', file_size_mb: 450, resolution: '1080p', duration_seconds: 1200 },
  { title: 'React 19 New Features', description: 'Deep dive into React 19', file_size_mb: 320, resolution: '4K', duration_seconds: 900 },
  { title: 'Cooking Pasta from Scratch', description: 'Italian recipe', file_size_mb: 180, resolution: '720p', duration_seconds: 600 },
  { title: 'Morning Workout Routine', description: '30-minute full body', file_size_mb: 550, resolution: '1080p', duration_seconds: 1800 },
];

const YOUTUBE_UPLOAD_RESPONSES = [
  { video_id: 'vid_a8Kd2x', status: 'processing', upload_url: 's3://uploads/vid_a8Kd2x.mp4', thumbnail_url: 'https://cdn.yt/thumb/a8Kd2x.jpg', transcode_job_id: 'tc_001' },
  { video_id: 'vid_bQ9m4z', status: 'processing', upload_url: 's3://uploads/vid_bQ9m4z.mp4', thumbnail_url: 'https://cdn.yt/thumb/bQ9m4z.jpg', transcode_job_id: 'tc_002' },
  { video_id: 'vid_cR1n7w', status: 'processing', upload_url: 's3://uploads/vid_cR1n7w.mp4', thumbnail_url: 'https://cdn.yt/thumb/cR1n7w.jpg', transcode_job_id: 'tc_003' },
  { video_id: 'vid_dT5p3v', status: 'processing', upload_url: 's3://uploads/vid_dT5p3v.mp4', thumbnail_url: 'https://cdn.yt/thumb/dT5p3v.jpg', transcode_job_id: 'tc_004' },
];

const CHAT_APP_PAYLOADS = [
  { sender_id: 'user_101', receiver_id: 'user_202', message: 'Hey, are you free for lunch?', type: 'text' },
  { sender_id: 'user_202', receiver_id: 'user_101', message: 'Sure! 12:30 works for me', type: 'text' },
  { sender_id: 'user_303', receiver_id: 'user_101', message: 'Check out this link: https://example.com', type: 'text' },
  { sender_id: 'user_101', receiver_id: 'group_50', message: 'Meeting moved to 3pm', type: 'group_text' },
];

const CHAT_APP_RESPONSES = [
  { message_id: 'msg_001', status: 'delivered', timestamp: '2024-03-15T12:00:00Z', read: false },
  { message_id: 'msg_002', status: 'delivered', timestamp: '2024-03-15T12:00:05Z', read: false },
  { message_id: 'msg_003', status: 'delivered', timestamp: '2024-03-15T12:01:00Z', read: false },
  { message_id: 'msg_004', status: 'sent', timestamp: '2024-03-15T12:02:00Z', delivered_to: 15 },
];

const ECOMMERCE_PAYLOADS_SEARCH = [
  { query: 'wireless headphones', category: 'electronics', page: 1, limit: 20 },
  { query: 'running shoes', category: 'sports', page: 1, limit: 20 },
  { query: 'organic coffee beans', category: 'grocery', page: 1, limit: 20 },
];

const ECOMMERCE_RESPONSES_SEARCH = [
  { total: 1523, items: [{ id: 'prod_001', name: 'Sony WH-1000XM5', price: 348.00, rating: 4.7, in_stock: true }, { id: 'prod_002', name: 'AirPods Pro 2', price: 249.00, rating: 4.8, in_stock: true }] },
  { total: 842, items: [{ id: 'prod_010', name: 'Nike Air Zoom Pegasus 40', price: 129.99, rating: 4.5, in_stock: true }, { id: 'prod_011', name: 'Adidas Ultraboost 23', price: 189.99, rating: 4.6, in_stock: false }] },
  { total: 256, items: [{ id: 'prod_020', name: 'Lavazza Super Crema', price: 18.99, rating: 4.4, in_stock: true }, { id: 'prod_021', name: 'Blue Bottle Blend', price: 22.50, rating: 4.9, in_stock: true }] },
];

const ECOMMERCE_PAYLOADS_ORDER = [
  { user_id: 'u_501', items: [{ product_id: 'prod_001', qty: 1 }, { product_id: 'prod_021', qty: 2 }], shipping_address: '123 Main St, NYC', payment_method: 'card_ending_4242' },
];

const ECOMMERCE_RESPONSES_ORDER = [
  { order_id: 'ord_8a7b', status: 'confirmed', total: 393.99, estimated_delivery: '2024-03-20', items: 3 },
];

export const SCENARIOS: Scenario[] = [
  {
    id: 'Url Shortener',
    name: 'URL Shortener',
    description: 'Shorten long URLs and redirect via short codes',
    endpoints: [
      {
        method: 'POST',
        path: '/api/shorten',
        description: 'Create a short URL from a long URL',
        samplePayloads: URL_SHORTENER_PAYLOADS,
        sampleResponses: URL_SHORTENER_RESPONSES,
      },
      {
        method: 'GET',
        path: '/api/resolve/{shortCode}',
        description: 'Resolve a short URL to the original long URL',
        samplePayloads: [
          { shortCode: 'a8Kd2x' },
          { shortCode: 'bQ9m4z' },
          { shortCode: 'cR1n7w' },
        ],
        sampleResponses: [
          { original_url: 'https://www.amazon.com/dp/B09V3KXJPB/ref=cm_sw_r_cp_api_i_dl_XXXXXX?encoding=UTF8&psc=1', clicks: 1452, created_at: '2024-03-15T10:30:00Z' },
          { original_url: 'https://stackoverflow.com/questions/218384/what-is-a-nullpointerexception-and-how-do-i-fix-it', clicks: 892, created_at: '2024-03-15T10:30:01Z' },
          { original_url: 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms/edit#gid=0', clicks: 237, created_at: '2024-03-15T10:30:02Z' },
        ],
      },
    ],
    componentDataFlows: {
      client: { nodeLabel: 'Client', receives: 'User types a long URL', processes: 'Sends POST /api/shorten with {long_url}', outputs: 'Displays short URL to user' },
      dns: { nodeLabel: 'DNS', receives: 'short.ly domain lookup', processes: 'Resolves short.ly → load balancer IP', outputs: 'IP: 54.23.112.8' },
      load_balancer: { nodeLabel: 'Load Balancer', receives: 'HTTP request', processes: 'Round-robin to API server instances', outputs: 'Forwards to API server #2' },
      api_server: { nodeLabel: 'API Server', receives: 'POST {long_url}', processes: 'Generate short code via base62(MD5(url)[:7]), check uniqueness', outputs: '{short_url, short_code}' },
      cache: { nodeLabel: 'Cache', receives: 'GET shortCode:a8Kd2x', processes: 'Lookup in Redis hash map', outputs: 'HIT → original_url or MISS → query DB' },
      database: { nodeLabel: 'Database', receives: 'INSERT/SELECT url_mappings', processes: 'Store: short_code, original_url, created_at, clicks', outputs: 'Row: {a8Kd2x, https://www.amazon..., 1452}' },
    },
  },
  {
    id: 'youtube-uploader',
    name: 'YouTube Video Upload',
    description: 'Upload, transcode, and serve video content',
    endpoints: [
      {
        method: 'POST',
        path: '/api/upload',
        description: 'Upload a new video with metadata',
        samplePayloads: YOUTUBE_UPLOAD_PAYLOADS,
        sampleResponses: YOUTUBE_UPLOAD_RESPONSES,
      },
      {
        method: 'GET',
        path: '/api/video/{videoId}',
        description: 'Get video metadata and streaming URLs',
        samplePayloads: [{ videoId: 'vid_a8Kd2x' }, { videoId: 'vid_bQ9m4z' }],
        sampleResponses: [
          { video_id: 'vid_a8Kd2x', title: 'How to Build a URL Shortener', status: 'ready', views: 15420, streams: { '720p': 'https://cdn.yt/vid_a8Kd2x/720p.m3u8', '1080p': 'https://cdn.yt/vid_a8Kd2x/1080p.m3u8' } },
          { video_id: 'vid_bQ9m4z', title: 'React 19 New Features', status: 'ready', views: 8901, streams: { '720p': 'https://cdn.yt/vid_bQ9m4z/720p.m3u8', '4K': 'https://cdn.yt/vid_bQ9m4z/4k.m3u8' } },
        ],
      },
    ],
    componentDataFlows: {
      client: { nodeLabel: 'User', receives: 'User selects video file', processes: 'Uploads file via multipart POST', outputs: 'Video file + metadata' },
      load_balancer: { nodeLabel: 'Load Balancer', receives: 'Multipart upload request', processes: 'Route to least-loaded API server', outputs: 'Forward to API server' },
      api_server: { nodeLabel: 'API Server', receives: 'Video file + metadata', processes: 'Validate, generate video_id, store metadata, queue transcode', outputs: '{video_id, upload_url}' },
      storage: { nodeLabel: 'Original Storage', receives: 'Raw video file (450MB)', processes: 'Store as s3://uploads/vid_a8Kd2x.mp4', outputs: 'S3 object key' },
      cache: { nodeLabel: 'Metadata Cache', receives: 'GET vid_a8Kd2x metadata', processes: 'Redis hash: {title, status, views}', outputs: 'Cached metadata or MISS' },
      database: { nodeLabel: 'Metadata DB', receives: 'INSERT video metadata', processes: 'Store: video_id, title, status, resolutions, views', outputs: 'Row inserted' },
      transcoder: { nodeLabel: 'Transcoder', receives: 's3://uploads/vid_a8Kd2x.mp4', processes: 'FFmpeg: 720p, 1080p, 4K adaptive bitrate', outputs: 'Transcoded files → transcoded storage' },
      message_queue: { nodeLabel: 'Completion Queue', receives: '{video_id, status: done}', processes: 'SQS message enqueued', outputs: 'Worker picks up message' },
      worker: { nodeLabel: 'Completion Handler', receives: '{video_id, transcode_status}', processes: 'Update DB status, generate thumbnails, notify user', outputs: 'Video ready notification' },
      cdn: { nodeLabel: 'CDN', receives: 'GET /vid_a8Kd2x/1080p.m3u8', processes: 'Edge cache lookup, origin pull if miss', outputs: 'HLS stream to user' },
    },
  },
  {
    id: 'chat-app',
    name: 'Real-time Chat',
    description: 'Send and receive messages in real-time',
    endpoints: [
      {
        method: 'POST',
        path: '/api/message',
        description: 'Send a chat message',
        samplePayloads: CHAT_APP_PAYLOADS,
        sampleResponses: CHAT_APP_RESPONSES,
      },
      {
        method: 'GET',
        path: '/api/messages/{conversationId}',
        description: 'Get conversation history',
        samplePayloads: [{ conversationId: 'conv_101_202' }],
        sampleResponses: [
          { conversation_id: 'conv_101_202', messages: [{ id: 'msg_001', sender: 'user_101', text: 'Hey, are you free for lunch?', ts: '12:00' }, { id: 'msg_002', sender: 'user_202', text: 'Sure! 12:30 works for me', ts: '12:00' }] },
        ],
      },
    ],
    componentDataFlows: {
      client: { nodeLabel: 'Chat Client', receives: 'User types message', processes: 'WebSocket send {sender, receiver, message}', outputs: 'Message delivered indicator' },
      load_balancer: { nodeLabel: 'Load Balancer', receives: 'WebSocket connection', processes: 'Sticky session to WS server', outputs: 'Persistent connection' },
      api_server: { nodeLabel: 'WebSocket Server', receives: '{sender, receiver, message}', processes: 'Validate, fan-out to recipient connections', outputs: 'Deliver to online recipients' },
      cache: { nodeLabel: 'Session Cache', receives: 'GET user:101:sessions', processes: 'Redis set of active WS server IDs', outputs: '{ws_server_2, ws_server_5}' },
      database: { nodeLabel: 'Message DB', receives: 'INSERT message', processes: 'Partition by conversation_id, append message', outputs: 'Row: {msg_001, user_101, "Hey...", 12:00}' },
      message_queue: { nodeLabel: 'Message Broker', receives: '{msg_001, target: user_202}', processes: 'Kafka topic: messages.user_202', outputs: 'Consumer delivers to target WS server' },
      notification_service: { nodeLabel: 'Push Notifications', receives: '{user_202, "New message from user_101"}', processes: 'FCM/APNS push', outputs: 'Push notification sent' },
    },
  },
  {
    id: 'ecommerce',
    name: 'E-Commerce',
    description: 'Search products and place orders',
    endpoints: [
      {
        method: 'GET',
        path: '/api/search',
        description: 'Search product catalog',
        samplePayloads: ECOMMERCE_PAYLOADS_SEARCH,
        sampleResponses: ECOMMERCE_RESPONSES_SEARCH,
      },
      {
        method: 'POST',
        path: '/api/order',
        description: 'Place an order',
        samplePayloads: ECOMMERCE_PAYLOADS_ORDER,
        sampleResponses: ECOMMERCE_RESPONSES_ORDER,
      },
    ],
    componentDataFlows: {
      client: { nodeLabel: 'Shopper', receives: 'User searches "wireless headphones"', processes: 'GET /api/search?q=wireless+headphones', outputs: 'Display product grid' },
      cdn: { nodeLabel: 'CDN', receives: 'GET /images/prod_001.jpg', processes: 'Edge cache lookup', outputs: 'Product image (85KB)' },
      load_balancer: { nodeLabel: 'Load Balancer', receives: 'Search/order request', processes: 'Route based on path: /search → search cluster, /order → order cluster', outputs: 'Forward to correct service' },
      api_server: { nodeLabel: 'API Gateway', receives: 'GET /search?q=wireless+headphones', processes: 'Parse query, check cache, query catalog DB, rank results', outputs: '{total: 1523, items: [...]}' },
      cache: { nodeLabel: 'Product Cache', receives: 'GET cache:search:wireless_headphones', processes: 'Redis sorted set with product scores', outputs: 'HIT → cached results or MISS → query DB' },
      database: { nodeLabel: 'Catalog DB', receives: 'SELECT * FROM products WHERE ...', processes: 'Full-text search with relevance scoring', outputs: '1523 matching products' },
      message_queue: { nodeLabel: 'Order Queue', receives: '{order_id: ord_8a7b, items: [...]}', processes: 'SQS FIFO queue, dedup by order_id', outputs: 'Order processor picks up' },
      worker: { nodeLabel: 'Order Processor', receives: '{ord_8a7b}', processes: 'Validate inventory, charge payment, reserve stock', outputs: '{status: confirmed, total: $393.99}' },
      storage: { nodeLabel: 'Image Storage', receives: 'GET prod_001.jpg', processes: 'S3 object retrieval', outputs: 'Image binary (85KB)' },
    },
  },
];

export function getScenarioById(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id);
}

export function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
