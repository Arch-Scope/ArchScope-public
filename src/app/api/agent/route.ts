import { NextResponse } from 'next/server';
import { buildAgentGraph } from '@/lib/agent/graph';
import { CanvasNode, CanvasEdge } from '@/lib/agent/state';
import { parseJsonRequest, rateLimitRequest } from '@/backend/utils/api-security';
import { z } from 'zod';

const nodeSchema = z.object({
  id: z.string().min(1).max(100),
  label: z.string().max(200).optional(),
  componentType: z.string().min(1).max(64),
  config: z.record(z.string(), z.json()).optional(),
}).strict();

const edgeSchema = z.object({
  source: z.string().min(1).max(100),
  target: z.string().min(1).max(100),
  animated: z.boolean().optional(),
}).strict();

const agentRequestSchema = z.object({
  sessionId: z.string().uuid(),
  message: z.string().trim().min(1).max(4_000),
  currentNodes: z.array(nodeSchema).max(100).default([]),
  currentEdges: z.array(edgeSchema).max(300).default([]),
}).strict().superRefine((body, context) => {
  const nodeIds = new Set(body.currentNodes.map((node) => node.id));
  for (const [index, edge] of body.currentEdges.entries()) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      context.addIssue({
        code: 'custom',
        path: ['currentEdges', index],
        message: 'Edges must reference nodes in the request',
      });
    }
  }
});

/**
 * POST /api/agent
 *
 * Invokes the LangGraph agent to analyze the user's message and either
 * return clarifying questions or generate AQL commands for building
 * an architecture on the canvas.
 */
export async function POST(req: Request) {
  try {
    const limited = rateLimitRequest(req, 'agent', 10, 60_000);
    if (limited) return limited;

    const parsed = await parseJsonRequest(req, agentRequestSchema, 256 * 1024);
    if (!parsed.ok) return parsed.response;
    const { sessionId, message, currentNodes, currentEdges } = parsed.data;

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'Agent service is temporarily unavailable' },
        { status: 503 }
      );
    }

    // Map frontend node/edge shapes to agent state types
    const nodes: CanvasNode[] = currentNodes.map((n) => ({
      id: n.id,
      label: n.label || n.id,
      componentType: n.componentType,
      config: n.config || {},
    }));

    const edges: CanvasEdge[] = currentEdges.map((e) => ({
      source: e.source,
      target: e.target,
      animated: e.animated || false,
    }));

    // Build and invoke the LangGraph agent
    const graph = buildAgentGraph();

    const result = await graph.invoke({
      userPrompt: message,
      sessionId: sessionId || 'default',
      currentNodes: nodes,
      currentEdges: edges,
    });

    // Route response based on the agent's decision
    if (result.decision === 'clarify') {
      return NextResponse.json({
        type: 'clarification',
        questions: result.clarificationQuestions,
        summary: result.clarificationSummary,
        requirements: result.requirements,
      });
    }

    // decision === 'execute'
    return NextResponse.json({
      type: 'execution',
      commands: result.aqlCommands,
      explanation: result.explanation,
      requirements: result.requirements,
    });
  } catch {
    console.error('Agent API request failed');
    return NextResponse.json(
      { error: 'An error occurred while processing the agent request' },
      { status: 500 },
    );
  }
}
