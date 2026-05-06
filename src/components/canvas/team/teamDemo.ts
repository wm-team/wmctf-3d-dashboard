import { useEffect, useMemo, useRef, useState } from 'react'
import type { CtfSnapshot, SolveEvent, TeamRank } from '@/types/ctf'

export type TeamDemoEvent = SolveEvent & {
  cycle: number
  eventTone: NonNullable<SolveEvent['eventTone']>
  rankEffects: Array<{
    previousRank: number
    rank: number
    teamId: string
  }>
  targetRank: number
  teamId: string
}

type TeamDemoState = {
  cycle: number
  event: TeamDemoEvent | null
  events: TeamDemoEvent[]
  recentSolves: SolveEvent[]
  teams: TeamRank[]
}

type ScenarioEvent = {
  category: string
  challenge: string
  eventTone: NonNullable<SolveEvent['eventTone']>
  points: number
  teamId: string
}

const scenarios: ScenarioEvent[] = [
  { teamId: 'team-r3kapig', category: 'Web', challenge: 'babylogin', points: 300, eventTone: 'highValue' },
  { teamId: 'team-aaa', category: 'Crypto', challenge: 'easy_rsa', points: 250, eventTone: 'firstBlood' },
  { teamId: 'team-tianshu', category: 'Misc', challenge: 'simple_misc', points: 200, eventTone: 'normal' },
  { teamId: 'team-bytebandits', category: 'Web', challenge: 'include_you', points: 180, eventTone: 'breakthrough' },
  { teamId: 'team-0x300', category: 'Web', challenge: 'babylogin', points: 160, eventTone: 'firstBlood' },
  { teamId: 'team-cloud', category: 'Forensics', challenge: 'find_me', points: 220, eventTone: 'normal' },
  { teamId: 'team-nullroute', category: 'Pwn', challenge: 'heapmaze', points: 420, eventTone: 'breakthrough' },
  { teamId: 'team-hashcat', category: 'Crypto', challenge: 'lattice_box', points: 360, eventTone: 'highValue' },
  { teamId: 'team-snowcrash', category: 'Misc', challenge: 'cold_boot', points: 300, eventTone: 'normal' },
]

function formatCycleTime(currentTime: string, cycle: number) {
  const [, timePart = '15:30:24'] = currentTime.split(' ')
  const [hour = '15', minute = '30', second = '24'] = timePart.split(':')
  const totalSeconds = Number(hour) * 3600 + Number(minute) * 60 + Number(second) + cycle * 5
  const nextHour = Math.floor(totalSeconds / 3600) % 24
  const nextMinute = Math.floor((totalSeconds % 3600) / 60)
  const nextSecond = totalSeconds % 60
  return [nextHour, nextMinute, nextSecond].map((value) => String(value).padStart(2, '0')).join(':')
}

function buildInitialState(snapshot: CtfSnapshot): TeamDemoState {
  return {
    cycle: 0,
    event: null,
    events: [],
    recentSolves: snapshot.recentSolves,
    teams: snapshot.topTeams.map((team) => ({ ...team })),
  }
}

function advanceState(snapshot: CtfSnapshot, state: TeamDemoState): TeamDemoState {
  const nextCycle = state.cycle + 1
  const scenario = scenarios[state.cycle % scenarios.length]
  const primedTeams = state.teams.map((team) => ({
    ...team,
    previousRank: team.rank,
    previousScore: team.score,
    previousSolved: team.solves,
  }))

  const boostedTeams = primedTeams.map((team) => {
    if (team.teamId !== scenario.teamId) return team
    return {
      ...team,
      firstBloods: team.firstBloods + (scenario.eventTone === 'firstBlood' ? 1 : 0),
      score: team.score + scenario.points,
      solves: team.solves + 1,
      topCategory: scenario.category,
    }
  })

  const rankedTeams = boostedTeams
    .sort((left, right) => right.score - left.score || left.previousRank - right.previousRank)
    .map((team, index) => ({ ...team, rank: index + 1 }))
  const target = rankedTeams.find((team) => team.teamId === scenario.teamId) ?? rankedTeams[0]
  const rankDelta = target.previousRank - target.rank
  const rankEffects = rankedTeams
    .filter((team) => team.rank !== team.previousRank && (team.rank <= 10 || team.previousRank <= 10 || team.teamId === target.teamId))
    .map((team) => ({
      previousRank: team.previousRank,
      rank: team.rank,
      teamId: team.teamId,
    }))
  const event: TeamDemoEvent = {
    badge: scenario.eventTone === 'firstBlood' ? 'FIRST BLOOD' : undefined,
    category: scenario.category,
    challenge: scenario.challenge,
    cycle: nextCycle,
    eventTone: scenario.eventTone,
    points: scenario.points,
    rankEffects,
    rankDelta,
    targetRank: target.rank,
    team: target.name,
    teamId: target.teamId,
    time: formatCycleTime(snapshot.currentTime, nextCycle),
  }

  return {
    cycle: nextCycle,
    event,
    events: [event, ...state.events].slice(0, 5),
    recentSolves: [event, ...state.recentSolves].slice(0, 12),
    teams: rankedTeams,
  }
}

export function useTeamDemoSnapshot(snapshot: CtfSnapshot, enabled: boolean) {
  const [state, setState] = useState<TeamDemoState>(() => buildInitialState(snapshot))
  const lastDebugEventNonce = useRef(0)

  useEffect(() => {
    if (!enabled) return undefined
    const interval = window.setInterval(() => {
      setState((current) => advanceState(snapshot, current))
    }, 5000)

    return () => window.clearInterval(interval)
  }, [enabled, snapshot])

  const triggerDebugEvent = (eventNonce: number) => {
    if (!enabled || eventNonce <= 0 || eventNonce === lastDebugEventNonce.current) return
    lastDebugEventNonce.current = eventNonce
    setState((current) => advanceState(snapshot, current))
  }

  const teamSnapshot = useMemo<CtfSnapshot>(
    () => ({
      ...snapshot,
      phase: '战队视图',
      recentSolves: state.recentSolves,
      solvedChallenges: snapshot.solvedChallenges + state.cycle,
      submissionsPerMinute: snapshot.submissionsPerMinute + state.cycle * 12,
      topTeams: state.teams,
    }),
    [snapshot, state],
  )

  return {
    cycle: state.cycle,
    event: state.event,
    events: state.events,
    snapshot: teamSnapshot,
    triggerDebugEvent,
  }
}
