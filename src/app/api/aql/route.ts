import { NextResponse } from 'next/server';
import { parseJsonRequest, rateLimitRequest } from '@/backend/utils/api-security';
import { z } from 'zod';

const aqlRequestSchema = z.object({
  command: z.string().trim().min(1).max(2_000),
}).strict();

export async function POST(req: Request) {
  try {
    const limited = rateLimitRequest(req, 'aql', 60, 60_000);
    if (limited) return limited;

    const parsed = await parseJsonRequest(req, aqlRequestSchema, 8 * 1024);
    if (!parsed.ok) return parsed.response;
    const { command } = parsed.data;

    // MVP: For now, we simply echo the command and acknowledge receipt.
    // Future: This is where we will parse the AQL command, update DB, or pass it to an LLM.
    
    return NextResponse.json({
      message: `Successfully received AQL command: "${command}"`,
      data: null,
    }, { status: 200 });

  } catch (error) {
    console.error('AQL request failed', error);
    return NextResponse.json(
      { error: 'An error occurred while processing the command' },
      { status: 500 }
    );
  }
}
