import type {
  Challenge,
  ChallengeCategory,
  ChallengeCategoryMeta,
  ChallengeDifficulty,
  ChallengeDifficultyMeta,
} from './challengeTypes'

export const challengeCategories: ChallengeCategoryMeta[] = [
  { key: 'web', label: 'Web', accent: '#ffd21f', theme: 'gateway' },
  { key: 'pwn', label: 'Pwn', accent: '#ffe566', theme: 'memory' },
  { key: 'rev', label: 'Rev', accent: '#dce8ef', theme: 'flow' },
  { key: 'crypto', label: 'Crypto', accent: '#69f6ff', theme: 'cipher' },
  { key: 'misc', label: 'Misc', accent: '#9bddff', theme: 'fragment' },
  { key: 'forensics', label: 'Forensics', accent: '#7df7ff', theme: 'evidence' },
]

export const challengeDifficulties: ChallengeDifficultyMeta[] = [
  { key: 'easy', label: 'Easy', radius: 1.34 },
  { key: 'medium', label: 'Medium', radius: 2.12 },
  { key: 'hard', label: 'Hard', radius: 2.9 },
  { key: 'expert', label: 'Expert', radius: 3.68 },
]

export const challengeDifficultyBands = [
  { key: 'easy', label: 'Easy', innerRadius: 0.92, outerRadius: 1.68, height: 0.08 },
  { key: 'medium', label: 'Medium', innerRadius: 1.72, outerRadius: 2.48, height: 0.14 },
  { key: 'hard', label: 'Hard', innerRadius: 2.52, outerRadius: 3.22, height: 0.2 },
  { key: 'expert', label: 'Expert', innerRadius: 3.26, outerRadius: 4.08, height: 0.28 },
] as const satisfies Array<{
  height: number
  innerRadius: number
  key: ChallengeDifficulty
  label: string
  outerRadius: number
}>

function blood(first: string, second?: string, third?: string) {
  return { first, ...(second ? { second } : {}), ...(third ? { third } : {}) }
}

export const challengeData: Challenge[] = [
  {
    id: 'web-01',
    title: 'gateway_login',
    category: 'web',
    difficulty: 'easy',
    points: 100,
    solvedCount: 82,
    submitCount: 146,
    heat: 72,
    status: 'solved',
    firstBloodTeam: '0x300',
    bloods: blood('0x300', 'BlueHat', 'NepTeam'),
  },
  {
    id: 'web-02',
    title: 'include_you',
    category: 'web',
    difficulty: 'easy',
    points: 120,
    solvedCount: 64,
    submitCount: 132,
    heat: 88,
    status: 'hot',
    bloods: blood('FluxSec', 'HexCat'),
  },
  {
    id: 'web-03',
    title: 'cache_poison',
    category: 'web',
    difficulty: 'medium',
    points: 240,
    solvedCount: 38,
    submitCount: 105,
    heat: 41,
    status: 'unsolved',
  },
  {
    id: 'web-04',
    title: 'blind_router',
    category: 'web',
    difficulty: 'hard',
    points: 420,
    solvedCount: 15,
    submitCount: 74,
    heat: 91,
    status: 'hot',
    firstBloodTeam: 'ByteBandits',
    bloods: blood('ByteBandits', '0x300', 'WMTeam'),
  },
  {
    id: 'web-05',
    title: 'zero_session',
    category: 'web',
    difficulty: 'expert',
    points: 620,
    solvedCount: 3,
    submitCount: 31,
    heat: 22,
    status: 'locked',
  },

  {
    id: 'pwn-01',
    title: 'babystack',
    category: 'pwn',
    difficulty: 'easy',
    points: 100,
    solvedCount: 76,
    submitCount: 168,
    heat: 79,
    status: 'solved',
    firstBloodTeam: 'r3kapig',
    bloods: blood('r3kapig', 'SU', 'WaterPwn'),
  },
  {
    id: 'pwn-02',
    title: 'fmt_got',
    category: 'pwn',
    difficulty: 'medium',
    points: 260,
    solvedCount: 42,
    submitCount: 128,
    heat: 85,
    status: 'hot',
    bloods: blood('Nu1L', 'Sigma'),
  },
  {
    id: 'pwn-03',
    title: 'heap_lane',
    category: 'pwn',
    difficulty: 'medium',
    points: 320,
    solvedCount: 29,
    submitCount: 92,
    heat: 48,
    status: 'unsolved',
  },
  {
    id: 'pwn-04',
    title: 'kernel_gate',
    category: 'pwn',
    difficulty: 'hard',
    points: 460,
    solvedCount: 11,
    submitCount: 61,
    heat: 55,
    status: 'unsolved',
  },
  {
    id: 'pwn-05',
    title: 'one_byte_oracle',
    category: 'pwn',
    difficulty: 'expert',
    points: 700,
    solvedCount: 1,
    submitCount: 24,
    heat: 18,
    status: 'locked',
  },

  {
    id: 'rev-01',
    title: 'ez_rev',
    category: 'rev',
    difficulty: 'easy',
    points: 100,
    solvedCount: 88,
    submitCount: 126,
    heat: 70,
    status: 'solved',
    firstBloodTeam: '天枢战队',
    bloods: blood('天枢战队', 'RedRocket', 'Atlas'),
  },
  {
    id: 'rev-02',
    title: 'control_flow',
    category: 'rev',
    difficulty: 'medium',
    points: 220,
    solvedCount: 51,
    submitCount: 98,
    heat: 52,
    status: 'solved',
    bloods: blood('RevLab', 'IceWind', 'Ghost'),
  },
  {
    id: 'rev-03',
    title: 'vm_branch',
    category: 'rev',
    difficulty: 'hard',
    points: 430,
    solvedCount: 18,
    submitCount: 57,
    heat: 62,
    status: 'hot',
    bloods: blood('WMCTF', 'Tracer'),
  },
  {
    id: 'rev-04',
    title: 'opaque_key',
    category: 'rev',
    difficulty: 'hard',
    points: 500,
    solvedCount: 9,
    submitCount: 43,
    heat: 38,
    status: 'unsolved',
  },
  {
    id: 'rev-05',
    title: 'firmware_shadow',
    category: 'rev',
    difficulty: 'expert',
    points: 680,
    solvedCount: 2,
    submitCount: 19,
    heat: 15,
    status: 'locked',
  },

  {
    id: 'crypto-01',
    title: 'easy_rsa',
    category: 'crypto',
    difficulty: 'easy',
    points: 100,
    solvedCount: 91,
    submitCount: 118,
    heat: 68,
    status: 'solved',
    firstBloodTeam: 'AAA',
    bloods: blood('AAA', 'MathSec', 'Sigma'),
  },
  {
    id: 'crypto-02',
    title: 'nonce_drift',
    category: 'crypto',
    difficulty: 'medium',
    points: 250,
    solvedCount: 47,
    submitCount: 96,
    heat: 77,
    status: 'hot',
    bloods: blood('CipherX', 'Lattice'),
  },
  {
    id: 'crypto-03',
    title: 'lattice_note',
    category: 'crypto',
    difficulty: 'hard',
    points: 440,
    solvedCount: 16,
    submitCount: 55,
    heat: 44,
    status: 'unsolved',
  },
  {
    id: 'crypto-04',
    title: 'oracle_mix',
    category: 'crypto',
    difficulty: 'hard',
    points: 480,
    solvedCount: 12,
    submitCount: 50,
    heat: 40,
    status: 'unsolved',
  },
  {
    id: 'crypto-05',
    title: 'quantum_salt',
    category: 'crypto',
    difficulty: 'expert',
    points: 720,
    solvedCount: 1,
    submitCount: 16,
    heat: 12,
    status: 'locked',
  },

  {
    id: 'misc-01',
    title: 'simple_misc',
    category: 'misc',
    difficulty: 'easy',
    points: 100,
    solvedCount: 80,
    submitCount: 120,
    heat: 66,
    status: 'solved',
    firstBloodTeam: 'Nepnep',
    bloods: blood('Nepnep', 'CatMisc', 'TeamPi'),
  },
  {
    id: 'misc-02',
    title: 'signal_piece',
    category: 'misc',
    difficulty: 'medium',
    points: 210,
    solvedCount: 55,
    submitCount: 89,
    heat: 74,
    status: 'hot',
    bloods: blood('Signal', 'Echo'),
  },
  {
    id: 'misc-03',
    title: 'puzzle_bus',
    category: 'misc',
    difficulty: 'medium',
    points: 280,
    solvedCount: 34,
    submitCount: 76,
    heat: 45,
    status: 'unsolved',
  },
  {
    id: 'misc-04',
    title: 'audio_leak',
    category: 'misc',
    difficulty: 'hard',
    points: 390,
    solvedCount: 20,
    submitCount: 62,
    heat: 51,
    status: 'unsolved',
  },
  {
    id: 'misc-05',
    title: 'chaos_archive',
    category: 'misc',
    difficulty: 'expert',
    points: 610,
    solvedCount: 4,
    submitCount: 22,
    heat: 20,
    status: 'locked',
  },

  {
    id: 'forensics-01',
    title: 'find_me',
    category: 'forensics',
    difficulty: 'easy',
    points: 100,
    solvedCount: 72,
    submitCount: 112,
    heat: 64,
    status: 'solved',
    firstBloodTeam: '云巅之上',
    bloods: blood('云巅之上', 'TraceLab', 'DiskNine'),
  },
  {
    id: 'forensics-02',
    title: 'pcap_slice',
    category: 'forensics',
    difficulty: 'medium',
    points: 240,
    solvedCount: 44,
    submitCount: 91,
    heat: 58,
    status: 'hot',
    bloods: blood('NetFox', 'BlueWire'),
  },
  {
    id: 'forensics-03',
    title: 'timeline_gap',
    category: 'forensics',
    difficulty: 'medium',
    points: 300,
    solvedCount: 27,
    submitCount: 66,
    heat: 42,
    status: 'unsolved',
  },
  {
    id: 'forensics-04',
    title: 'memory_scan',
    category: 'forensics',
    difficulty: 'hard',
    points: 470,
    solvedCount: 10,
    submitCount: 47,
    heat: 36,
    status: 'unsolved',
  },
  {
    id: 'forensics-05',
    title: 'evidence_lock',
    category: 'forensics',
    difficulty: 'expert',
    points: 650,
    solvedCount: 2,
    submitCount: 18,
    heat: 14,
    status: 'locked',
  },
]

export const atlasInnerRadius = 0.72
export const atlasOuterRadius = 4.16
export const atlasSectorGap = 0.09

export function getCategoryIndex(category: ChallengeCategory) {
  return challengeCategories.findIndex((item) => item.key === category)
}

export function getCategoryMeta(category: ChallengeCategory) {
  return challengeCategories.find((item) => item.key === category) ?? challengeCategories[0]
}

export function getDifficultyMeta(difficulty: ChallengeDifficulty) {
  return challengeDifficulties.find((item) => item.key === difficulty) ?? challengeDifficulties[0]
}

export function getDifficultyBand(difficulty: ChallengeDifficulty) {
  return challengeDifficultyBands.find((item) => item.key === difficulty) ?? challengeDifficultyBands[0]
}

export function getDifficultyHeight(difficulty: ChallengeDifficulty) {
  return getDifficultyBand(difficulty).height
}

export function getCategoryAngle(category: ChallengeCategory) {
  const index = Math.max(getCategoryIndex(category), 0)
  return -Math.PI / 2 + index * ((Math.PI * 2) / challengeCategories.length)
}

export function getChallengePosition(challenge: Challenge, challenges: Challenge[] = challengeData) {
  const categoryIndex = Math.max(getCategoryIndex(challenge.category), 0)
  const sectorAngle = (Math.PI * 2) / challengeCategories.length
  const centerAngle = -Math.PI / 2 + categoryIndex * sectorAngle
  const categoryItems = challenges.filter((item) => item.category === challenge.category)
  const categoryItemIndex = Math.max(categoryItems.findIndex((item) => item.id === challenge.id), 0)
  const peers = challenges.filter((item) => item.category === challenge.category && item.difficulty === challenge.difficulty)
  const peerIndex = Math.max(peers.findIndex((item) => item.id === challenge.id), 0)
  const difficultyOrder = challengeDifficultyBands.findIndex((item) => item.key === challenge.difficulty)
  const spread = sectorAngle * 0.48
  const singleOffset = ((categoryItemIndex % 3) - 1) * sectorAngle * 0.13
  const peerStep = peers.length > 1 ? spread / (peers.length - 1) : 0
  const peerOffset = peers.length > 1 ? -spread / 2 + peerIndex * peerStep : singleOffset
  const difficultyBias = (difficultyOrder - 1.5) * sectorAngle * 0.025
  const angle = centerAngle + peerOffset + difficultyBias
  const bottomCategory = challenge.category === 'misc' || challenge.category === 'crypto' || challenge.category === 'rev'
  const radiusBias = categoryItemIndex % 2 === 0 ? -0.09 : 0.09
  const radius = getDifficultyMeta(challenge.difficulty).radius + radiusBias - (bottomCategory ? 0.26 : 0)
  let x = Math.cos(angle) * radius
  let z = Math.sin(angle) * radius
  if (challenge.category === 'misc') {
    x = x * 0.88 + 0.22
    z = z * 0.78 - 0.2
  } else if (challenge.category === 'crypto') {
    x *= 0.88
    z = z * 0.64 - 0.46
  } else if (challenge.category === 'rev') {
    x = x * 0.88 - 0.22
    z = z * 0.78 - 0.2
  }
  return [x, getDifficultyHeight(challenge.difficulty) + 0.12, z] as const
}

export function getChallengeCategoryStats(challenges: Challenge[] = challengeData) {
  return challengeCategories.map((category) => {
    const items = challenges.filter((challenge) => challenge.category === category.key)
    const solved = items.filter((challenge) => challenge.status === 'solved').length
    const hot = items.filter((challenge) => challenge.status === 'hot').length
    return {
      ...category,
      hot,
      solved,
      total: items.length,
      percent: Math.round((solved / Math.max(items.length, 1)) * 100),
    }
  })
}

export function getHotChallenges(challenges: Challenge[] = challengeData) {
  return [...challenges]
    .sort((left, right) => {
      const leftHot = left.status === 'hot' ? 1 : 0
      const rightHot = right.status === 'hot' ? 1 : 0
      return rightHot - leftHot || right.submitCount - left.submitCount
    })
    .slice(0, 10)
}

export function firstBloodName(challenge: Challenge): string | undefined {
  return challenge.bloods?.first ?? challenge.firstBloodTeam
}
