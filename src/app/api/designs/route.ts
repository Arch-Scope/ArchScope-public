import { getUserFromRequest } from '@/backend/utils/auth';
import { prisma } from '@/backend/utils/db';
import { parseJsonRequest, rateLimitRequest } from '@/backend/utils/api-security';
import { z } from 'zod';

const designRequestSchema = z.object({
  name: z.string().trim().min(1).max(120),
  nodes: z.array(z.record(z.string(), z.json())).max(100),
  edges: z.array(z.record(z.string(), z.json())).max(300),
}).strict();

export async function POST(req: Request) {
  const ipLimited = rateLimitRequest(req, 'designs-ip', 120, 60_000);
  if (ipLimited) return ipLimited;

  const user = getUserFromRequest(req);

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userLimited = rateLimitRequest(req, 'designs-user', 60, 60_000, user.userId);
  if (userLimited) return userLimited;

  const parsed = await parseJsonRequest(req, designRequestSchema, 1_048_576);
  if (!parsed.ok) return parsed.response;

  try {
    const design = await prisma.design.create({
      data: {
        ...parsed.data,
        userId: user.userId,
      },
    });

    return Response.json({ design });
  } catch (error) {
    console.error('Design creation failed', error);
    return Response.json({ error: 'Unable to create design' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const ipLimited = rateLimitRequest(req, 'designs-ip', 120, 60_000);
  if (ipLimited) return ipLimited;

  const user = getUserFromRequest(req);

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userLimited = rateLimitRequest(req, 'designs-user', 60, 60_000, user.userId);
  if (userLimited) return userLimited;

  try {
    const designs = await prisma.design.findMany({
      where: { userId: user.userId },
      orderBy: { createdAt: 'desc' },
    });

    return Response.json({ designs });
  } catch (error) {
    console.error('Design listing failed', error);
    return Response.json({ error: 'Unable to list designs' }, { status: 500 });
  }
}
