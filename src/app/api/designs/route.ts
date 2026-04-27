import { getUserFromRequest } from '@/backend/utils/auth';
import { prisma } from '@/backend/utils/db';

export async function POST(req: Request) {
  const user = getUserFromRequest(req);

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { name, nodes, edges } = body;

  const design = await prisma.design.create({
    data: {
      name,
      nodes,
      edges,
      userId: user.userId,
    },
  });

  return Response.json({ design });
}

export async function GET(req: Request) {
  const user = getUserFromRequest(req);

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const designs = await prisma.design.findMany({
    where: { userId: user.userId },
    orderBy: { createdAt: 'desc' },
  });

  return Response.json({ designs });
}