// ============================================================================
// Domain types. Pure TypeScript — no React, no framework, no I/O.
//
// The central idea: we never store a points *balance*. We store an append-only
// ledger of events; balances, streaks, garden stage and gift caps are all
// DERIVED from that ledger. See `ledger.ts` for why.
// ============================================================================

import type { KidTheme } from './themes'

export type ID = string

/** UI language. Lives in the domain because it is persisted with the account. */
export type Locale = 'en' | 'hi'

export type Avatar = string // emoji

// --- Ledger ----------------------------------------------------------------

export type LedgerEventType =
  | 'TASK_APPROVED'
  | 'REWARD_REDEEMED'
  | 'POINTS_GIFTED'
  | 'ADJUSTMENT'

export type ActorRole = 'parent' | 'relative' | 'system'

/**
 * One immutable fact about a child's points. Never mutated, never deleted —
 * an undo is a compensating ADJUSTMENT event, so the history stays honest.
 *
 * `id` is client-generated (UUID) which makes replays idempotent: applying the
 * same event twice (offline queue retry, sync merge) can never double-count.
 */
export interface LedgerEvent {
  id: ID
  type: LedgerEventType
  childId: ID
  actorId: ID // family member who caused it
  actorRole: ActorRole
  delta: number // signed points (+earned, -spent)
  at: string // ISO timestamp
  date: string // YYYY-MM-DD (local day, drives streaks)
  reason: string // human-readable ("Brush teeth", "Zoo trip")
  refId: ID | null // task id / reward id / gift target
  weekKey: string // ISO week — gift cap sums over this
  jar?: JarKind // which jar the points landed in / came from
}

export type JarKind = 'save' | 'spend' | 'give'

/** Percent split of incoming points across the three jars. Must sum to 100. */
export interface JarSplit {
  save: number
  spend: number
  give: number
}

// --- Entities --------------------------------------------------------------

export interface Child {
  id: ID
  name: string
  age: number // 2..8
  avatar: Avatar
  goalId: ID | null // chosen saving goal (reward id) — set by a parent
  /** Three-jar allocation. Only meaningful for older kids (see ageFit). */
  jarSplit: JarSplit
  /**
   * Hashed screen lock for this child's own kid view, so one sibling can't
   * spend the other's points. Absent/null = no lock. See `domain/pin.ts` for
   * exactly how much this is and isn't worth.
   */
  pinHash?: string | null
  /** What the child taps to sign in as themselves. Defaults to their name. */
  username?: string
  /** The child's own colour palette for the kid world. See `themes.ts`. */
  theme?: KidTheme
  /**
   * Whether this child may *see* their siblings' day. Read-only either way —
   * a sibling can never complete, assign or spend anything that is not theirs.
   * Off by default, and only a parent can turn it on.
   */
  canSeeSiblings?: boolean
  /**
   * Templates that come back every day without being re-assigned. A routine is
   * the whole point of a habit app; making a parent re-add "brush teeth" every
   * morning is how a habit app becomes a chore.
   */
  dailyTemplateIds?: ID[]
}

export interface FamilyMember {
  id: ID
  name: string
  role: 'parent' | 'relative'
  avatar: Avatar
}

export type TaskCategory = 'chore' | 'learning' | 'health' | 'kindness' | 'festival'

/**
 * Where a template came from. `basic` is free, `plus` is shown but locked
 * without a subscription, and `custom` is one the parent wrote themselves —
 * which is why a custom task is never translated and never age-scaled: those
 * are their words and their number.
 */
export type TaskPack = 'basic' | 'plus' | 'custom'

/**
 * Task templates are *our* content, not the family's, so they are translated:
 * the title is looked up as `task.title.<id>` and the pack name as `packKey`.
 * `title`/`packName` stay on the record as the English fallback and as what
 * gets written into a ledger event's `reason` at the time it happened.
 * (Reward titles are the opposite case — the parent typed those, so they are
 * shown exactly as entered, in any language. A custom task title is the same
 * case: `taskTitle()` has no key for it and falls back to what was typed.)
 */
export interface TaskTemplate {
  id: ID
  title: string
  emoji: string
  category: TaskCategory
  basePoints: number
  pack: TaskPack
  packName: string
  packKey: string // i18n key for packName
  minAge: number
  maxAge: number
}

export type TaskStatus = 'todo' | 'pending' | 'approved'

export interface AssignedTask {
  id: ID
  childId: ID
  templateId: ID
  title: string
  emoji: string
  points: number
  status: TaskStatus
  date: string // YYYY-MM-DD the task is for
  photoId: string | null // key into photoStore
  completedAt: string | null // ISO when kid marked done
  approvedAt: string | null // ISO when parent approved
}

export type RewardTag = 'screen' | 'sweet' | 'outing' | 'toy' | 'experience' | 'treat'

export interface Reward {
  id: ID
  childId: ID | null // null = available to every child
  title: string
  emoji: string
  cost: number // points
  tags: RewardTag[]
  redeemed: boolean
  redeemedAt: string | null
  fulfilled: boolean
}

/**
 * A3 — a recorded cheer. Three seconds of Dadi saying "shabaash beta" is worth
 * more to a four-year-old than any animation we could draw, and it is the one
 * thing in the app a competitor cannot copy: it is her actual voice.
 *
 * Like a photo, the bytes live behind the audioStore seam; this record keeps
 * only the id.
 */
export interface VoiceCheer {
  id: ID
  audioId: string // key into audioStore
  memberId: ID // who recorded it
  childId: ID | null // null = for every child
  durationMs: number
  createdAt: string // ISO
}

// --- Root ------------------------------------------------------------------

export interface AppData {
  version: number
  locale: Locale
  parentName: string
  /**
   * Optional contact details. There is no account and no server — these are
   * kept so the app can address the parent properly and so a backup file has
   * something to identify it by. They are never sent anywhere.
   *
   * Optional on purpose: they were added after data was already in the wild,
   * and an existing install must keep working rather than be re-seeded.
   */
  parentEmail?: string
  parentPhone?: string
  /** ISO — when this family's data was first created on this device. */
  createdAt?: string
  /** ISO — when Plus was last switched on. Null/absent on a free account. */
  plusSince?: string | null
  /** Hashed lock on the parent world. Absent/null = anyone can walk in. */
  parentPinHash?: string | null
  /**
   * Days the parent opened the app (YYYY-MM-DD). Their streak is derived from
   * this the same way a child's is derived from the ledger — a parent who
   * checks in daily is the single strongest predictor of the habit sticking,
   * so it is worth showing them.
   */
  parentDays?: string[]
  /** Sound effects. Absent = on; a parent can silence the app from Account. */
  soundOn?: boolean
  isPlus: boolean
  onboarded: boolean
  activeChildId: ID | null
  children: Child[]
  members: FamilyMember[]
  templates: TaskTemplate[]
  tasks: AssignedTask[]
  rewards: Reward[]
  cheers: VoiceCheer[]
  /** The append-only source of truth for all points. */
  ledger: LedgerEvent[]
}

export type GardenStage = 'seed' | 'sprout' | 'leaf' | 'plant' | 'tree'
