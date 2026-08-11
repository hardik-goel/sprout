// The blank-white-screen guard. This app can be installed as a PWA, where a
// render crash leaves no browser chrome to retry from — so the boundary has to
// put a way out on the screen itself.

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ErrorBoundary } from '../ErrorBoundary'

function Boom(): JSX.Element {
  throw new Error('kaboom')
}

describe('ErrorBoundary', () => {
  // React logs caught errors; that noise is expected here, not a signal.
  beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => {}))
  afterEach(() => vi.restoreAllMocks())

  it('renders its children when nothing is wrong', () => {
    render(
      <ErrorBoundary>
        <p>all good</p>
      </ErrorBoundary>,
    )
    expect(screen.getByText('all good')).toBeInTheDocument()
  })

  it('shows a recoverable screen instead of a blank page', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    )
    expect(screen.getByText('Something broke')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Back to home/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Reset the app data/ })).toBeInTheDocument()
    // The message helps a bug report; the stack would just be a wall.
    expect(screen.getByText('kaboom')).toBeInTheDocument()
  })

  it('reassures the parent that points are not lost', () => {
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    )
    expect(screen.getByText(/points are saved/i)).toBeInTheDocument()
  })

  it('clears only Sprout keys when reseeding, not the whole origin', async () => {
    const user = userEvent.setup()
    localStorage.setItem('sprout.appData.v2', '{}')
    localStorage.setItem('sprout.photo.x', 'data:')
    localStorage.setItem('someone.elses.key', 'keep me')

    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    )
    await user.click(screen.getByRole('button', { name: /Reset the app data/ }))

    expect(localStorage.getItem('sprout.appData.v2')).toBeNull()
    expect(localStorage.getItem('sprout.photo.x')).toBeNull()
    expect(localStorage.getItem('someone.elses.key')).toBe('keep me')
  })
})
