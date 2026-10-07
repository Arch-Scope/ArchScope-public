import { NextRequest } from 'next/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { POST } from '../agent/route'

const originalApiKey = process.env.OPENAI_API_KEY

function request(body: unknown, ip = 'agent-test-client') {
  return new NextRequest('http://localhost/api/agent', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-real-ip': ip },
    body: JSON.stringify(body),
  })
}

const validRequest = {
  sessionId: '08b9c73b-f41d-4ec2-8abe-21d41a8f7000',
  message: 'Design a simple web application',
};

afterEach(() => {
  vi.restoreAllMocks()
  if (originalApiKey === undefined) delete process.env.OPENAI_API_KEY
  else process.env.OPENAI_API_KEY = originalApiKey
})

describe('POST /api/agent security', () => {
  it('rejects invalid agent input before invoking the model', async () => {
    const response = await POST(request({ ...validRequest, message: '   ' }))

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'Invalid request body' })
  })

  it('returns a sanitized unavailable response when the provider key is absent', async () => {
    process.env.OPENAI_API_KEY = ''

    const response = await POST(request(validRequest, 'agent-no-key-client'))

    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ error: 'Agent service is temporarily unavailable' })
  })

  it('limits repeated provider-backed requests per client', async () => {
    process.env.OPENAI_API_KEY = ''
    const ip = 'agent-rate-limit-client'
    let response: Response | undefined

    for (let attempt = 0; attempt < 11; attempt += 1) {
      response = await POST(request(validRequest, ip))
    }

    expect(response?.status).toBe(429)
    expect(response?.headers.get('retry-after')).toBeTruthy()
  })
})
