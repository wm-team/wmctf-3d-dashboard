import { CatmullRomCurve3, MathUtils, Vector3 } from 'three'
import type { SolveEvent } from '@/types/ctf'
import type { TeamDemoEvent } from './teamDemo'
import { getRankSlot } from './teamRankLayout'

export type TeamEventTone = NonNullable<SolveEvent['eventTone']>

export type TeamEventPalette = {
  accent: string
  border: string
  core: string
  end: string
  label: string
  pulse: string
  start: string
}

export const TEAM_EVENT_PALETTES: Record<TeamEventTone, TeamEventPalette> = {
  normal: {
    accent: '#69f6ff',
    border: '#9bddff',
    core: '#d9fbff',
    end: '#b9fbff',
    label: 'SOLVE',
    pulse: '#69f6ff',
    start: '#27d8ff',
  },
  highValue: {
    accent: '#ffd21f',
    border: '#ffe566',
    core: '#fff5b4',
    end: '#ffd21f',
    label: 'HIGH',
    pulse: '#fff1a8',
    start: '#69f6ff',
  },
  firstBlood: {
    accent: '#b46cff',
    border: '#ffd21f',
    core: '#fff1a8',
    end: '#ffd21f',
    label: 'FIRST',
    pulse: '#b46cff',
    start: '#a35cff',
  },
  breakthrough: {
    accent: '#ff7844',
    border: '#69f6ff',
    core: '#d9fbff',
    end: '#69f6ff',
    label: 'BREAK',
    pulse: '#ff7844',
    start: '#ff6038',
  },
}

export function eventPalette(eventOrTone?: TeamDemoEvent | TeamEventTone | null) {
  const tone = typeof eventOrTone === 'string' ? eventOrTone : eventOrTone?.eventTone
  return TEAM_EVENT_PALETTES[tone ?? 'normal']
}

export function clamp01(value: number) {
  return MathUtils.clamp(value, 0, 1)
}

export function smootherstep(value: number) {
  const t = clamp01(value)
  return t * t * t * (t * (t * 6 - 15) + 10)
}

export function segment(value: number, start: number, end: number) {
  return smootherstep((value - start) / Math.max(end - start, 0.0001))
}

export function eventKey(event: TeamDemoEvent | null) {
  return event ? `${event.cycle}:${event.teamId}:${event.challenge}:${event.points}` : 'idle'
}

export function rankMoveTone(rank: number, previousRank: number, score: number, previousScore: number) {
  if (rank < previousRank) return '#ffd21f'
  if (rank > previousRank) return '#7ebdff'
  if (score > previousScore) return '#69f6ff'
  return 'rgba(203, 216, 221, 0.58)'
}

export function rankMoveLabel(rank: number, previousRank: number, score: number, previousScore: number) {
  const delta = previousRank - rank
  if (delta > 0) return `↑ ${delta}`
  if (delta < 0) return `↓ ${Math.abs(delta)}`
  if (score > previousScore) return `+${score - previousScore}`
  return ''
}

export function makeRankMotionCurve(previousRank: number, rank: number) {
  const previousSlot = getRankSlot(previousRank)
  const slot = getRankSlot(rank)
  const from = new Vector3(...previousSlot.position)
  const to = new Vector3(...slot.position)
  const promoted = rank < previousRank
  const distance = from.distanceTo(to)
  const midpoint = from.clone().lerp(to, 0.5)
  const tangent = new Vector3(-midpoint.z, 0, midpoint.x)
  if (tangent.lengthSq() < 0.0001) tangent.set(1, 0, 0)
  tangent.normalize()
  const side = promoted ? 1 : -0.55
  const topThreeCrossing = previousRank > 3 && rank <= 3
  const leaderCrossing = previousRank !== 1 && rank === 1
  const lift = promoted
    ? leaderCrossing
      ? 0.92
      : topThreeCrossing
        ? 0.76
        : 0.54
    : 0.26

  midpoint
    .add(tangent.multiplyScalar(Math.min(0.52, 0.16 + distance * 0.08) * side))
    .add(new Vector3(0, lift, 0))

  return new CatmullRomCurve3([from, midpoint, to])
}

export function sampleRankMotion(previousRank: number, rank: number, progress: number) {
  if (previousRank === rank) return new Vector3(...getRankSlot(rank).position)
  return makeRankMotionCurve(previousRank, rank).getPointAt(smootherstep(progress))
}
