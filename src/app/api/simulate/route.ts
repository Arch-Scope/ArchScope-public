import { runSimulation } from '@/backend/controllers/simulation';
import { parseJsonRequest, rateLimitRequest } from '@/backend/utils/api-security';
import { SCENARIOS } from '@/data';
import { z } from 'zod';

const simulationNodeSchema = z.object({
  id: z.string().min(1).max(100),
  label: z.string().max(200).optional(),
  componentType: z.string().min(1).max(64),
  rateLimitAlgorithm: z.enum(['token_bucket', 'fixed_window', 'sliding_window', 'leaky_bucket']).optional(),
  rateLimitBucketSize: z.number().finite().min(0).max(1_000_000).optional(),
  rateLimitRefillRate: z.number().finite().min(0).max(1_000_000).optional(),
  redisCounterTtlSeconds: z.number().int().min(1).max(86_400).optional(),
}).passthrough();

const simulationRequestSchema = z.object({
  scenarioId: z.string().min(1).max(100),
  endpointIndex: z.number().int().min(0).max(100),
  payloadIndex: z.number().int().min(0).max(100).optional(),
  graph: z.object({
    nodes: z.array(simulationNodeSchema).max(100),
    edges: z.array(z.object({
      source: z.string().min(1).max(100),
      target: z.string().min(1).max(100),
    }).passthrough()).max(300),
  }).strict(),
}).strict().superRefine((body, context) => {
  const scenario = SCENARIOS.find((candidate) => candidate.id === body.scenarioId);
  const endpoint = scenario?.endpoints[body.endpointIndex];
  if (!endpoint) {
    context.addIssue({ code: 'custom', path: ['endpointIndex'], message: 'Unknown scenario endpoint' });
    return;
  }
  if (body.payloadIndex !== undefined && body.payloadIndex >= endpoint.samplePayloads.length) {
    context.addIssue({ code: 'custom', path: ['payloadIndex'], message: 'Unknown sample payload' });
  }

  const nodeIds = new Set(body.graph.nodes.map((node) => node.id));
  for (const [index, edge] of body.graph.edges.entries()) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      context.addIssue({ code: 'custom', path: ['graph', 'edges', index], message: 'Edge references an unknown node' });
    }
  }
});

export async function POST(req: Request) {
  const limited = rateLimitRequest(req, 'simulate', 30, 60_000);
  if (limited) return limited;

  const parsed = await parseJsonRequest(req, simulationRequestSchema, 256 * 1024);
  if (!parsed.ok) return parsed.response;

  try {
    const response = await runSimulation(parsed.data);
    if (response.status >= 500) {
      return Response.json({ error: 'Simulation failed' }, { status: 500 });
    }
    return response;
  } catch (error) {
    console.error('Simulation route failed', error);
    return Response.json({ error: 'Simulation failed' }, { status: 500 });
  }
}
