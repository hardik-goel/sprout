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
import { buildBackup } from '@/lib/backup'

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

  it('redeeming is a parent action — the kid shelf only says "ready"', async () => {
    const user = userEvent.setup()
    const childId = 'child_vir'

    // Kid side: 90 points is enough for the 25-point bedtime story, but there
    // is no button to spend it. Kids are the doers, not the treasurers.
    open('/kid/rewards')
    expect(screen.queryByRole('button', { name: 'Get it!' })).toBeNull()
    expect(screen.getAllByText(/Ready! Ask a grown-up/).length).toBeGreaterThan(0)
    cleanupRender()

    // Parent side: the same reward carries the button that spends the jar.
    open('/parent/rewards')
    const card = screen.getByText('Extra bedtime story').closest('[class*="card"]') as HTMLElement
    await user.click(within(card).getByRole('button', { name: /Give it now/ }))

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

describe('custom tasks', () => {
  it('writes a task, assigns it today, and keeps it in the library', async () => {
    const user = userEvent.setup()
    open('/parent/tasks')

    await user.click(screen.getByRole('button', { name: /New task/ }))
    await user.type(screen.getByLabelText('Name'), 'Feed the dog')
    await user.click(screen.getByRole('button', { name: /Save & add to today/ }))

    await waitFor(() => {
      const data = useStore.getState().data
      const tpl = data.templates.find((x) => x.title === 'Feed the dog')!
      expect(tpl.pack).toBe('custom')
      // Assigned to today in the same tap, for the active child.
      expect(
        data.tasks.some((task) => task.templateId === tpl.id && task.date === todayKey()),
      ).toBe(true)
    })

    // And it is still on the shelf for tomorrow, under the family's own pack.
    expect(screen.getAllByText('Feed the dog').length).toBeGreaterThan(0)
    expect(screen.getByText('Your own tasks')).toBeInTheDocument()
  })

  it('pays a custom task exactly what the parent typed, at any age', async () => {
    const tpl = useStore
      .getState()
      .addCustomTask({ title: 'Feed the dog', emoji: '🐶', category: 'kindness', points: 20 })!
    // Vir is 3, so one of our 20-point templates would pay 10. This is not ours.
    useStore.getState().assignTask('child_vir', tpl)
    const task = useStore.getState().data.tasks.find((x) => x.templateId === tpl.id)!
    expect(task.points).toBe(20)
  })

  it('removes a custom task from the library without touching finished days', async () => {
    const user = userEvent.setup()
    const tpl = useStore
      .getState()
      .addCustomTask({ title: 'Feed the dog', emoji: '🐶', category: 'kindness', points: 10 })!
    useStore.getState().assignTask('child_vir', tpl)
    const taskCount = useStore.getState().data.tasks.length

    open('/parent/tasks')
    await user.click(screen.getByRole('button', { name: 'Remove task' }))
    // The confirmation's own button, not the row's trash icon.
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Remove task' }),
    )

    await waitFor(() => {
      const data = useStore.getState().data
      expect(data.templates.some((x) => x.id === tpl.id)).toBe(false)
      expect(data.tasks.length).toBe(taskCount) // the assigned day is untouched
    })
  })

  it('refuses to remove one of our own templates', () => {
    expect(useStore.getState().removeCustomTask('tpl_teeth')).toBe(false)
    expect(useStore.getState().data.templates.some((x) => x.id === 'tpl_teeth')).toBe(true)
  })
})

describe('managing children', () => {
  it('renames a child in place, without disturbing their points', async () => {
    const user = userEvent.setup()
    const before = balance(useStore.getState().data.ledger, 'child_vir')
    open('/parent/children')

    await user.click(screen.getByRole('button', { name: 'Edit Vir' }))
    const field = screen.getByLabelText('Name')
    await user.clear(field)
    await user.type(field, 'Arjun')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => {
      const child = useStore.getState().data.children.find((c) => c.id === 'child_vir')!
      expect(child.name).toBe('Arjun')
    })
    expect(balance(useStore.getState().data.ledger, 'child_vir')).toBe(before)
  })

  it('removes a child and everything that was only ever theirs', async () => {
    const user = userEvent.setup()
    open('/parent/children')

    await user.click(screen.getByRole('button', { name: 'Remove Vir' }))
    await user.click(screen.getByRole('button', { name: /Remove Vir and their history/ }))

    await waitFor(() => {
      const data = useStore.getState().data
      expect(data.children.map((c) => c.name)).toEqual(['Ira'])
      expect(data.ledger.some((e) => e.childId === 'child_vir')).toBe(false)
      expect(data.tasks.some((task) => task.childId === 'child_vir')).toBe(false)
      expect(data.rewards.some((r) => r.id === 'rw_zoo')).toBe(false)
      // A shared reward belongs to the family, not to the child who left.
      expect(data.rewards.some((r) => r.childId === null)).toBe(true)
      // Ira is untouched, and is now who the app is looking at.
      expect(data.activeChildId).toBe('child_ira')
      expect(balance(data.ledger, 'child_ira')).toBeGreaterThan(0)
    })
  })

  it('frees the one-child slot again on the free plan', async () => {
    const user = userEvent.setup()
    expect(useStore.getState().can.canAddChild(2)).toBe(false)

    useStore.getState().removeChild('child_vir')
    useStore.getState().removeChild('child_ira')
    cleanupRender()

    open('/parent/children')
    await user.click(screen.getByRole('button', { name: /Add a child/ }))
    await waitFor(() => expect(screen.getByText(/Ages 2–8/)).toBeInTheDocument())
  })
})

describe('account', () => {
  it('saves the parent’s details and says what it does with them', async () => {
    const user = userEvent.setup()
    open('/parent/account')

    expect(screen.getByText(/no login and nothing to sign out of/)).toBeInTheDocument()
    expect(screen.getByText('Free')).toBeInTheDocument()

    const email = screen.getByLabelText(/Email/)
    await user.type(email, 'aanya@example.com')
    await user.click(screen.getByRole('button', { name: /Save details/ }))

    await waitFor(() => expect(useStore.getState().data.parentEmail).toBe('aanya@example.com'))
  })

  it('shows the plan the account is actually on', () => {
    useStore.getState().setPlus(true)
    open('/parent/account')
    expect(screen.getAllByText(/Sprout Plus/).length).toBeGreaterThan(0)
    expect(useStore.getState().data.plusSince).toBeTruthy()
  })

  it('restores a backup over whatever is on the device', async () => {
    const backup = buildBackup(useStore.getState().data)
    // Something has happened since the backup was taken.
    useStore.getState().removeChild('child_vir')
    expect(useStore.getState().data.children).toHaveLength(1)

    useStore.getState().restoreBackup(backup)
    const data = useStore.getState().data
    expect(data.children.map((c) => c.name)).toEqual(['Vir', 'Ira'])
    expect(balance(data.ledger, 'child_vir')).toBe(90)
  })
})

describe('finishing the whole day', () => {
  // Vir's seeded day is four tasks: three to do and one waiting. Clearing all
  // of them should pay the bonus once, and undoing should take it back.
  function approveEverythingForVir() {
    const store = useStore.getState()
    const today = todayKey()
    const mine = () =>
      useStore.getState().data.tasks.filter((x) => x.childId === 'child_vir' && x.date === today)
    return mine().map((task) => {
      void store.markDone(task.id, null)
      return task.id
    })
  }

  it('pays one bonus for a finished day, and only one', async () => {
    const ids = approveEverythingForVir()
    await waitFor(() => {
      expect(
        useStore.getState().data.tasks.filter((x) => x.childId === 'child_vir' && x.status === 'todo'),
      ).toHaveLength(0)
    })

    const before = balance(useStore.getState().data.ledger, 'child_vir')
    const taskPoints = useStore
      .getState()
      .data.tasks.filter((x) => ids.includes(x.id))
      .reduce((sum, x) => sum + x.points, 0)

    let lastPayload = null as ReturnType<typeof useStore.getState>['celebration']
    for (const id of ids) lastPayload = useStore.getState().approveTask(id)

    // Vir is 3, so a bonus is one toddler-sized task: 6 points.
    const bonus = 6
    expect(lastPayload?.bonusAdded).toBe(bonus)
    expect(balance(useStore.getState().data.ledger, 'child_vir')).toBe(before + taskPoints + bonus)

    // Approving again pays nothing more.
    for (const id of ids) useStore.getState().approveTask(id)
    expect(balance(useStore.getState().data.ledger, 'child_vir')).toBe(before + taskPoints + bonus)
  })

  it('takes the bonus back when the day stops being finished', async () => {
    const ids = approveEverythingForVir()
    await waitFor(() => {
      expect(
        useStore.getState().data.tasks.filter((x) => x.childId === 'child_vir' && x.status === 'todo'),
      ).toHaveLength(0)
    })
    for (const id of ids) useStore.getState().approveTask(id)
    const withBonus = balance(useStore.getState().data.ledger, 'child_vir')

    useStore.getState().undoApproval(ids[0])
    const after = balance(useStore.getState().data.ledger, 'child_vir')
    const undoneTask = useStore.getState().data.tasks.find((x) => x.id === ids[0])!
    expect(after).toBe(withBonus - undoneTask.points - 6)

    // Re-approving earns it back, rather than being locked out by the refId.
    useStore.getState().approveTask(ids[0])
    expect(balance(useStore.getState().data.ledger, 'child_vir')).toBe(withBonus)
  })
})

describe('daily routines', () => {
  it('brings a routine task back the next day without re-assigning it', () => {
    const store = useStore.getState()
    store.setDailyRoutine('child_vir', 'tpl_toys', true)

    // Yesterday's copy is gone; today's is materialised on open.
    useStore.setState((s) => ({
      data: {
        ...s.data,
        tasks: s.data.tasks.filter((x) => x.templateId !== 'tpl_toys'),
      },
    }))
    useStore.getState().ensureTodaysTasks()

    const today = todayKey()
    const made = useStore
      .getState()
      .data.tasks.filter((x) => x.childId === 'child_vir' && x.templateId === 'tpl_toys' && x.date === today)
    expect(made).toHaveLength(1)

    // Calling it again is a no-op, not a duplicate.
    useStore.getState().ensureTodaysTasks()
    expect(
      useStore.getState().data.tasks.filter((x) => x.templateId === 'tpl_toys' && x.date === today),
    ).toHaveLength(1)

    useStore.getState().setDailyRoutine('child_vir', 'tpl_toys', false)
    expect(useStore.getState().data.children[0].dailyTemplateIds).toEqual([])
  })
})

describe('sign-in and locks', () => {
  it('asks a child for their PIN and then shows only their day', async () => {
    const user = userEvent.setup()
    useStore.getState().setChildPin('child_vir', '1234')
    useStore.getState().logoutKid()

    open('/kid')
    // The kid world is behind "Who is playing?" now.
    expect(screen.getByText(/Who is playing/)).toBeInTheDocument()
    await user.click(screen.getByText('Vir'))

    for (const d of ['1', '2', '3', '9']) {
      await user.click(screen.getByRole('button', { name: d }))
    }
    // The pad rejects and clears itself before it will take another try.
    await waitFor(() => expect(screen.getByText(/Not quite/)).toBeInTheDocument())
    
    expect(useStore.getState().session.kidId).toBeNull()

    for (const d of ['1', '2', '3', '4']) {
      await user.click(screen.getByRole('button', { name: d }))
    }
    await waitFor(() => expect(useStore.getState().session.kidId).toBe('child_vir'))
  })

  it('keeps a signed-in child out of their sibling’s tasks', async () => {
    useStore.getState().setChildPin('child_vir', '1234')
    useStore.getState().loginKid('child_vir', '1234')

    const irasTask = useStore.getState().data.tasks.find((x) => x.childId === 'child_ira')!
    open(`/kid/task/${irasTask.id}`)
    expect(screen.getByText(/Can’t find that task|not found/i)).toBeInTheDocument()
  })

  it('locks the parent world behind the parent PIN, and re-locks on the way back down', async () => {
    const user = userEvent.setup()
    useStore.getState().setParentPin('4321')
    useStore.getState().lockParent()

    open('/parent')
    expect(screen.getByText(/Grown-ups only/)).toBeInTheDocument()
    expect(screen.queryByText(/Hi, Aanya/)).toBeNull()

    for (const d of ['4', '3', '2', '1']) {
      await user.click(screen.getByRole('button', { name: d }))
    }
    await waitFor(() => expect(screen.getByText(/Hi, Aanya/)).toBeInTheDocument())

    // Handing the phone back to the child shuts the door again.
    useStore.getState().lockParent()
    expect(useStore.getState().session.parentUnlocked).toBe(false)
  })

  it('refuses a PIN that is not four digits', () => {
    expect(useStore.getState().setParentPin('12')).toBe(false)
    expect(useStore.getState().setChildPin('child_vir', 'abcd')).toBe(false)
    expect(useStore.getState().data.parentPinHash).toBeFalsy()
  })

  it('says which view you are in, both ways round', () => {
    open('/parent')
    expect(screen.getByText('Parent view')).toBeInTheDocument()
    cleanupRender()
    open('/kid')
    expect(screen.getByText('Kid view')).toBeInTheDocument()
  })
})

describe('the kid world is read-only about money and plans', () => {
  it('gives a child no way to set their own goal or spend the jar', () => {
    open('/kid/jar')
    expect(screen.queryByText('Save for this')).toBeNull()
    expect(screen.queryByText('Spend')).toBeNull()
    // An affordable reward says "ask a grown-up" instead of offering a button.
    expect(screen.getAllByText(/Ready! Ask a grown-up/).length).toBeGreaterThan(0)
  })

  it('shows a sibling’s day as a scoreboard, never as buttons', () => {
    useStore.getState().setChildAccess('child_vir', { canSeeSiblings: true })
    open('/kid')
    expect(screen.getByText('The family today')).toBeInTheDocument()
    // Ira's row is text, not a control — there is nothing to press.
    const row = screen.getByText('Ira').closest('div[class*="rounded-kid"]') as HTMLElement
    expect(within(row).queryAllByRole('button')).toHaveLength(0)
    expect(screen.getByText('Ira').closest('button')).toBeNull()
  })

  it('lets a child repaint their own world and nothing else', async () => {
    const user = userEvent.setup()
    open('/kid/garden')
    await user.click(screen.getByRole('button', { name: 'Ocean' }))
    await waitFor(() =>
      expect(useStore.getState().data.children.find((c) => c.id === 'child_vir')!.theme).toBe('ocean'),
    )
  })
})

describe('starting fresh', () => {
  it('clears the demo family and sends the parent back to onboarding', () => {
    useStore.getState().startFresh()
    const data = useStore.getState().data
    expect(data.children).toHaveLength(0)
    expect(data.ledger).toHaveLength(0)
    expect(data.tasks).toHaveLength(0)
    expect(data.onboarded).toBe(false)
    // The task library is still there — it is our content, not the family's.
    expect(data.templates.length).toBeGreaterThan(10)
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
