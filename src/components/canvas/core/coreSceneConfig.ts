export const COLORS = {
  bg: '#05090c',
  terrainBase: '#071217',
  terrainDeep: '#03090c',
  cyan: '#69f6ff',
  cyanSoft: '#9bddff',
  yellow: '#ffd21f',
  yellowSoft: '#ffe566',
  white: '#f4f8ff',
} as const

export const terrainRadius = 4.62

export type CategoryKey = 'web' | 'pwn' | 'rev' | 'crypto' | 'misc' | 'forensics'

export type FocusTheme = 'gateway' | 'exploit' | 'reverse' | 'cipher' | 'chaos' | 'forensic'

export type CategorySceneNode = {
  accentColor: string
  calloutPosition: [number, number, number]
  color: string
  focusTheme: FocusTheme
  key: CategoryKey
  label: string
  name: string
  phase: number
  x: number
  z: number
}

export const categoryNodes: CategorySceneNode[] = [
  {
    key: 'crypto',
    name: 'Crypto',
    label: '密码分析',
    x: -2.5,
    z: 0.75,
    color: COLORS.cyan,
    accentColor: '#7df7ff',
    focusTheme: 'cipher',
    phase: 0.35,
    calloutPosition: [-3.08, 1.12, 0.62],
  },
  {
    key: 'pwn',
    name: 'Pwn',
    label: '二进制漏洞',
    x: -0.8,
    z: 1.55,
    color: COLORS.yellow,
    accentColor: COLORS.yellowSoft,
    focusTheme: 'exploit',
    phase: 1.2,
    calloutPosition: [-1.82, 1.66, 2.04],
  },
  {
    key: 'web',
    name: 'Web',
    label: '入口渗透',
    x: 2.35,
    z: 0.65,
    color: COLORS.yellow,
    accentColor: COLORS.yellowSoft,
    focusTheme: 'gateway',
    phase: 2.1,
    calloutPosition: [3.04, 1.12, 0.44],
  },
  {
    key: 'rev',
    name: 'Rev',
    label: '逆向工程',
    x: -1.8,
    z: -1.05,
    color: COLORS.white,
    accentColor: COLORS.cyanSoft,
    focusTheme: 'reverse',
    phase: 3.05,
    calloutPosition: [-3.0, 0.66, -0.72],
  },
  {
    key: 'misc',
    name: 'Misc',
    label: '综合杂项',
    x: 0.65,
    z: -1.35,
    color: COLORS.yellowSoft,
    accentColor: COLORS.yellow,
    focusTheme: 'chaos',
    phase: 4.05,
    calloutPosition: [1.36, 0.64, -2.02],
  },
  {
    key: 'forensics',
    name: 'Forensics',
    label: '取证溯源',
    x: 2.15,
    z: 1.45,
    color: COLORS.cyanSoft,
    accentColor: COLORS.cyan,
    focusTheme: 'forensic',
    phase: 5,
    calloutPosition: [3.0, 1.46, 1.5],
  },
]

export const flowRoutes: Array<[CategoryKey, CategoryKey]> = [
  ['web', 'pwn'],
  ['pwn', 'rev'],
  ['crypto', 'misc'],
  ['forensics', 'web'],
  ['rev', 'crypto'],
  ['misc', 'pwn'],
]

function smoothstep(edge0: number, edge1: number, value: number) {
  const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

export function getCategoryNode(nameOrKey: string, fallbackIndex = 0) {
  const lowered = nameOrKey.toLowerCase()
  return (
    categoryNodes.find((node) => node.key === lowered || node.name.toLowerCase() === lowered) ??
    categoryNodes[fallbackIndex % categoryNodes.length]
  )
}

export function getCategoryNodeByKey(key: CategoryKey) {
  return categoryNodes.find((node) => node.key === key) ?? categoryNodes[0]
}

export function terrainHeight(x: number, z: number) {
  const radius = Math.hypot(x, z)
  const edgeFalloff = smoothstep(terrainRadius, terrainRadius * 0.45, radius)
  const centerPlateau = 0.18 * Math.exp(-(x * x + z * z) / 2.8)

  const categoryPeaks = categoryNodes.reduce((sum, node, index) => {
    const dx = x - node.x
    const dz = z - node.z
    const spread = 0.75 + index * 0.035
    const amp = 0.28 + (index % 3) * 0.07
    return sum + amp * Math.exp(-(dx * dx + dz * dz) / (spread * spread))
  }, 0)

  const subtleRidges =
    Math.sin(x * 2.1 + z * 0.8) * 0.035 +
    Math.cos(z * 2.8 - x * 0.4) * 0.028 +
    Math.sin((x - z) * 4.2) * 0.018

  return Math.max(0, (centerPlateau + categoryPeaks + subtleRidges) * edgeFalloff)
}

export function focusTerrainHeight(x: number, z: number, activeCategory: CategoryKey | null) {
  const base = terrainHeight(x, z)
  if (!activeCategory) return base

  const active = getCategoryNodeByKey(activeCategory)
  const dx = x - active.x
  const dz = z - active.z
  const distanceSquared = dx * dx + dz * dz
  const local = Math.exp(-distanceSquared / 1.16)
  const near = Math.exp(-distanceSquared / 0.42)
  const radius = Math.hypot(x, z)
  const dimOuter = Math.max(0, Math.min(1, (radius - 1.1) / terrainRadius))
  const backgroundCompression = 1 - Math.max(0, Math.min(0.28, dimOuter * (1 - local) * 0.22))

  let detail: number
  if (active.focusTheme === 'gateway') {
    detail =
      (Math.max(0, 0.42 - Math.abs(dx)) + Math.max(0, 0.3 - Math.abs(dz))) * 0.055 +
      Math.sin(x * 9.5) * Math.cos(z * 4.8) * 0.025
  } else if (active.focusTheme === 'exploit') {
    detail =
      Math.sin((dx - dz) * 10.5) * 0.038 +
      Math.max(0, 0.32 - Math.abs(dx + dz * 0.5)) * 0.09 -
      Math.exp(-((dx - 0.12) ** 2 + (dz + 0.1) ** 2) / 0.11) * 0.075
  } else if (active.focusTheme === 'reverse') {
    const angle = Math.atan2(dz, dx)
    detail = Math.sin(angle * 5 + Math.hypot(dx, dz) * 9) * 0.04 + Math.cos(dx * 7 - dz * 5) * 0.02
  } else if (active.focusTheme === 'cipher') {
    const radial = Math.hypot(dx, dz)
    detail = Math.sin(radial * 18) * 0.04 + Math.cos(Math.atan2(dz, dx) * 12) * 0.018
  } else if (active.focusTheme === 'chaos') {
    detail =
      Math.sin(dx * 13.1 + dz * 2.7) * 0.033 +
      Math.cos(dz * 12.6 - dx * 3.4) * 0.03 +
      Math.sin((Math.floor((x + 5) * 3) + Math.floor((z + 5) * 3)) * 1.7) * 0.018
  } else {
    detail = Math.sin(dz * 14) * 0.034 + Math.max(0, 0.26 - Math.abs(dx)) * 0.07
  }

  return Math.max(0, base * backgroundCompression + local * (0.18 + detail) + near * 0.12)
}
