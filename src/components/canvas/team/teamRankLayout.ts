import { getCategoryNode, terrainHeight, terrainRadius } from '@/components/canvas/core/coreSceneConfig'

export type TeamRankTier = 'champion' | 'inner' | 'middle' | 'outer' | 'cloud'

export type TeamRankSlot = {
  angle: number
  position: [number, number, number]
  scale: number
  tier: TeamRankTier
}

const middleRingCount = 7
const middleRingStep = (Math.PI * 2) / middleRingCount
const middleRingStartAngle = -Math.PI / 2 + middleRingStep / 2

function ringSlot(radius: number, angle: number, y: number, scale: number, tier: TeamRankTier): TeamRankSlot {
  return {
    angle,
    position: [Math.cos(angle) * radius, y, Math.sin(angle) * radius],
    scale,
    tier,
  }
}

export function getRankSlot(rank: number): TeamRankSlot {
  if (rank === 1) {
    return {
      angle: 0,
      position: [0, 0.56, 0],
      scale: 1.32,
      tier: 'champion',
    }
  }

  if (rank === 2) return ringSlot(1.28, -Math.PI / 2, 0.38, 1.08, 'inner')
  if (rank === 3) return ringSlot(1.28, Math.PI / 2, 0.34, 1.02, 'inner')

  if (rank <= 10) {
    const angle = middleRingStartAngle + (rank - 4) * middleRingStep
    return ringSlot(2.46, angle, 0.2, 0.82, 'middle')
  }

  if (rank <= 30) {
    const index = rank - 11
    const angle = -Math.PI + (index / 20) * Math.PI * 2
    const radius = 3.62 + (index % 2) * 0.16
    return ringSlot(radius, angle, 0.05, 0.48, 'outer')
  }

  const index = rank - 31
  const angle = index * 2.399963229728653
  const radius = terrainRadius + 0.45 + (index % 7) * 0.04
  return ringSlot(radius, angle, -0.04, 0.24, 'cloud')
}

export function getCategoryAnchor(category: string): [number, number, number] {
  const node = getCategoryNode(category)
  return [node.x, 0.44 + terrainHeight(node.x, node.z) * 0.18, node.z]
}

export const challengeSeatCount = 7

function stableHash(value: string) {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function getChallengeSeatIndex(category: string, challenge: string) {
  return stableHash(`${category.toLowerCase()}:${challenge.toLowerCase()}`) % challengeSeatCount
}

export function getChallengeSeatSlot(category: string, index: number): [number, number, number] {
  const node = getCategoryNode(category)
  const normalized = ((index % challengeSeatCount) + challengeSeatCount) % challengeSeatCount
  const baseAngle = Math.atan2(node.z, node.x) + Math.PI * 0.44
  const angle = baseAngle + (normalized / challengeSeatCount) * Math.PI * 2
  const radius = 0.34 + (normalized % 3) * 0.055
  const x = node.x + Math.cos(angle) * radius
  const z = node.z + Math.sin(angle) * radius
  return [x, 0.4 + terrainHeight(x, z) * 0.2, z]
}

export function getChallengeSeatAnchor(category: string, challenge: string): [number, number, number] {
  return getChallengeSeatSlot(category, getChallengeSeatIndex(category, challenge))
}

export function rankTone(rank: number) {
  if (rank === 1) return '#ffd21f'
  if (rank === 2) return '#dce9ef'
  if (rank === 3) return '#ff8a36'
  if (rank <= 10) return '#69f6ff'
  return '#6e8690'
}
