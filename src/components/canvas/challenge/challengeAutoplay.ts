import type { Challenge } from './challengeTypes'

/** Priority score for autoplay rotation (higher = sooner). */
export function autoplayPriority(challenge: Challenge): number {
  let score = 0
  score += challenge.heat * 0.15
  score += challenge.solvedCount * 0.08
  score += challenge.submitCount * 0.02
  if (challenge.status === 'hot') score += 240
  if (challenge.bloods?.first || challenge.firstBloodTeam) score += 180
  if (challenge.status === 'solved') score += 40
  return score
}

export function sortChallengesForAutoplay(list: Challenge[]): Challenge[] {
  return [...list].sort((a, b) => autoplayPriority(b) - autoplayPriority(a))
}

export function buildAutoplayRotation(challenges: Challenge[]): string[] {
  const pendingSolve = challenges.filter((c) => c.status === 'unsolved')
  const hot = challenges.filter((c) => c.status === 'hot')
  const fb = challenges.filter((c) => c.bloods?.first || c.firstBloodTeam)
  const rest = challenges.filter((c) => !pendingSolve.includes(c) && !hot.includes(c) && !fb.includes(c))

  const ordered: Challenge[] = []
  const pushUnique = (c: Challenge) => {
    if (!ordered.find((x) => x.id === c.id)) ordered.push(c)
  }
  pendingSolve.forEach(pushUnique)
  hot.forEach(pushUnique)
  fb.forEach(pushUnique)
  sortChallengesForAutoplay(rest).forEach(pushUnique)
  challenges.forEach((c) => {
    if (!ordered.find((x) => x.id === c.id)) ordered.push(c)
  })
  return ordered.map((c) => c.id)
}

export function pickRandomDuration(min: number, max: number): number {
  return min + Math.random() * (max - min)
}
