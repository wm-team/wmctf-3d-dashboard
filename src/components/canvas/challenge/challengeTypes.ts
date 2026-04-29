export type ChallengeCategory = 'web' | 'pwn' | 'rev' | 'crypto' | 'misc' | 'forensics'

export type ChallengeDifficulty = 'easy' | 'medium' | 'hard' | 'expert'

export type ChallengeStatus = 'solved' | 'hot' | 'unsolved' | 'locked'

export type ChallengeCategoryMeta = {
  accent: string
  key: ChallengeCategory
  label: string
  theme: 'gateway' | 'memory' | 'flow' | 'cipher' | 'fragment' | 'evidence'
}

export type ChallengeDifficultyMeta = {
  key: ChallengeDifficulty
  label: string
  radius: number
}

export type Challenge = {
  category: ChallengeCategory
  difficulty: ChallengeDifficulty
  firstBloodTeam?: string
  id: string
  points: number
  solvedCount: number
  status: ChallengeStatus
  submitCount: number
  title: string
}
