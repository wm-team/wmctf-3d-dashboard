import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getChallengeAutoplayQueue } from './challengeAutoplay'
import type { Challenge } from './challengeTypes'

export type ChallengeViewMode = 'autoplay-overview' | 'autoplay-focus' | 'manual-challenge'

const overviewMs = 7600
const focusMs = 8200
const idleMs = 14000

export function useChallengeAutoDirector({
  autoFocusEnabled = true,
  challenges,
  debugClearFocusStep = 0,
  debugFocusDirection = 1,
  debugFocusStep = 0,
  onClearFocus,
  onFocusChallenge,
}: {
  autoFocusEnabled?: boolean
  challenges: Challenge[]
  debugClearFocusStep?: number
  debugFocusDirection?: number
  debugFocusStep?: number
  onClearFocus: () => void
  onFocusChallenge: (challenge: Challenge) => void
}) {
  const [mode, setMode] = useState<ChallengeViewMode>('autoplay-overview')
  const [focusIndex, setFocusIndex] = useState(0)
  const [lastInteractionAt, setLastInteractionAt] = useState(0)
  const autoTick = useRef(0)
  const lastAutoFocusEnabled = useRef(autoFocusEnabled)
  const lastDebugClearFocusStep = useRef(0)
  const lastDebugFocusStep = useRef(0)
  const queue = useMemo(() => getChallengeAutoplayQueue(challenges), [challenges])
  const focusedChallenge = mode === 'autoplay-focus' && queue.length > 0 ? queue[focusIndex % queue.length] : null

  useEffect(() => {
    autoTick.current = performance.now()
  }, [])

  const resumeAutoplay = useCallback(() => {
    autoTick.current = performance.now()
    setMode('autoplay-overview')
    onClearFocus()
  }, [onClearFocus])

  const markManualChallenge = useCallback((challenge: Challenge) => {
    void challenge
    setMode('manual-challenge')
    setLastInteractionAt(performance.now())
  }, [])

  const markInteraction = useCallback(() => {
    setLastInteractionAt(performance.now())
  }, [])

  const stepFocus = useCallback((direction: number) => {
    if (queue.length === 0) return
    const offset = direction < 0 ? -1 : 1
    const nextIndex = (focusIndex + offset + queue.length) % queue.length
    autoTick.current = performance.now()
    setMode('autoplay-focus')
    setFocusIndex(nextIndex)
    onFocusChallenge(queue[nextIndex])
  }, [focusIndex, onFocusChallenge, queue])

  useEffect(() => {
    if (autoFocusEnabled) {
      if (!lastAutoFocusEnabled.current) {
        autoTick.current = performance.now()
        setMode('autoplay-overview')
        onClearFocus()
      }
      lastAutoFocusEnabled.current = true
      return
    }
    if (lastAutoFocusEnabled.current) {
      autoTick.current = performance.now()
      setMode('autoplay-overview')
      onClearFocus()
    }
    lastAutoFocusEnabled.current = false
  }, [autoFocusEnabled, onClearFocus])

  useEffect(() => {
    if (debugFocusStep <= 0 || debugFocusStep === lastDebugFocusStep.current) return
    lastDebugFocusStep.current = debugFocusStep
    stepFocus(debugFocusDirection)
  }, [debugFocusDirection, debugFocusStep, stepFocus])

  useEffect(() => {
    if (debugClearFocusStep <= 0 || debugClearFocusStep === lastDebugClearFocusStep.current) return
    lastDebugClearFocusStep.current = debugClearFocusStep
    resumeAutoplay()
  }, [debugClearFocusStep, resumeAutoplay])

  useEffect(() => {
    if (!autoFocusEnabled || mode !== 'manual-challenge') return undefined
    const id = window.setInterval(() => {
      if (performance.now() - lastInteractionAt > idleMs) resumeAutoplay()
    }, 650)
    return () => window.clearInterval(id)
  }, [autoFocusEnabled, lastInteractionAt, mode, resumeAutoplay])

  useEffect(() => {
    if (!autoFocusEnabled) return undefined
    if (mode === 'manual-challenge') return undefined
    const id = window.setInterval(() => {
      const now = performance.now()
      const elapsed = now - autoTick.current
      if (mode === 'autoplay-overview' && elapsed > overviewMs) {
        autoTick.current = now
        setMode('autoplay-focus')
        if (queue.length > 0) onFocusChallenge(queue[focusIndex % queue.length])
      } else if (mode === 'autoplay-focus' && elapsed > focusMs) {
        const nextIndex = queue.length > 0 ? (focusIndex + 1) % queue.length : 0
        autoTick.current = now
        setFocusIndex(nextIndex)
        if (queue.length > 0) onFocusChallenge(queue[nextIndex])
      }
    }, 500)
    return () => window.clearInterval(id)
  }, [autoFocusEnabled, focusIndex, mode, onFocusChallenge, queue])

  return {
    focusedChallenge,
    markInteraction,
    markManualChallenge,
    mode,
    resumeAutoplay,
  }
}
