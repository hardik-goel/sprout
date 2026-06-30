// Seed data — realistic first-run state so insights/digest screens look alive.
// Generated relative to "today" so streaks and history stay meaningful over time.

import type { AppData, AssignedTask, Reward, TaskTemplate } from '@/types'
import { addDays, todayKey, weekKey } from './dates'
import { ageFitTaskPoints } from './game'

let counter = 0
const uid = (p: string) => `${p}_${(counter++).toString(36)}_${p.length}`

export const TASK_TEMPLATES: TaskTemplate[] = [
  // --- Basic packs (free) ---
  { id: 'tpl_teeth', title: 'Brush teeth', emoji: '🪥', category: 'health', basePoints: 10, pack: 'basic', packName: 'Daily Basics' },
  { id: 'tpl_bed', title: 'Make the bed', emoji: '🛏️', category: 'chore', basePoints: 10, pack: 'basic', packName: 'Daily Basics' },
  { id: 'tpl_toys', title: 'Tidy up toys', emoji: '🧸', category: 'chore', basePoints: 10, pack: 'basic', packName: 'Daily Basics' },
  { id: 'tpl_plate', title: 'Clear my plate', emoji: '🍽️', category: 'chore', basePoints: 8, pack: 'basic', packName: 'Daily Basics' },
  { id: 'tpl_read', title: 'Read a story', emoji: '📖', category: 'learning', basePoints: 12, pack: 'basic', packName: 'Little Learner' },
  { id: 'tpl_water', title: 'Water the plant', emoji: '🌿', category: 'kindness', basePoints: 8, pack: 'basic', packName: 'Daily Basics' },
  { id: 'tpl_veg', title: 'Eat my veggies', emoji: '🥦', category: 'health', basePoints: 12, pack: 'basic', packName: 'Daily Basics' },
  { id: 'tpl_help', title: 'Help set the table', emoji: '🍴', category: 'kindness', basePoints: 10, pack: 'basic', packName: 'Daily Basics' },

  // --- Plus packs (shown but locked when !isPlus) ---
  { id: 'tpl_diya', title: 'Help light the diyas', emoji: '🪔', category: 'festival', basePoints: 15, pack: 'plus', packName: 'Festival Pack (India) ✨' },
  { id: 'tpl_rangoli', title: 'Make a rangoli', emoji: '🎨', category: 'festival', basePoints: 15, pack: 'plus', packName: 'Festival Pack (India) ✨' },
  { id: 'tpl_namaste', title: 'Greet elders (namaste)', emoji: '🙏', category: 'kindness', basePoints: 10, pack: 'plus', packName: 'Sanskaar Pack ✨' },
  { id: 'tpl_hindi', title: 'Practice Hindi letters', emoji: '🔤', category: 'learning', basePoints: 15, pack: 'plus', packName: 'Bharat Learner ✨' },
  { id: 'tpl_dadi', title: 'Call Dadi/Nani', emoji: '📞', category: 'kindness', basePoints: 12, pack: 'plus', packName: 'Sanskaar Pack ✨' },
  { id: 'tpl_yoga', title: 'Morning yoga/stretch', emoji: '🧘', category: 'health', basePoints: 12, pack: 'plus', packName: 'Healthy Habits ✨' },
]

const REWARDS: Reward[] = [
  { id: 'rw_zoo', title: 'Zoo trip', emoji: '🦁', cost: 150, tags: ['outing', 'experience'], redeemed: false, redeemedAt: null, fulfilled: false },
  { id: 'rw_park', title: 'Park + ice cream', emoji: '🍦', cost: 60, tags: ['outing', 'sweet'], redeemed: false, redeemedAt: null, fulfilled: false },
  { id: 'rw_sticker', title: 'Sticker pack', emoji: '🌟', cost: 30, tags: ['toy'], redeemed: false, redeemedAt: null, fulfilled: false },
  { id: 'rw_story', title: 'Extra bedtime story', emoji: '📚', cost: 25, tags: ['experience'], redeemed: false, redeemedAt: null, fulfilled: false },
  { id: 'rw_screen', title: '30 min cartoon time', emoji: '📺', cost: 40, tags: ['screen'], redeemed: false, redeemedAt: null, fulfilled: false },
]

export function buildSeed(): AppData {
  counter = 0
  const today = todayKey()
  const childId = 'child_vir'
  const age = 3

  const tasks: AssignedTask[] = []

  // History: last 5 days each had >=1 approved task -> 5-day streak.
  // Build a believable 7-day grid for a few habits.
  const historyTemplates = ['tpl_teeth', 'tpl_read', 'tpl_toys', 'tpl_veg']
  for (let d = 6; d >= 1; d--) {
    const date = addDays(today, -d)
    // days 1..5 ago are "on streak"; day 6 ago is a miss for one habit (texture)
    const onStreak = d <= 5
    historyTemplates.forEach((tplId, i) => {
      const tpl = TASK_TEMPLATES.find((t) => t.id === tplId)!
      // brush teeth done every day; others vary a little
      const done = tplId === 'tpl_teeth' ? onStreak : onStreak && (d + i) % 3 !== 0
      if (done) {
        tasks.push({
          id: uid('task'),
          childId,
          templateId: tpl.id,
          title: tpl.title,
          emoji: tpl.emoji,
          points: ageFitTaskPoints(tpl.basePoints, age),
          status: 'approved',
          date,
          photo: null,
          completedAt: `${date}T08:30:00`,
          approvedAt: `${date}T19:00:00`,
        })
      }
    })
  }

  // Today's tasks — a mix of states so the home screen shows the full loop.
  const todayPlan: { tpl: string; status: AssignedTask['status'] }[] = [
    { tpl: 'tpl_teeth', status: 'todo' },
    { tpl: 'tpl_bed', status: 'todo' },
    { tpl: 'tpl_read', status: 'pending' }, // waiting for parent approval
    { tpl: 'tpl_veg', status: 'todo' },
  ]
  todayPlan.forEach(({ tpl: tplId, status }) => {
    const tpl = TASK_TEMPLATES.find((t) => t.id === tplId)!
    tasks.push({
      id: uid('task'),
      childId,
      templateId: tpl.id,
      title: tpl.title,
      emoji: tpl.emoji,
      points: ageFitTaskPoints(tpl.basePoints, age),
      status,
      date: today,
      photo: null,
      completedAt: status === 'pending' ? `${today}T08:15:00` : null,
      approvedAt: null,
    })
  })

  const lifetime = 90 // pts earned over time (matches jar 90/150)

  return {
    parentName: 'Aanya',
    isPlus: false,
    onboarded: true, // seed starts onboarded so the demo lands on a live home
    activeChildId: childId,
    children: [
      {
        id: childId,
        name: 'Vir',
        age,
        avatar: '🦖',
        points: 90,
        lifetimePoints: lifetime,
        streak: 5,
        bestStreak: 5,
        lastApprovedDate: addDays(today, -1),
        goalId: 'rw_zoo',
      },
    ],
    members: [
      { id: 'mem_aanya', name: 'Aanya', role: 'parent', avatar: '👩' },
      { id: 'mem_dadi', name: 'Dadi', role: 'relative', avatar: '👵' },
      { id: 'mem_mama', name: 'Mama', role: 'relative', avatar: '🧑' },
    ],
    templates: TASK_TEMPLATES,
    tasks,
    rewards: REWARDS,
    gifts: [
      { id: uid('gift'), fromMemberId: 'mem_dadi', childId, points: 20, weekKey: weekKey(), date: today },
    ],
  }
}
