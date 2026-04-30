import type { Challenge } from './challengeTypes'

const statusWeight: Record<Challenge['status'], number> = {
  hot: 86,
  locked: -120,
  solved: 42,
  unsolved: 10,
}

export function getAutoplayPriority(challenge: Challenge) {
  const recentSolved = challenge.recentSolvedAt ? 110 - challenge.recentSolvedAt * 3 : 0
  const firstBlood = challenge.bloods?.first || challenge.firstBloodTeam ? 32 : 0
  const pressure = Math.min(Math.max(challenge.submitCount - challenge.solvedCount, 0), 90) * 0.18
  const solved = Math.min(challenge.solvedCount, 100) * 0.28
  return recentSolved + statusWeight[challenge.status] + firstBlood + pressure + solved + challenge.points * 0.01
}

export function getChallengeAutoplayQueue(challenges: Challenge[]) {
  return [...challenges]
    .filter((challenge) => challenge.status !== 'locked')
    .sort((left, right) => getAutoplayPriority(right) - getAutoplayPriority(left))
}
