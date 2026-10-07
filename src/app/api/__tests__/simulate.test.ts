import { NextRequest } from 'next/server'
import { describe, expect, it } from 'vitest'
import { POST } from '../simulate/route'

const validSimulation = {
  scenarioId: 'Url Shortener',
  endpointIndex: 0,
  payloadIndex: 0,
  graph: {
    nodes: [
      { id: 'client', label: 'Client', componentType: 'client' },
      { id: 'api', label: 'API', componentType: 'api_server' },
    ],
    edges: [{ source: 'client', target: 'api' }],
  },
}

function request(body: unknown) {
  return new NextRequest('http://localhost/api/simulate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/simulate', () => {
  it('returns a successful simulation for a valid request', async () => {
    const response = await POST(request(validSimulation))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.statusCode).toBe(200)
    expect(body.request.path).toBe('/api/shorten')
    expect(body.hops).toHaveLength(2)
  })

  it('rejects an unknown scenario before calling the simulation controller', async () => {
    const response = await POST(request({ ...validSimulation, scenarioId: 'missing' }))

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'Invalid request body' })
  })

  it('returns an invalid architecture result for a disconnected graph', async () => {
    const response = await POST(request({
      ...validSimulation,
      graph: { nodes: [{ id: 'only', componentType: 'client' }], edges: [] },
    }))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toMatchObject({ error: 'Invalid architecture', hops: [], totalLatencyMs: 0 })
  })

  it('rejects malformed JSON before invoking the simulation controller', async () => {
    const malformed = new NextRequest('http://localhost/api/simulate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{invalid',
    })

    const response = await POST(malformed)
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'Invalid JSON body' })
  })
})
