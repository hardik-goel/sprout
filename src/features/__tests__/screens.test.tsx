// Screen smoke tests: every route mounts and renders real seeded data, and the
// core loop (kid marks done → parent approves → points/garden/streak move)
// works end to end through the actual components.

import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from '@/App'
import { useStore } from '@/store'
import { balance, MAX_CHEERS, streakInfo, todayKey } from '@/domain'
import { photoStore } from '@/lib/photoStore'

function open(route: string) {
  return render(
    // Same future flags as main.tsx, so the tests exercise the router the app
    // actually ships with — and don't print two upgrade warnings per render.
    <MemoryRouter
      initialEntries={[route]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
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
    ['/parent/history', /Points history/],
    ['/parent/language', /Language/],
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

    // The seeded sticker pack is already redeemed, so it offers no button.
    const sticker = screen
      .getAllByText('Sticker pack')[0]
      .closest('[class*="rounded-kid"]') as HTMLElement
    expect(within(sticker).queryByRole('button', { name: 'Get it!' })).toBeNull()

    // Extra bedtime story (25) is affordable at 90 points.
    const card = screen
      .getAllByText('Extra bedtime story')[0]
      .closest('[class*="rounded-kid"]') as HTMLElement
    await user.click(within(card).getByRole('button', { name: 'Get it!' }))

    await waitFor(() => {
      const data = useStore.getState().data
      expect(balance(data.ledger, childId)).toBe(65)
      expect(data.rewards.find((r) => r.id === 'rw_story')!.redeemed).toBe(true)
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

describe('language (A4)', () => {
  it('switches the whole app to Hindi and back, and persists the choice', async () => {
    const user = userEvent.setup()
    open('/parent/language')

    await user.click(screen.getByRole('button', { name: /हिंदी/ }))
    await waitFor(() => expect(useStore.getState().data.locale).toBe('hi'))
    // The screen it is on re-renders in Hindi immediately.
    expect(screen.getByText('भाषा')).toBeInTheDocument()

    cleanupRender()
    open('/parent')
    expect(screen.getByText(/नमस्ते, Aanya/)).toBeInTheDocument()
    expect(screen.getByText(/आज के काम/)).toBeInTheDocument()

    cleanupRender()
    open('/kid')
    expect(screen.getByText(/मेरा बगीचा →/)).toBeInTheDocument()

    cleanupRender()
    open('/parent/language')
    await user.click(screen.getByRole('button', { name: /English/ }))
    await waitFor(() => expect(useStore.getState().data.locale).toBe('en'))
  })

  it('translates the family story, not just the chrome', () => {
    useStore.getState().setLocale('hi')
    try {
      open('/parent/story')
      // The child's own name is never translated — it appears in the card title
      // and again inside a generated sentence.
      expect(screen.getAllByText(/Vir/).length).toBeGreaterThan(0)
      // The generated sentences come from the Hindi dictionary, not English.
      expect(screen.queryByText(/tasks finished/)).not.toBeInTheDocument()
      expect(screen.getAllByText(/पॉइंट्स|⭐/).length).toBeGreaterThan(0)
      expect(screen.getAllByText(/हफ़्ता|सप्ताह/).length).toBeGreaterThan(0)
    } finally {
      // Restore even if an expectation throws, or every later test runs in Hindi.
      useStore.getState().setLocale('en')
    }
  })
})

describe('points history', () => {
  it('explains the balance entry by entry, newest first', () => {
    open('/parent/history')
    const ledger = useStore.getState().data.ledger.filter((e) => e.childId === 'child_vir')

    // The header shows the current balance, and every event has a row.
    expect(screen.getByText('90')).toBeInTheDocument()
    expect(screen.getAllByText(/Task approved/).length).toBeGreaterThan(0)
    expect(screen.getByText(/Points gifted/)).toBeInTheDocument()
    expect(screen.getByText(/Reward redeemed/)).toBeInTheDocument()
    expect(screen.getByText(/Carried over from the sticker chart/)).toBeInTheDocument()
    expect(screen.getAllByText(/balance -?\d+/).length).toBe(ledger.length)

    // The running balance is never negative: the carried-over opening entry is
    // dated before any earning, so the story reads forwards without going
    // underwater. (A negative here means the seed's opening entry moved.)
    const balances = screen
      .getAllByText(/balance -?\d+/)
      .map((el) => Number(/balance (-?\d+)/.exec(el.textContent!)![1]))
    expect(balances.every((b) => b >= 0)).toBe(true)
    // Newest first: the first row's balance is the current one.
    expect(balances[0]).toBe(90)
  })

  it('shows an undo as its own entry rather than erasing the original', async () => {
    const user = userEvent.setup()
    const task = useStore
      .getState()
      .data.tasks.find((x) => x.childId === 'child_vir' && x.status === 'pending')!

    open(`/parent/approve/${task.id}`)
    await user.click(screen.getByText(new RegExp(`Approve · \\+${task.points} pts`)))
    await waitFor(() => expect(screen.getByText(/Approved!/)).toBeInTheDocument())
    await user.click(screen.getByText(/Undo this approval/))
    cleanupRender()

    open('/parent/history')
    expect(screen.getAllByText(/Adjustment/).length).toBeGreaterThan(0)
    expect(screen.getByText('90')).toBeInTheDocument() // back where it started
  })
})

describe('points cannot be credited twice', () => {
  it('refuses to send an already-approved task back to "waiting"', async () => {
    const user = userEvent.setup()
    const task = useStore
      .getState()
      .data.tasks.find((x) => x.childId === 'child_vir' && x.status === 'pending')!

    open(`/parent/approve/${task.id}`)
    await user.click(screen.getByText(new RegExp(`Approve · \\+${task.points} pts`)))
    await waitFor(() =>
      expect(useStore.getState().data.tasks.find((x) => x.id === task.id)!.status).toBe('approved'),
    )
    const after = balance(useStore.getState().data.ledger, 'child_vir')
    cleanupRender()

    // The kid's "I did it!" screen is still reachable by going back. Marking it
    // done again must not reopen an approved task — a second approval would
    // credit the same points twice.
    await useStore.getState().markDone(task.id, null)
    expect(useStore.getState().data.tasks.find((x) => x.id === task.id)!.status).toBe('approved')

    useStore.getState().approveTask(task.id)
    expect(balance(useStore.getState().data.ledger, 'child_vir')).toBe(after)
  })

  it('shows the approved state instead of a dead Approve button', async () => {
    const user = userEvent.setup()
    const task = useStore
      .getState()
      .data.tasks.find((x) => x.childId === 'child_vir' && x.status === 'pending')!

    open(`/parent/approve/${task.id}`)
    await user.click(screen.getByText(new RegExp(`Approve · \\+${task.points} pts`)))
    await waitFor(() => expect(screen.getByText(/Approved!/)).toBeInTheDocument())
    cleanupRender()

    // Reopening the same URL later lands on the approved view, not the form.
    open(`/parent/approve/${task.id}`)
    expect(screen.getByText(/Approved!/)).toBeInTheDocument()
    expect(screen.queryByText(/Approve · \+/)).toBeNull()
  })

  it('drops the photo when a task is sent back to try again', async () => {
    const user = userEvent.setup()
    const task = useStore
      .getState()
      .data.tasks.find((x) => x.childId === 'child_vir' && x.status === 'pending')!
    expect(task.photoId).toBeTruthy()

    open(`/parent/approve/${task.id}`)
    await user.click(screen.getByText(/Ask to try again/))

    const after = useStore.getState().data.tasks.find((x) => x.id === task.id)!
    expect(after.status).toBe('todo')
    expect(after.photoId).toBeNull()
    expect(photoStore.url(task.photoId)).toBeNull()
  })
})

describe('still to give', () => {
  it('surfaces a redeemed-but-unhanded-over reward on the parent home', async () => {
    const user = userEvent.setup()
    open('/parent')

    expect(screen.getByText(/Still to give/)).toBeInTheDocument()
    expect(screen.getByText('Sticker pack')).toBeInTheDocument()
    expect(screen.getByText(/Vir spent points on this on/)).toBeInTheDocument()

    await user.click(screen.getByText('Sticker pack'))
    await user.click(screen.getByText(/Mark as given/))
    await waitFor(() =>
      expect(useStore.getState().data.rewards.find((r) => r.id === 'rw_sticker')!.fulfilled).toBe(
        true,
      ),
    )
    cleanupRender()

    // Once given, it leaves the queue.
    open('/parent')
    expect(screen.queryByText(/Still to give/)).toBeNull()
  })
})

describe('removing an assigned task', () => {
  it('takes an un-started task off today, behind a confirmation', async () => {
    const user = userEvent.setup()
    open('/parent')

    const todo = useStore
      .getState()
      .data.tasks.find((x) => x.childId === 'child_vir' && x.date === todayKey() && x.status === 'todo')!

    await user.click(screen.getAllByRole('button', { name: 'Remove this task' })[0])
    // Nothing happens until it is confirmed.
    expect(useStore.getState().data.tasks.some((x) => x.id === todo.id)).toBe(true)

    await user.click(screen.getByRole('button', { name: 'Remove it' }))
    await waitFor(() =>
      expect(useStore.getState().data.tasks.some((x) => x.id === todo.id)).toBe(false),
    )
  })

  it('cancelling leaves the task alone', async () => {
    const user = userEvent.setup()
    const before = useStore.getState().data.tasks.length
    open('/parent')

    await user.click(screen.getAllByRole('button', { name: 'Remove this task' })[0])
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(useStore.getState().data.tasks).toHaveLength(before)
  })

  it('refuses to delete an approved task, because the ledger points at it', () => {
    const approved = useStore
      .getState()
      .data.tasks.find((x) => x.childId === 'child_vir' && x.status === 'approved')!

    // Deleting it would leave TASK_APPROVED events whose refId resolves to
    // nothing, and a hole in the growth album. Approvals are undone, not erased.
    expect(useStore.getState().removeTask(approved.id)).toBe(false)
    expect(useStore.getState().data.tasks.some((x) => x.id === approved.id)).toBe(true)

    // And the home screen doesn't offer the option in the first place.
    open('/parent')
    const removeButtons = screen.queryAllByRole('button', { name: 'Remove this task' })
    expect(removeButtons.length).toBe(
      useStore
        .getState()
        .data.tasks.filter(
          (x) => x.childId === 'child_vir' && x.date === todayKey() && x.status === 'todo',
        ).length,
    )
  })
})

describe('voice cheers', () => {
  it('records a cheer, lists it, and plays it on the kid celebration', async () => {
    const user = userEvent.setup()

    // jsdom has no microphone; the store is where the rule lives, so drive it
    // directly and let the screens prove they render what it produced.
    const ok = await useStore.getState().addCheer('mem_dadi', null, 'data:audio/webm;base64,AA', 3000)
    expect(ok).toBe(true)

    open('/parent/cheers')
    expect(screen.getByText(/Recorded \(1\)/)).toBeInTheDocument()
    expect(screen.getAllByText(/Dadi/).length).toBeGreaterThan(0)
    // "Everyone" is both a picker chip and the saved cheer's audience label.
    expect(screen.getAllByText(/Everyone/).length).toBeGreaterThan(1)
    cleanupRender()

    // Approving a task is what makes the celebration reachable.
    const task = useStore
      .getState()
      .data.tasks.find((x) => x.childId === 'child_vir' && x.status === 'pending')!
    useStore.getState().approveTask(task.id)

    open('/kid/celebrate')
    expect(screen.getByText(/A cheer from Dadi|Tap to hear Dadi/)).toBeInTheDocument()
    cleanupRender()

    // Deleting it takes the cheer off the celebration too.
    open('/parent/cheers')
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(useStore.getState().data.cheers).toHaveLength(0))
    cleanupRender()

    open('/kid/celebrate')
    expect(screen.queryByText(/A cheer from|Tap to hear/)).toBeNull()
  })

  it('refuses a recording too large for localStorage', async () => {
    const huge = 'data:audio/webm;base64,' + 'A'.repeat(500_000)
    expect(await useStore.getState().addCheer('mem_dadi', null, huge, 3000)).toBe(false)
    expect(useStore.getState().data.cheers).toHaveLength(0)
  })

  it('stops at the cheer cap instead of filling storage', async () => {
    for (let i = 0; i < MAX_CHEERS; i++) {
      expect(await useStore.getState().addCheer('mem_aanya', null, `data:audio/webm;base64,A${i}`, 1000)).toBe(true)
    }
    expect(await useStore.getState().addCheer('mem_aanya', null, 'data:audio/webm;base64,ZZ', 1000)).toBe(false)
    expect(useStore.getState().data.cheers).toHaveLength(MAX_CHEERS)

    open('/parent/cheers')
    expect(screen.getByText(new RegExp(`You can keep ${MAX_CHEERS} cheers`))).toBeInTheDocument()
  })
})

describe('hindi', () => {
  it('translates the task names themselves, not just the chrome', () => {
    useStore.getState().setLocale('hi')
    try {
      open('/kid')
      // "Brush teeth" is our content, so it is translated…
      expect(screen.queryByText('Brush teeth')).toBeNull()
      expect(screen.getAllByText('दाँत ब्रश करना').length).toBeGreaterThan(0)
      cleanupRender()

      // …while a reward the parent typed is shown exactly as they typed it.
      open('/kid/rewards')
      expect(screen.getAllByText('Zoo trip').length).toBeGreaterThan(0)
      cleanupRender()

      open('/parent/tasks')
      expect(screen.getAllByText('रोज़ की बातें').length).toBeGreaterThan(0)
    } finally {
      useStore.getState().setLocale('en')
    }
  })
})

// Tests render more than once; React Testing Library's auto-cleanup only runs
// between tests, so mid-test remounts need an explicit unmount.
function cleanupRender() {
  document.body.innerHTML = ''
}
