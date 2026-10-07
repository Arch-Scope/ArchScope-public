import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { login, register, forgotPassword, resetPassword } = vi.hoisted(() => ({
  login: vi.fn(),
  register: vi.fn(),
  forgotPassword: vi.fn(),
  resetPassword: vi.fn(),
}))

vi.mock('@/backend/services/auth', () => ({
  authService: { login, register, forgotPassword, resetPassword },
}))

import { POST } from '../auth/route'

function request(body: unknown) {
  return new NextRequest('http://localhost/api/auth', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/auth', () => {
  beforeEach(() => vi.clearAllMocks())

  it('logs in with valid credentials and returns the controller response', async () => {
    login.mockResolvedValue({ token: 'jwt-token' })

    const response = await POST(request({ action: 'login', email: 'person@example.com', password: 'secret' }))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ token: 'jwt-token' })
    expect(login).toHaveBeenCalledWith({ email: 'person@example.com', password: 'secret' })
  })

  it('validates login input and returns 400 for invalid credentials shape', async () => {
    const response = await POST(request({ action: 'login', email: 'not-an-email', password: '' }))

    expect(response.status).toBe(400)
    expect(await response.json()).toHaveProperty('error')
    expect(login).not.toHaveBeenCalled()
  })

  it('registers a user with valid registration fields', async () => {
    register.mockResolvedValue({ user: { id: 'user-1' } })

    const response = await POST(request({
      action: 'register',
      username: 'person',
      email: 'person@example.com',
      password: 'StrongPass1!',
    }))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ user: { id: 'user-1' } })
    expect(register).toHaveBeenCalledWith({ username: 'person', email: 'person@example.com', password: 'StrongPass1!' })
  })

  it('requires an action and rejects unsupported actions', async () => {
    const missing = await POST(request({ email: 'person@example.com' }))
    const unsupported = await POST(request({ action: 'delete-account' }))

    expect(missing.status).toBe(400)
    expect(await missing.json()).toEqual({ error: 'Action required' })
    expect(unsupported.status).toBe(400)
    expect(await unsupported.json()).toEqual({ error: 'Invalid action' })
  })

  it('handles forgot-password and reset-password actions', async () => {
    forgotPassword.mockResolvedValue({ message: 'If an account exists, we sent a link.' })
    resetPassword.mockResolvedValue({ message: 'Password reset.' })

    const forgot = await POST(request({ action: 'forgot-password', email: 'person@example.com' }))
    const reset = await POST(request({ action: 'reset-password', token: 'user.token', newPassword: 'new-secret' }))

    expect(forgot.status).toBe(200)
    expect(reset.status).toBe(200)
    expect(forgotPassword).toHaveBeenCalledWith('person@example.com')
    expect(resetPassword).toHaveBeenCalledWith({ token: 'user.token', newPassword: 'new-secret' })
  })

  it('converts controller service errors to client errors', async () => {
    login.mockRejectedValue(new Error('service unavailable'))

    const response = await POST(request({ action: 'login', email: 'person@example.com', password: 'secret' }))

    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'service unavailable' })
  })

  it('rejects malformed JSON', async () => {
    const malformed = new NextRequest('http://localhost/api/auth', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{invalid',
    })

    await expect(POST(malformed)).rejects.toThrow()
  })
})
