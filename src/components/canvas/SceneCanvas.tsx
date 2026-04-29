import { Canvas } from '@react-three/fiber'
import { PerspectiveCamera, Stars } from '@react-three/drei'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { DataCore } from '@/components/canvas/DataCore'
import { ChallengeAtlas } from '@/components/canvas/challenge/ChallengeAtlas'
import { useChallengeAutoDirector } from '@/components/canvas/challenge/ChallengeAutoDirector'
import type { Challenge, ChallengeCategory, ChallengeViewMode } from '@/components/canvas/challenge/challengeTypes'
import { challengeData } from '@/components/canvas/challenge/challengeData'
import { CameraRig } from '@/components/canvas/core/CameraRig'
import { HudPanelMeshes } from '@/components/canvas/HudPanelMeshes'
import type { CtfSnapshot } from '@/types/ctf'
import type { CategoryKey } from '@/components/canvas/core/coreSceneConfig'
import type { Group } from 'three'

export type DashboardViewMode = '实时态势' | '战队视图' | '题目视图' | '攻击视图'

export function SceneCanvas({
  snapshot,
  viewMode,
}: {
  snapshot: CtfSnapshot
  viewMode: DashboardViewMode
}) {
  const [activeCategory, setActiveCategory] = useState<CategoryKey | null>(null)
  const [activeChallengeCategory, setActiveChallengeCategory] = useState<ChallengeCategory | null>(null)
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null)
  const [challengeViewMode, setChallengeViewMode] = useState<ChallengeViewMode>('autoplay-overview')
  const [autoplayFocusChallenge, setAutoplayFocusChallenge] = useState<Challenge | null>(null)
  const dataCoreGroup = useRef<Group>(null)
  const isChallengeView = viewMode === '题目视图'

  const detailChallenge = selectedChallenge ?? autoplayFocusChallenge

  const clearChallengeFocus = useCallback(() => {
    setActiveChallengeCategory(null)
    setSelectedChallenge(null)
  }, [])

  const { afterManualAction, clearSchedule, scheduleNextAutoplayStep, touchInteraction } = useChallengeAutoDirector({
    challengeTabActive: isChallengeView,
    challenges: challengeData,
    onClearSelection: () => {
      setActiveChallengeCategory(null)
      setSelectedChallenge(null)
    },
    onFocusChallenge: setAutoplayFocusChallenge,
    setActiveCategory: setActiveChallengeCategory,
    setViewMode: setChallengeViewMode,
    viewMode: challengeViewMode,
  })

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveCategory(null)
        clearChallengeFocus()
        if (isChallengeView) {
          setChallengeViewMode('autoplay-overview')
          setAutoplayFocusChallenge(null)
          afterManualAction()
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [clearChallengeFocus, isChallengeView, afterManualAction])

  useEffect(() => {
    queueMicrotask(() => {
      setActiveCategory(null)
      clearChallengeFocus()
      setChallengeViewMode('autoplay-overview')
      setAutoplayFocusChallenge(null)
    })
  }, [viewMode, clearChallengeFocus])

  useEffect(() => {
    if (!isChallengeView) return
    queueMicrotask(() => {
      setChallengeViewMode('autoplay-overview')
      setAutoplayFocusChallenge(null)
      clearSchedule()
      scheduleNextAutoplayStep()
    })
  }, [isChallengeView, clearSchedule, scheduleNextAutoplayStep])

  return (
    <Canvas
      className="scene-canvas"
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      dpr={[1, 2]}
      resize={{ scroll: true, offsetSize: true, debounce: { scroll: 0, resize: 0 } }}
      onPointerMissed={() => {
        setActiveCategory(null)
        clearChallengeFocus()
        if (isChallengeView) {
          setChallengeViewMode('autoplay-overview')
          setAutoplayFocusChallenge(null)
          afterManualAction()
        }
      }}
    >
      <fog attach="fog" args={['#05090c', 10, 32]} />
      <PerspectiveCamera makeDefault position={[0, 3.62, 9.48]} fov={41} />
      <ambientLight intensity={0.3} />
      <pointLight position={[7, 7, 4]} intensity={1.7} color="#aee9ff" />
      <pointLight position={[-6, 4, 5]} intensity={1.15} color="#f6d252" />
      <pointLight position={[0, 2, 0]} intensity={1.45} color="#fff4a6" />
      {!isChallengeView && <CameraRig activeCategory={activeCategory} dataCoreGroup={dataCoreGroup} />}
      <Suspense fallback={null}>
        <Stars
          radius={90}
          depth={45}
          count={2200}
          factor={2.4}
          fade
          speed={0.22}
        />
        <HudPanelMeshes
          snapshot={snapshot}
          dimmed={isChallengeView ? false : Boolean(activeCategory)}
          selectedChallenge={detailChallenge}
          viewMode={isChallengeView ? 'challenge' : 'realtime'}
        />
        {isChallengeView ? (
          <ChallengeAtlas
            activeCategory={activeChallengeCategory}
            autoplayFocusChallenge={autoplayFocusChallenge}
            detailChallenge={detailChallenge}
            onClearCategory={() => {
              clearChallengeFocus()
              setChallengeViewMode('autoplay-overview')
              setAutoplayFocusChallenge(null)
              afterManualAction()
            }}
            onCategoryManual={(category) => {
              setActiveChallengeCategory(category)
              setSelectedChallenge(null)
              setAutoplayFocusChallenge(null)
              setChallengeViewMode('manual-category')
              afterManualAction()
            }}
            onChallengeManual={(challenge) => {
              setActiveChallengeCategory(challenge.category)
              setSelectedChallenge(challenge)
              setAutoplayFocusChallenge(null)
              setChallengeViewMode('manual-challenge')
              touchInteraction()
              clearSchedule()
            }}
            selectedChallenge={selectedChallenge}
            viewMode={challengeViewMode}
          />
        ) : (
          <group ref={dataCoreGroup} scale={0.96} position={[0, 0.28, 0.02]} rotation={[0.53, 0, 0]}>
            <DataCore
              activeCategory={activeCategory}
              onClearCategory={() => setActiveCategory(null)}
              onSelectCategory={setActiveCategory}
              snapshot={snapshot}
            />
          </group>
        )}
      </Suspense>
    </Canvas>
  )
}
