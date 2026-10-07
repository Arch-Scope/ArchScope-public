import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

function SmokeTestComponent() {
  return <h1>Vitest is ready</h1>
}

describe('test setup', () => {
  it('renders a React component and provides jest-dom matchers', () => {
    render(<SmokeTestComponent />)

    expect(screen.getByRole('heading', { name: 'Vitest is ready' })).toBeInTheDocument()
  })
})
