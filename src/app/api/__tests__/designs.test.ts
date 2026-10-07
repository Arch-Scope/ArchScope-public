import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getUserFromRequest, create, findMany } = vi.hoisted(() => ({
  getUserFromRequest: vi.fn(),
  create: vi.fn(),
  findMany: vi.fn(),
}))

vi.mock('@/backend/utils/auth', () => ({ getUserFromRequest }))
vi.mock('@/backend/utils/db', () => ({ prisma: { design: { create, findMany } } }))

import { GET, POST } from '../designs/route'

const user = { userId: 'user-123', email: 'person@example.com' }

function request(method: 'GET' | 'POST', body?: unknown, authorization?: string) {
  return new NextRequest('http://localhost/api/designs', {
    method,
    headers: {
      ...(body === undefined ? {} : { 'content-type': 'application/json' }),
      ...(authorization ? { authorization } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
}

describe('/api/designs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getUserFromRequest.mockReturnValue(user)
  })

  describe('POST', () => {
    it('creates and returns a design for the authenticated user', async () => {
      const design = { id: 'design-1', name: 'Shop', nodes: [], edges: [], userId: user.userId }
      create.mockResolvedValue(design)

      const response = await POST(request('POST', { name: 'Shop', nodes: [], edges: [] }, 'Bearer valid'))

      expect(response.status).toBe(200)
      expect(await response.json()).toEqual({ design })
      expect(create).toHaveBeenCalledWith({
        data: { name: 'Shop', nodes: [], edges: [], userId: user.userId },
      })
    })

    it('returns 401 and does not access storage without authentication', async () => {
      getUserFromRequest.mockReturnValue(null)

      const response = await POST(request('POST', { name: 'Private' }))

      expect(response.status).toBe(401)
      expect(await response.json()).toEqual({ error: 'Unauthorized' })
      expect(create).not.toHaveBeenCalled()
    })

    it('rejects invalid design payloads before writing to storage', async () => {
      const response = await POST(request('POST', { name: '', nodes: 'not-an-array', edges: [] }))

      expect(response.status).toBe(400)
      expect(await response.json()).toEqual({ error: 'Invalid request body' })
      expect(create).not.toHaveBeenCalled()
    })

    it('propagates database failures', async () => {
      create.mockRejectedValue(new Error('database unavailable'))

      const response = await POST(request('POST', { name: 'Shop', nodes: [], edges: [] }))
      expect(response.status).toBe(500)
      expect(await response.json()).toEqual({ error: 'Unable to create design' })
    })

    it('rejects malformed JSON for an authenticated request', async () => {
      const malformed = new NextRequest('http://localhost/api/designs', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{invalid',
      })

      const response = await POST(malformed)
      expect(response.status).toBe(400)
      expect(await response.json()).toEqual({ error: 'Invalid JSON body' })
    })
  })

  describe('GET', () => {
    it('lists only the authenticated user’s designs in reverse creation order', async () => {
      const designs = [{ id: 'design-1', name: 'Shop' }]
      findMany.mockResolvedValue(designs)

      const response = await GET(request('GET', undefined, 'Bearer valid'))

      expect(response.status).toBe(200)
      expect(await response.json()).toEqual({ designs })
      expect(findMany).toHaveBeenCalledWith({
        where: { userId: user.userId },
        orderBy: { createdAt: 'desc' },
      })
    })

    it('returns 401 and does not query storage without authentication', async () => {
      getUserFromRequest.mockReturnValue(null)

      const response = await GET(request('GET'))

      expect(response.status).toBe(401)
      expect(await response.json()).toEqual({ error: 'Unauthorized' })
      expect(findMany).not.toHaveBeenCalled()
    })

    it('propagates database failures', async () => {
      findMany.mockRejectedValue(new Error('database unavailable'))

      const response = await GET(request('GET'))
      expect(response.status).toBe(500)
      expect(await response.json()).toEqual({ error: 'Unable to list designs' })
    })
  })
})
