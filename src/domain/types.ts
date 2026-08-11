// ============================================================================
// Domain types. Pure TypeScript — no React, no framework, no I/O.
//
// The central idea: we never store a points *balance*. We store an append-only
// ledger of events; balances, streaks, garden stage and gift caps are all
// DERIVED from that ledger. See `ledger.ts` for why.
// ============================================================================

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
  goalId: ID | null // chosen saving goal (reward id)
  /** Three-jar allocation. Only meaningful for older kids (see ageFit). */
  jarSplit: JarSplit
}

export interface FamilyMember {
  id: ID
  name: string
  role: 'parent' | 'relative'
  avatar: Avatar
}

export type TaskCategory = 'chore' | 'learning' | 'health' | 'kindness' | 'festival'

/**
 * Task templates are *our* content, not the family's, so they are translated:
 * the title is looked up as `task.title.<id>` and the pack name as `packKey`.
 * `title`/`packName` stay on the record as the English fallback and as what
 * gets written into a ledger event's `reason` at the time it happened.
 * (Reward titles are the opposite case — the parent typed those, so they are
 * shown exactly as entered, in any language.)
 */
export interface TaskTemplate {
  id: ID
  title: string
  emoji: string
  category: TaskCategory
  basePoints: number
  pack: 'basic' | 'plus' // plus packs are shown but locked when !isPlus
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

// --- Root ------------------------------------------------------------------

export interface AppData {
  version: number
  locale: Locale
  parentName: string
  isPlus: boolean
  onboarded: boolean
  activeChildId: ID | null
  children: Child[]
  members: FamilyMember[]
  templates: TaskTemplate[]
  tasks: AssignedTask[]
  rewards: Reward[]
  /** The append-only source of truth for all points. */
  ledger: LedgerEvent[]
}

export type GardenStage = 'seed' | 'sprout' | 'leaf' | 'plant' | 'tree'
