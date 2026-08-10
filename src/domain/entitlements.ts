// The single place that answers "can this account use X?".
//
// Phase 1: driven by a local `isPlus` flag (the Upgrade screen flips it).
// Phase 4: swap the input for real subscription state — every call site here
// keeps working, and a downgrade just locks features without touching data.

export type Feature =
  | 'insights' // P1 habit insights & streak grids
  | 'digest' // P2 weekly digest
  | 'familyCircle' // P3 invite relatives
  | 'giftPoints' // P4 gift points (capped)
  | 'multiChild' // P5 second child onwards
  | 'threeJars' // P6 save/spend/give
  | 'indiaPacks' // P7 festival + India task packs
  | 'richStory' // A2 rich Sunday Family Story
  | 'growthAlbum' // A1 — free: album stays free, it's the emotional hook

const PLUS_ONLY: Feature[] = [
  'insights',
  'digest',
  'familyCircle',
  'giftPoints',
  'multiChild',
  'threeJars',
  'indiaPacks',
  'richStory',
]

export interface Entitlements {
  isPlus: boolean
  can(feature: Feature): boolean
  /** First child is always free; additional children need Plus. */
  canAddChild(currentCount: number): boolean
}

export function entitlements(isPlus: boolean): Entitlements {
  return {
    isPlus,
    can: (feature) => isPlus || !PLUS_ONLY.includes(feature),
    canAddChild: (currentCount) => isPlus || currentCount < 1,
  }
}

export const FREE_CHILD_LIMIT = 1
