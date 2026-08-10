// Screen smoke tests: every route mounts and renders real seeded data, and the
// core loop (kid marks done → parent approves → points/garden/streak move)
// works end to end through the actual components.

import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from '@/App'
import { useStore } from '@/store'
import { balance, streakInfo, todayKey } from '@/domain'

function open(route: string) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <App />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  useStore.getState().resetAll()
})

describe('parent world', () => {
  const routes: [string, RegExp][] = [
    ['/parent', /Hi, Aanya/],
    ['/parent/tasks', /Task library/],
    ['/parent/rewards', /Reward menu/],
    ['/parent/insights', /Habit insights/],
    ['/parent/digest', /Weekly digest/],
    ['/parent/story', /Sunday family story/],
    ['/parent/album', /Growth album/],
    ['/parent/jars', /Save · Spend · Give/],
    ['/parent/circle', /Family circle/],
    ['/parent/gift', /Gift points/],
    ['/parent/children', /Children/],
    ['/parent/more', /Everything else/],
    ['/parent/upgrade', /Sprout Plus/],
    ['/parent/add-child', /Add a child/],
    ['/onboarding', /Kids do real tasks/],
  ]

  it.each(routes)('renders %s', (route, expected) => {
    open(route)
    expect(screen.getAllByText(expected).length).toBeGreaterThan(0)
  })

  it('shows the seeded family on the home screen', () => {
    open('/parent')
    // Vir appears twice: in the child switcher and in the hero.
    expect(screen.getAllByText('Vir').length).toBeGreaterThan(0)
    expect(screen.getByText('90')).toBeInTheDocument() // points
    expect(screen.getByText(/Zoo trip/)).toBeInTheDocument()
    expect(screen.getByText('5 days')).toBeInTheDocument() // streak
  })

  it('locks Plus screens on a free account and unlocks them with Plus', async () => {
    open('/parent/insights')
    expect(screen.getByText(/See what’s sticking/)).toBeInTheDocument()

    useStore.getState().setPlus(true)
    cleanupRender()
    open('/parent/insights')
    await waitFor(() => expect(screen.getByText(/Last 7 days · Vir/)).toBeInTheDocument())
    expect(screen.queryByText(/See what’s sticking/)).not.toBeInTheDocument()
  })

  it('keeps the growth album free — it is the hook, not the upsell', () => {
    open('/parent/album')
    expect(screen.queryByText(/Unlock with Plus/)).not.toBeInTheDocument()
    expect(screen.getByText(/moments/)).toBeInTheDocument()
  })
})

describe('kid world', () => {
  const routes: [string, RegExp][] = [
    ['/kid', /Today’s tasks/],
    ['/kid/jar', /My Jar/],
    ['/kid/garden', /My Garden/],
    ['/kid/rewards', /Rewards Shelf/],
  ]

  it.each(routes)('renders %s', (route, expected) => {
    open(route)
    expect(screen.getAllByText(expected).length).toBeGreaterThan(0)
  })

  it('shows only the active child’s rewards', () => {
    open('/kid/rewards')
    expect(screen.getByText('Zoo trip')).toBeInTheDocument()
    expect(screen.queryByText('Cricket bat')).not.toBeInTheDocument() // that's Ira's
  })
})

describe('the core loop', () => {
  it('kid marks a task done, parent approves, points and garden move', async () => {
    const user = userEvent.setup()
    const childId = 'child_vir'
    const before = balance(useStore.getState().data.ledger, childId)

    // Kid: pick the first task of the day and say "I did it!"
    open('/kid')
    const task = useStore
      .getState()
      .data.tasks.find((x) => x.childId === childId && x.date === todayKey() && x.status === 'todo')!
    await user.click(screen.getByText(task.title))
    await user.click(await screen.findByText('I did it!'))

    await waitFor(() =>
      expect(useStore.getState().data.tasks.find((x) => x.id === task.id)!.status).toBe('pending'),
    )
    cleanupRender()

    // Parent: approve it.
    open(`/parent/approve/${task.id}`)
    await user.click(screen.getByText(new RegExp(`Approve · \\+${task.points} pts`)))

    await waitFor(() => expect(screen.getByText(/Approved!/)).toBeInTheDocument())

    const state = useStore.getState().data
    expect(balance(state.ledger, childId)).toBe(before + task.points)
    expect(state.tasks.find((x) => x.id === task.id)!.status).toBe('approved')
    // Approving today extends the streak from 5 to 6.
    expect(streakInfo(state.ledger, childId).current).toBe(6)

    // Undo puts the points back without deleting history.
    const ledgerLength = state.ledger.length
    await user.click(screen.getByText(/Undo this approval/))
    await waitFor(() => {
      const after = useStore.getState().data
      expect(balance(after.ledger, childId)).toBe(before)
      expect(after.ledger.length).toBeGreaterThan(ledgerLength)
    })
  })

  it('redeeming a reward spends from the ledger', async () => {
    const user = userEvent.setup()
    const childId = 'child_vir'
    open('/kid/rewards')

    // Sticker pack (30) is affordable at 90 points — click the button in its card.
    const card = screen
      .getAllByText('Sticker pack')[0]
      .closest('[class*="rounded-kid"]') as HTMLElement
    await user.click(within(card).getByRole('button', { name: 'Get it!' }))

    await waitFor(() => {
      const data = useStore.getState().data
      expect(balance(data.ledger, childId)).toBe(60)
      expect(data.rewards.find((r) => r.id === 'rw_sticker')!.redeemed).toBe(true)
    })
  })

  it('enforces the 50/week gift cap through the UI', async () => {
    const user = userEvent.setup()
    useStore.getState().setPlus(true)
    open('/parent/gift')

    // Dadi already gifted 20 this week in the seed, so 30 is all that's left.
    expect(screen.getByText(/30 of 50 pts left/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Gift \d+ pts/ }))
    await waitFor(() => expect(screen.getByText(/gifted \d+ pts to Vir/)).toBeInTheDocument())

    const totalGifted = () =>
      useStore
        .getState()
        .data.ledger.filter((e) => e.type === 'POINTS_GIFTED' && e.actorId === 'mem_dadi')
        .reduce((sum, e) => sum + e.delta, 0)
    expect(totalGifted()).toBeLessThanOrEqual(50)

    // Keep gifting until the cap is hit; the button must then refuse to send more.
    for (let i = 0; i < 12; i++) {
      const button = screen.queryByRole('button', { name: /Gift \d+ pts/ })
      if (!button) break
      await user.click(button)
    }
    expect(totalGifted()).toBe(50)
    expect(screen.getByRole('button', { name: /Weekly cap reached/ })).toBeDisabled()
  })
})

// Tests render more than once; React Testing Library's auto-cleanup only runs
// between tests, so mid-test remounts need an explicit unmount.
function cleanupRender() {
  document.body.innerHTML = ''
}
