import { z } from 'zod';

type ParsedJson<T> =
  | { ok: true; data: T }
  | { ok: false; response: Response };

export async function parseJsonRequest<T extends z.ZodType>(
  request: Request,
  schema: T,
  maxBytes: number,
): Promise<ParsedJson<z.infer<T>>> {
  const contentType = request.headers.get('content-type')?.split(';', 1)[0].trim().toLowerCase();
  if (contentType !== 'application/json') {
    return {
      ok: false,
      response: Response.json({ error: 'Content-Type must be application/json' }, { status: 415 }),
    };
  }

  const declaredLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    return {
      ok: false,
      response: Response.json({ error: 'Request body too large' }, { status: 413 }),
    };
  }

  if (!request.body) {
    return {
      ok: false,
      response: Response.json({ error: 'Invalid request body' }, { status: 400 }),
    };
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        return {
          ok: false,
          response: Response.json({ error: 'Request body too large' }, { status: 413 }),
        };
      }
      chunks.push(value);
    }
  } catch {
    return {
      ok: false,
      response: Response.json({ error: 'Invalid request body' }, { status: 400 }),
    };
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  let json: unknown;
  try {
    json = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return {
      ok: false,
      response: Response.json({ error: 'Invalid JSON body' }, { status: 400 }),
    };
  }

  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    return {
      ok: false,
      response: Response.json({ error: 'Invalid request body' }, { status: 400 }),
    };
  }

  return { ok: true, data: parsed.data };
}

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const MAX_RATE_LIMIT_BUCKETS = 10_000;
const globalState = globalThis as typeof globalThis & {
  __archscopeApiRateLimitBuckets?: Map<string, RateLimitBucket>;
  __archscopeApiRateLimitLastCleanup?: number;
};
const buckets = (globalState.__archscopeApiRateLimitBuckets ??= new Map());

/**
 * Process-local protection for public endpoints. Production deployments with
 * multiple instances should also enforce a shared limit at the edge.
 */
export function rateLimitRequest(
  request: Request,
  scope: string,
  limit: number,
  windowMs: number,
  identity?: string,
): Response | null {
  const now = Date.now();
  const lastCleanup = globalState.__archscopeApiRateLimitLastCleanup ?? 0;
  if (now - lastCleanup >= windowMs) {
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
    globalState.__archscopeApiRateLimitLastCleanup = now;
  }

  const forwardedFor = request.headers.get('x-forwarded-for');
  const proxyIp = request.headers.get('x-real-ip') ??
    forwardedFor?.split(',').at(-1)?.trim();
  const client = identity ?? proxyIp ?? 'unknown-client';
  const key = `${scope}:${client}`;
  let bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    if (buckets.size >= MAX_RATE_LIMIT_BUCKETS) {
      const oldestKey = buckets.keys().next().value;
      if (oldestKey) buckets.delete(oldestKey);
    }
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }

  bucket.count += 1;
  if (bucket.count <= limit) return null;

  const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
  return Response.json(
    { error: 'Too many requests. Please try again later.' },
    { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
  );
}
