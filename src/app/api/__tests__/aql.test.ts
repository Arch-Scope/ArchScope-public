import { NextRequest } from 'next/server'
import { describe, expect, it } from 'vitest'
import { POST } from '../aql/route'

function request(body: unknown, ip = 'aql-test-client') {
  return new NextRequest('http://localhost/api/aql', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-real-ip': ip },
    body: JSON.stringify(body),
  })
}

describe('POST /api/aql security', () => {
  it('accepts a valid bounded command', async () => {
    const response = await POST(request({ command: 'show services' }))

    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ message: 'Successfully received AQL command: "show services"' })
  })

  it('rejects empty and overlong commands', async () => {
    const empty = await POST(request({ command: '  ' }))
    const long = await POST(request({ command: 'x'.repeat(2_001) }))

    expect(empty.status).toBe(400)
    expect(long.status).toBe(400)
  })

  it('rejects an oversized request body before parsing JSON', async () => {
    const oversized = new NextRequest('http://localhost/api/aql', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'content-length': '9000' },
      body: JSON.stringify({ command: 'show services' }),
    })

    const response = await POST(oversized)
    expect(response.status).toBe(413)
  })

  it('rejects simple cross-origin form content types', async () => {
    const formEncoded = new NextRequest('http://localhost/api/aql', {
      method: 'POST',
      headers: { 'content-type': 'text/plain', 'x-real-ip': 'aql-csrf-client' },
      body: JSON.stringify({ command: 'show services' }),
    })

    const response = await POST(formEncoded)
    expect(response.status).toBe(415)
  })
})
