// Core domain types for Sprout. Kept framework-agnostic so the dataStore can be
// swapped (localStorage -> Supabase) without touching the UI or logic layers.

export type ID = string

export type Avatar = string // emoji

export interface Child {
  id: ID
  name: string
  age: number // 2..8
  avatar: Avatar
  points: number // current spendable balance
  lifetimePoints: number // cumulative ever-earned (drives garden growth)
  streak: number // current consecutive-day streak
  bestStreak: number
  lastApprovedDate: string | null // YYYY-MM-DD of last day a task was approved
  goalId: ID | null // currently chosen saving goal (reward id)
}

export interface FamilyMember {
  id: ID
  name: string
  role: 'parent' | 'relative'
  avatar: Avatar
}

export type TaskCategory = 'chore' | 'learning' | 'health' | 'kindness' | 'festival'

export interface TaskTemplate {
  id: ID
  title: string
  emoji: string
  category: TaskCategory
  basePoints: number
  pack: 'basic' | 'plus' // plus packs are shown but locked when !isPlus
  packName: string
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
  photo: string | null // base64 / object URL (local only)
  completedAt: string | null // ISO when kid marked done
  approvedAt: string | null // ISO when parent approved
}

export type RewardTag = 'screen' | 'sweet' | 'outing' | 'toy' | 'experience' | 'treat'

export interface Reward {
  id: ID
  title: string
  emoji: string
  cost: number // points
  tags: RewardTag[]
  redeemed: boolean
  redeemedAt: string | null
  fulfilled: boolean
}

export interface GiftLog {
  id: ID
  fromMemberId: ID
  childId: ID
  points: number
  weekKey: string // ISO week key for cap enforcement
  date: string // YYYY-MM-DD
}

export interface AppData {
  parentName: string
  isPlus: boolean
  onboarded: boolean
  children: Child[]
  members: FamilyMember[]
  templates: TaskTemplate[]
  tasks: AssignedTask[]
  rewards: Reward[]
  gifts: GiftLog[]
  activeChildId: ID | null
}

// Garden stages driven by lifetime approved tasks.
export type GardenStage = 'seed' | 'sprout' | 'leaf' | 'plant' | 'tree'
