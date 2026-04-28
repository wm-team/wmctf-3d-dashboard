export type TeamRank = {
  rank: number
  name: string
  score: number
  solves: number
}

export type SolveEvent = {
  time: string
  team: string
  category: string
  challenge: string
  points: number
  badge?: 'FIRST BLOOD'
}

export type CategoryStat = {
  name: string
  solved: number
  percent: number
  color: string
}

export type TimelinePoint = {
  time: string
  current: number
  previous: number
  highlight?: boolean
}

export type ActivityRow = {
  team: string
  buckets: number[]
}

export type CtfSnapshot = {
  eventName: string
  subtitle: string
  phase: string
  elapsedLabel: string
  currentTime: string
  systemStatus: string
  currentRound: number
  totalRounds: number
  roundStatus: string
  remainingTime: string
  nextRoundTime: string
  totalTeams: number
  totalChallenges: number
  solvedChallenges: number
  submissionsPerMinute: number
  firstBloodRecent: string[]
  topTeams: TeamRank[]
  recentSolves: SolveEvent[]
  categories: CategoryStat[]
  timeline: TimelinePoint[]
  activity: ActivityRow[]
  heatmapTicks: string[]
}
