// Seed data — a realistic first-run family so every screen (insights, digest,
// album, story) looks alive on the very first load. Built relative to "today"
// so streaks and 7-day grids stay meaningful whenever the demo is opened.

import type { AppData, AssignedTask, Child, LedgerEvent, Reward, TaskTemplate } from '@/domain/types'
import { addDays, todayKey, weekKey } from '@/domain/dates'
import { ageFitTaskPoints, defaultJarSplit } from '@/domain/ageFit'
import { splitPoints } from '@/domain/ledger'
import { photoStore } from './photoStore'

export const SEED_VERSION = 2

let counter = 0
const uid = (p: string) => `${p}_${(counter++).toString(36).padStart(3, '0')}`

export const TASK_TEMPLATES: TaskTemplate[] = [
  // --- Basic packs (free) ---
  { id: 'tpl_teeth', title: 'Brush teeth', emoji: '🪥', category: 'health', basePoints: 10, pack: 'basic', packName: 'Daily Basics', minAge: 2, maxAge: 8 },
  { id: 'tpl_bed', title: 'Make the bed', emoji: '🛏️', category: 'chore', basePoints: 10, pack: 'basic', packName: 'Daily Basics', minAge: 3, maxAge: 8 },
  { id: 'tpl_toys', title: 'Tidy up toys', emoji: '🧸', category: 'chore', basePoints: 10, pack: 'basic', packName: 'Daily Basics', minAge: 2, maxAge: 8 },
  { id: 'tpl_plate', title: 'Clear my plate', emoji: '🍽️', category: 'chore', basePoints: 8, pack: 'basic', packName: 'Daily Basics', minAge: 3, maxAge: 8 },
  { id: 'tpl_water', title: 'Water the plant', emoji: '🌿', category: 'kindness', basePoints: 8, pack: 'basic', packName: 'Daily Basics', minAge: 2, maxAge: 8 },
  { id: 'tpl_veg', title: 'Eat my veggies', emoji: '🥦', category: 'health', basePoints: 12, pack: 'basic', packName: 'Daily Basics', minAge: 2, maxAge: 8 },
  { id: 'tpl_help', title: 'Help set the table', emoji: '🍴', category: 'kindness', basePoints: 10, pack: 'basic', packName: 'Daily Basics', minAge: 3, maxAge: 8 },
  { id: 'tpl_read', title: 'Read a story', emoji: '📖', category: 'learning', basePoints: 12, pack: 'basic', packName: 'Little Learner', minAge: 2, maxAge: 8 },
  { id: 'tpl_shoes', title: 'Put shoes away', emoji: '👟', category: 'chore', basePoints: 8, pack: 'basic', packName: 'Toddler Basics', minAge: 2, maxAge: 5 },
  { id: 'tpl_wash', title: 'Wash my hands', emoji: '🧼', category: 'health', basePoints: 6, pack: 'basic', packName: 'Toddler Basics', minAge: 2, maxAge: 5 },
  { id: 'tpl_bag', title: 'Pack my school bag', emoji: '🎒', category: 'chore', basePoints: 12, pack: 'basic', packName: 'Big Kid Routines', minAge: 5, maxAge: 8 },
  { id: 'tpl_home', title: 'Finish homework', emoji: '✏️', category: 'learning', basePoints: 15, pack: 'basic', packName: 'Big Kid Routines', minAge: 5, maxAge: 8 },
  { id: 'tpl_walk', title: 'Play outside 30 min', emoji: '⚽', category: 'health', basePoints: 12, pack: 'basic', packName: 'Healthy Habits', minAge: 3, maxAge: 8 },

  // --- Plus packs (shown but locked when !isPlus) ---
  { id: 'tpl_diya', title: 'Help light the diyas', emoji: '🪔', category: 'festival', basePoints: 15, pack: 'plus', packName: 'Festival Pack (India) ✨', minAge: 3, maxAge: 8 },
  { id: 'tpl_rangoli', title: 'Make a rangoli', emoji: '🎨', category: 'festival', basePoints: 15, pack: 'plus', packName: 'Festival Pack (India) ✨', minAge: 3, maxAge: 8 },
  { id: 'tpl_rakhi', title: 'Tie a rakhi', emoji: '🎀', category: 'festival', basePoints: 12, pack: 'plus', packName: 'Festival Pack (India) ✨', minAge: 2, maxAge: 8 },
  { id: 'tpl_namaste', title: 'Greet elders (namaste)', emoji: '🙏', category: 'kindness', basePoints: 10, pack: 'plus', packName: 'Sanskaar Pack ✨', minAge: 2, maxAge: 8 },
  { id: 'tpl_dadi', title: 'Call Dadi/Nani', emoji: '📞', category: 'kindness', basePoints: 12, pack: 'plus', packName: 'Sanskaar Pack ✨', minAge: 3, maxAge: 8 },
  { id: 'tpl_joint', title: 'Help serve at family dinner', emoji: '🍛', category: 'kindness', basePoints: 12, pack: 'plus', packName: 'Sanskaar Pack ✨', minAge: 4, maxAge: 8 },
  { id: 'tpl_hindi', title: 'Practice Hindi letters', emoji: '🔤', category: 'learning', basePoints: 15, pack: 'plus', packName: 'Bharat Learner ✨', minAge: 4, maxAge: 8 },
  { id: 'tpl_yoga', title: 'Morning yoga/stretch', emoji: '🧘', category: 'health', basePoints: 12, pack: 'plus', packName: 'Healthy Habits ✨', minAge: 3, maxAge: 8 },
]

const VIR = 'child_vir'
const IRA = 'child_ira'
const PARENT = 'mem_aanya'

function rewards(): Reward[] {
  return [
    { id: 'rw_zoo', childId: VIR, title: 'Zoo trip', emoji: '🦁', cost: 150, tags: ['outing', 'experience'], redeemed: false, redeemedAt: null, fulfilled: false },
    { id: 'rw_sticker', childId: VIR, title: 'Sticker pack', emoji: '🌟', cost: 30, tags: ['toy'], redeemed: false, redeemedAt: null, fulfilled: false },
    { id: 'rw_story', childId: VIR, title: 'Extra bedtime story', emoji: '📚', cost: 25, tags: ['experience'], redeemed: false, redeemedAt: null, fulfilled: false },
    { id: 'rw_cycle', childId: IRA, title: 'Cycle ride with Papa', emoji: '🚲', cost: 60, tags: ['outing'], redeemed: false, redeemedAt: null, fulfilled: false },
    { id: 'rw_bat', childId: IRA, title: 'Cricket bat', emoji: '🏏', cost: 250, tags: ['toy'], redeemed: false, redeemedAt: null, fulfilled: false },
    { id: 'rw_park', childId: null, title: 'Park + ice cream', emoji: '🍦', cost: 60, tags: ['outing', 'sweet'], redeemed: false, redeemedAt: null, fulfilled: false },
    { id: 'rw_screen', childId: null, title: '30 min cartoon time', emoji: '📺', cost: 40, tags: ['screen'], redeemed: false, redeemedAt: null, fulfilled: false },
  ]
}

/**
 * A stand-in "photo" for seeded history so the Growth Album has something to
 * show on first run. Real photos come from the camera; these are tiny inline
 * SVGs so the seed ships no binaries and costs no bandwidth.
 */
function seedPhoto(emoji: string, tint: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="360"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${tint}"/><stop offset="1" stop-color="#0C342B"/></linearGradient></defs><rect width="360" height="360" fill="url(#g)"/><text x="180" y="215" font-size="140" text-anchor="middle">${emoji}</text></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

const TINTS = ['#2FAE73', '#43D6A0', '#F0A92E', '#E2725B', '#5B8DEF']

interface HistoryPlan {
  childId: string
  age: number
  templateIds: string[]
  /** Day offsets back from today that count as active days. */
  activeOffsets: number[]
}

function buildHistory(plan: HistoryPlan, today: string) {
  const tasks: AssignedTask[] = []
  const events: LedgerEvent[] = []
  const split = defaultJarSplit(plan.age)
  let photoIdx = 0

  for (const offset of [...plan.activeOffsets].sort((a, b) => b - a)) {
    const date = addDays(today, -offset)
    plan.templateIds.forEach((tplId, i) => {
      // First habit lands every active day; the others vary, so the 7-day
      // grids have texture instead of a wall of ticks.
      if (i > 0 && (offset + i) % 3 === 0) return
      const tpl = TASK_TEMPLATES.find((t) => t.id === tplId)!
      const points = ageFitTaskPoints(tpl.basePoints, plan.age)
      const taskId = uid('task')
      // Every third approval keeps its photo — enough to fill the album
      // without bloating localStorage on first run.
      const withPhoto = photoIdx % 3 === 0
      const photoId = withPhoto ? uid('photo') : null
      if (photoId) {
        photoStore.put(photoId, seedPhoto(tpl.emoji, TINTS[photoIdx % TINTS.length]))
      }
      photoIdx++

      tasks.push({
        id: taskId,
        childId: plan.childId,
        templateId: tpl.id,
        title: tpl.title,
        emoji: tpl.emoji,
        points,
        status: 'approved',
        date,
        photoId,
        completedAt: `${date}T08:30:00.000Z`,
        approvedAt: `${date}T13:30:00.000Z`,
      })

      const parts = splitPoints(points, split)
      for (const jar of ['save', 'spend', 'give'] as const) {
        if (parts[jar] <= 0) continue
        events.push({
          id: uid('evt'),
          type: 'TASK_APPROVED',
          childId: plan.childId,
          actorId: PARENT,
          actorRole: 'parent',
          delta: parts[jar],
          at: `${date}T13:30:00.000Z`,
          date,
          reason: tpl.title,
          refId: taskId,
          weekKey: weekKey(date),
          jar,
        })
      }
    })
  }
  return { tasks, events }
}

function todayPlanFor(
  childId: string,
  age: number,
  plan: { tpl: string; status: AssignedTask['status'] }[],
  today: string,
): AssignedTask[] {
  return plan.map(({ tpl: tplId, status }) => {
    const tpl = TASK_TEMPLATES.find((t) => t.id === tplId)!
    const photoId = status === 'pending' ? uid('photo') : null
    if (photoId) photoStore.put(photoId, seedPhoto(tpl.emoji, '#2FAE73'))
    return {
      id: uid('task'),
      childId,
      templateId: tpl.id,
      title: tpl.title,
      emoji: tpl.emoji,
      points: ageFitTaskPoints(tpl.basePoints, age),
      status,
      date: today,
      photoId,
      completedAt: status === 'pending' ? `${today}T08:15:00.000Z` : null,
      approvedAt: null,
    }
  })
}

export function buildSeed(): AppData {
  counter = 0
  const today = todayKey()

  // Vir, 3 — 5-day streak (yesterday back to 5 days ago), one earlier miss.
  const vir = buildHistory(
    { childId: VIR, age: 3, templateIds: ['tpl_teeth', 'tpl_read', 'tpl_toys', 'tpl_veg'], activeOffsets: [1, 2, 3, 4, 5] },
    today,
  )
  // Ira, 6 — steadier but with a gap, so the grids differ from Vir's.
  const ira = buildHistory(
    { childId: IRA, age: 6, templateIds: ['tpl_home', 'tpl_bag', 'tpl_walk'], activeOffsets: [1, 2, 4, 5, 6] },
    today,
  )

  const tasks: AssignedTask[] = [
    ...vir.tasks,
    ...ira.tasks,
    ...todayPlanFor(VIR, 3, [
      { tpl: 'tpl_teeth', status: 'todo' },
      { tpl: 'tpl_bed', status: 'todo' },
      { tpl: 'tpl_read', status: 'pending' }, // waiting for a parent tap
      { tpl: 'tpl_veg', status: 'todo' },
    ], today),
    ...todayPlanFor(IRA, 6, [
      { tpl: 'tpl_home', status: 'todo' },
      { tpl: 'tpl_bag', status: 'pending' },
    ], today),
  ]

  const ledger: LedgerEvent[] = [...vir.events, ...ira.events]

  // Dadi gifted this week — shows the cap working with some already used.
  ledger.push({
    id: uid('evt'),
    type: 'POINTS_GIFTED',
    childId: VIR,
    actorId: 'mem_dadi',
    actorRole: 'relative',
    delta: 20,
    at: `${addDays(today, -1)}T10:00:00.000Z`,
    date: addDays(today, -1),
    reason: 'Shabaash beta! 🌟',
    refId: null,
    weekKey: weekKey(addDays(today, -1)),
    jar: 'save',
  })

  // Top up Vir to exactly 90 so the demo lands on the 90/150 zoo jar. Modelled
  // as a real ADJUSTMENT ("we moved over from the sticker chart") rather than a
  // fudged balance — the ledger stays the only source of truth.
  const virBalance = ledger
    .filter((e) => e.childId === VIR)
    .reduce((s, e) => s + e.delta, 0)
  const topUp = 90 - virBalance
  if (topUp !== 0) {
    ledger.push({
      id: uid('evt'),
      type: 'ADJUSTMENT',
      childId: VIR,
      actorId: PARENT,
      actorRole: 'parent',
      delta: topUp,
      at: `${addDays(today, -6)}T09:00:00.000Z`,
      date: addDays(today, -6),
      reason: 'Carried over from the sticker chart',
      refId: null,
      weekKey: weekKey(addDays(today, -6)),
      jar: 'save',
    })
  }

  const children: Child[] = [
    { id: VIR, name: 'Vir', age: 3, avatar: '🦖', goalId: 'rw_zoo', jarSplit: defaultJarSplit(3) },
    { id: IRA, name: 'Ira', age: 6, avatar: '🦄', goalId: 'rw_bat', jarSplit: defaultJarSplit(6) },
  ]

  return {
    version: SEED_VERSION,
    parentName: 'Aanya',
    isPlus: false,
    onboarded: true, // the demo lands on a live, populated home
    activeChildId: VIR,
    children,
    members: [
      { id: PARENT, name: 'Aanya', role: 'parent', avatar: '👩' },
      { id: 'mem_dadi', name: 'Dadi', role: 'relative', avatar: '👵' },
      { id: 'mem_mama', name: 'Mama', role: 'relative', avatar: '🧑' },
    ],
    templates: TASK_TEMPLATES,
    tasks,
    rewards: rewards(),
    ledger,
  }
}
