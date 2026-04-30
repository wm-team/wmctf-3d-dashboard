import { categoryNodes, getCategoryNodeByKey, terrainHeight } from '../core/coreSceneConfig'
import type {
  Challenge,
  ChallengeCategory,
  ChallengeCategoryMeta,
  ChallengeDifficulty,
  ChallengeDifficultyMeta,
} from './challengeTypes'

export const challengeCategories: ChallengeCategoryMeta[] = [
  { key: 'web', label: 'Web', accent: '#ffb000', theme: 'gateway' },
  { key: 'pwn', label: 'Pwn', accent: '#ff4d6d', theme: 'memory' },
  { key: 'rev', label: 'Rev', accent: '#b8ff3d', theme: 'flow' },
  { key: 'crypto', label: 'Crypto', accent: '#20e0ff', theme: 'cipher' },
  { key: 'misc', label: 'Misc', accent: '#a66cff', theme: 'fragment' },
  { key: 'forensics', label: 'Forensics', accent: '#4ea3ff', theme: 'evidence' },
]

export const challengeDifficulties: ChallengeDifficultyMeta[] = [
  { key: 'easy', label: 'Easy', radius: 0.36 },
  { key: 'medium', label: 'Medium', radius: 0.56 },
  { key: 'hard', label: 'Hard', radius: 0.78 },
  { key: 'expert', label: 'Expert', radius: 0.96 },
]

const difficultyLift: Record<ChallengeDifficulty, number> = {
  easy: 0.06,
  medium: 0.1,
  hard: 0.15,
  expert: 0.21,
}

export const challengeData: Challenge[] = [
  { id: 'web-01', title: 'gateway_login', category: 'web', difficulty: 'easy', points: 100, solvedCount: 82, submitCount: 146, status: 'solved', recentSolvedAt: 1, firstBloodTeam: '0x300', bloods: { first: '0x300', second: 'Nu1L', third: '星火联合' } },
  { id: 'web-02', title: 'include_you', category: 'web', difficulty: 'easy', points: 120, solvedCount: 64, submitCount: 132, status: 'hot', bloods: { first: 'Vidar-Team', second: 'N0wayBack' } },
  { id: 'web-03', title: 'cache_poison', category: 'web', difficulty: 'medium', points: 240, solvedCount: 38, submitCount: 105, status: 'unsolved' },
  { id: 'web-04', title: 'blind_router', category: 'web', difficulty: 'hard', points: 420, solvedCount: 15, submitCount: 74, status: 'hot', firstBloodTeam: 'ByteBandits', bloods: { first: 'ByteBandits', second: 'r3kapig', third: 'SU' } },
  { id: 'web-05', title: 'zero_session', category: 'web', difficulty: 'expert', points: 620, solvedCount: 3, submitCount: 31, status: 'locked' },

  { id: 'pwn-01', title: 'babystack', category: 'pwn', difficulty: 'easy', points: 100, solvedCount: 76, submitCount: 168, status: 'solved', recentSolvedAt: 2, firstBloodTeam: 'r3kapig', bloods: { first: 'r3kapig', second: 'AAA', third: '天璇' } },
  { id: 'pwn-02', title: 'fmt_got', category: 'pwn', difficulty: 'medium', points: 260, solvedCount: 42, submitCount: 128, status: 'hot', bloods: { first: 'Shellphish', second: '0x300', third: 'Blue Water' } },
  { id: 'pwn-03', title: 'heap_lane', category: 'pwn', difficulty: 'medium', points: 320, solvedCount: 29, submitCount: 92, status: 'unsolved' },
  { id: 'pwn-04', title: 'kernel_gate', category: 'pwn', difficulty: 'hard', points: 460, solvedCount: 11, submitCount: 61, status: 'unsolved' },
  { id: 'pwn-05', title: 'one_byte_oracle', category: 'pwn', difficulty: 'expert', points: 700, solvedCount: 1, submitCount: 24, status: 'locked' },

  { id: 'rev-01', title: 'ez_rev', category: 'rev', difficulty: 'easy', points: 100, solvedCount: 88, submitCount: 126, status: 'solved', firstBloodTeam: '天枢战队', bloods: { first: '天枢战队', second: '逆向工程组', third: 'Nebula' } },
  { id: 'rev-02', title: 'control_flow', category: 'rev', difficulty: 'medium', points: 220, solvedCount: 51, submitCount: 98, status: 'solved', bloods: { first: 'MatrixLab' } },
  { id: 'rev-03', title: 'vm_branch', category: 'rev', difficulty: 'hard', points: 430, solvedCount: 18, submitCount: 57, status: 'hot' },
  { id: 'rev-04', title: 'opaque_key', category: 'rev', difficulty: 'hard', points: 500, solvedCount: 9, submitCount: 43, status: 'unsolved' },
  { id: 'rev-05', title: 'firmware_shadow', category: 'rev', difficulty: 'expert', points: 680, solvedCount: 2, submitCount: 19, status: 'locked' },

  { id: 'crypto-01', title: 'easy_rsa', category: 'crypto', difficulty: 'easy', points: 100, solvedCount: 91, submitCount: 118, status: 'solved', firstBloodTeam: 'AAA', bloods: { first: 'AAA', second: 'CryptoHackers', third: '蓝莲花' } },
  { id: 'crypto-02', title: 'nonce_drift', category: 'crypto', difficulty: 'medium', points: 250, solvedCount: 47, submitCount: 96, status: 'hot', bloods: { first: 'Maple Bacon' } },
  { id: 'crypto-03', title: 'lattice_note', category: 'crypto', difficulty: 'hard', points: 440, solvedCount: 16, submitCount: 55, status: 'unsolved' },
  { id: 'crypto-04', title: 'oracle_mix', category: 'crypto', difficulty: 'hard', points: 480, solvedCount: 12, submitCount: 50, status: 'unsolved' },
  { id: 'crypto-05', title: 'quantum_salt', category: 'crypto', difficulty: 'expert', points: 720, solvedCount: 1, submitCount: 16, status: 'locked' },

  { id: 'misc-01', title: 'simple_misc', category: 'misc', difficulty: 'easy', points: 100, solvedCount: 80, submitCount: 120, status: 'solved', firstBloodTeam: 'Nepnep', bloods: { first: 'Nepnep', second: 'M1saka', third: '青藤' } },
  { id: 'misc-02', title: 'signal_piece', category: 'misc', difficulty: 'medium', points: 210, solvedCount: 55, submitCount: 89, status: 'hot' },
  { id: 'misc-03', title: 'puzzle_bus', category: 'misc', difficulty: 'medium', points: 280, solvedCount: 34, submitCount: 76, status: 'unsolved' },
  { id: 'misc-04', title: 'audio_leak', category: 'misc', difficulty: 'hard', points: 390, solvedCount: 20, submitCount: 62, status: 'unsolved' },
  { id: 'misc-05', title: 'chaos_archive', category: 'misc', difficulty: 'expert', points: 610, solvedCount: 4, submitCount: 22, status: 'locked' },

  { id: 'forensics-01', title: 'find_me', category: 'forensics', difficulty: 'easy', points: 100, solvedCount: 72, submitCount: 112, status: 'solved', firstBloodTeam: '云巅之上', bloods: { first: '云巅之上', second: 'Foren6', third: '镜像实验室' } },
  { id: 'forensics-02', title: 'pcap_slice', category: 'forensics', difficulty: 'medium', points: 240, solvedCount: 44, submitCount: 91, status: 'hot', bloods: { first: 'Wireshark Club', second: '0ops' } },
  { id: 'forensics-03', title: 'timeline_gap', category: 'forensics', difficulty: 'medium', points: 300, solvedCount: 27, submitCount: 66, status: 'unsolved' },
  { id: 'forensics-04', title: 'memory_scan', category: 'forensics', difficulty: 'hard', points: 470, solvedCount: 10, submitCount: 47, status: 'unsolved' },
  { id: 'forensics-05', title: 'evidence_lock', category: 'forensics', difficulty: 'expert', points: 650, solvedCount: 2, submitCount: 18, status: 'locked' },
]

export function getCategoryIndex(category: ChallengeCategory) {
  return challengeCategories.findIndex((item) => item.key === category)
}

export function getCategoryMeta(category: ChallengeCategory) {
  return challengeCategories.find((item) => item.key === category) ?? challengeCategories[0]
}

export function getCategoryAngle(category: ChallengeCategory) {
  const index = Math.max(getCategoryIndex(category), 0)
  return -Math.PI / 2 + index * ((Math.PI * 2) / challengeCategories.length)
}

export function getChallengePosition(challenge: Challenge, challenges: Challenge[] = challengeData) {
  const node = getCategoryNodeByKey(challenge.category)
  const categoryItems = challenges.filter((item) => item.category === challenge.category)
  const index = Math.max(categoryItems.findIndex((item) => item.id === challenge.id), 0)
  const difficultyRank = Math.max(challengeDifficulties.findIndex((item) => item.key === challenge.difficulty), 0)
  const goldenAngle = Math.PI * (3 - Math.sqrt(5))
  const angle = node.phase + index * goldenAngle + difficultyRank * 0.42
  const radius = 0.24 + challengeDifficulties[difficultyRank].radius + (index % 3) * 0.08
  const x = node.x + Math.cos(angle) * radius * (1.02 + Math.sin(node.phase) * 0.08)
  const z = node.z + Math.sin(angle) * radius * (0.88 + Math.cos(node.phase) * 0.08)
  return [x, terrainHeight(x, z) + difficultyLift[challenge.difficulty] + 0.08, z] as const
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

export { categoryNodes }
