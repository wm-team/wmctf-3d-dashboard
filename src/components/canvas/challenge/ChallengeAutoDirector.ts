import { useCallback, useEffect, useRef } from 'react'
import type { Challenge, ChallengeCategory, ChallengeViewMode } from './challengeTypes'
import { buildAutoplayRotation, pickRandomDuration } from './challengeAutoplay'

export type ChallengeDirectorCallbacks = {
  onClearSelection: () => void
  onFocusChallenge: (challenge: Challenge | null) => void
  setActiveCategory: (c: ChallengeCategory | null) => void
  setViewMode: (m: ChallengeViewMode) => void
}

type UseDirectorArgs = ChallengeDirectorCallbacks & {
  challengeTabActive: boolean
  challenges: Challenge[]
  viewMode: ChallengeViewMode
}

const FOCUS_MIN = 6
const FOCUS_MAX = 10
const OVERVIEW_MIN = 8
const OVERVIEW_MAX = 12
const IDLE_MIN = 12
const IDLE_MAX = 15

export function useChallengeAutoDirector({
  challengeTabActive,
  challenges,
  onClearSelection,
  onFocusChallenge,
  setActiveCategory,
  setViewMode,
  viewMode,
}: UseDirectorArgs) {
  const rotationRef = useRef<string[]>([])
  const rotationIndexRef = useRef(0)
  const scheduleRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const idleUntilRef = useRef<number>(0)
  const prevStatusRef = useRef<Map<string, string>>(new Map())
  const viewModeRef = useRef(viewMode)
  const challengesRef = useRef(challenges)
  useEffect(() => {
    viewModeRef.current = viewMode
    challengesRef.current = challenges
  }, [viewMode, challenges])

  const clearSchedule = useCallback(() => {
    if (scheduleRef.current) {
      clearTimeout(scheduleRef.current)
      scheduleRef.current = null
    }
  }, [])

  const armIdleDeadline = useCallback(() => {
    idleUntilRef.current = Date.now() + pickRandomDuration(IDLE_MIN, IDLE_MAX) * 1000
  }, [])

  const touchInteraction = useCallback(() => {
    armIdleDeadline()
  }, [armIdleDeadline])

  const scheduleNextAutoplayStep = useCallback(() => {
    clearSchedule()
    if (!challengeTabActive) return
    const vm = viewModeRef.current
    if (vm === 'manual-category' || vm === 'manual-challenge') return

    if (vm === 'autoplay-overview') {
      const delay = pickRandomDuration(OVERVIEW_MIN, OVERVIEW_MAX) * 1000
      scheduleRef.current = setTimeout(() => {
        const rotation = rotationRef.current
        if (rotation.length === 0) return
        const id = rotation[rotationIndexRef.current % rotation.length]
        rotationIndexRef.current += 1
        const ch = challengesRef.current.find((c) => c.id === id)
        if (!ch) return
        setViewMode('autoplay-focus')
        setActiveCategory(null)
        onFocusChallenge(ch)
      }, delay)
      return
    }

    if (vm === 'autoplay-focus') {
      const delay = pickRandomDuration(FOCUS_MIN, FOCUS_MAX) * 1000
      scheduleRef.current = setTimeout(() => {
        setViewMode('autoplay-overview')
        onFocusChallenge(null)
      }, delay)
    }
  }, [
    challengeTabActive,
    clearSchedule,
    onFocusChallenge,
    setActiveCategory,
    setViewMode,
  ])

  useEffect(() => {
    rotationRef.current = buildAutoplayRotation(challenges)
  }, [challenges])

  useEffect(() => {
    if (viewMode === 'manual-category' || viewMode === 'manual-challenge') {
      armIdleDeadline()
    }
  }, [viewMode, armIdleDeadline])

  useEffect(() => {
    if (!challengeTabActive) {
      clearSchedule()
      return
    }
    scheduleNextAutoplayStep()
    return clearSchedule
  }, [challengeTabActive, viewMode, scheduleNextAutoplayStep, clearSchedule])

  useEffect(() => {
    if (!challengeTabActive) return
    const tick = window.setInterval(() => {
      const vm = viewModeRef.current
      if (vm !== 'manual-category' && vm !== 'manual-challenge') return
      if (Date.now() < idleUntilRef.current) return
      onClearSelection()
      setViewMode('autoplay-overview')
      onFocusChallenge(null)
      armIdleDeadline()
    }, 400)
    return () => clearInterval(tick)
  }, [challengeTabActive, onClearSelection, onFocusChallenge, setViewMode, armIdleDeadline])

  useEffect(() => {
    if (!challengeTabActive || challenges.length === 0) return
    for (const c of challenges) {
      const prev = prevStatusRef.current.get(c.id)
      if (prev === 'unsolved' && c.status === 'solved') {
        setViewMode('autoplay-focus')
        setActiveCategory(null)
        onFocusChallenge(c)
        rotationRef.current = [c.id, ...buildAutoplayRotation(challenges).filter((id) => id !== c.id)]
        rotationIndexRef.current = 1
        clearSchedule()
        scheduleNextAutoplayStep()
        break
      }
      prevStatusRef.current.set(c.id, c.status)
    }
  }, [
    challengeTabActive,
    challenges,
    clearSchedule,
    onFocusChallenge,
    scheduleNextAutoplayStep,
    setActiveCategory,
    setViewMode,
  ])

  const afterManualAction = useCallback(() => {
    clearSchedule()
    touchInteraction()
    queueMicrotask(() => scheduleNextAutoplayStep())
  }, [clearSchedule, touchInteraction, scheduleNextAutoplayStep])

  return {
    afterManualAction,
    clearSchedule,
    scheduleNextAutoplayStep,
    touchInteraction,
  }
}
