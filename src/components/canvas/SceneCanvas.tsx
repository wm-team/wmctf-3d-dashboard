import { Canvas, useThree } from '@react-three/fiber'
import { PerspectiveCamera, Stars } from '@react-three/drei'
import { Suspense, useEffect, useRef, useState } from 'react'
import { DataCore } from '@/components/canvas/DataCore'
import { ChallengeAtlas } from '@/components/canvas/challenge/ChallengeAtlas'
import { ChallengePostProcessing } from '@/components/canvas/challenge/ChallengePostProcessing'
import { ChallengeSceneLighting } from '@/components/canvas/challenge/ChallengeSceneLighting'
import {
  defaultChallengeDebugSettings,
  type ChallengeDebugSettings,
} from '@/components/canvas/challenge/challengeDebug'
import type { Challenge, ChallengeCategory } from '@/components/canvas/challenge/challengeTypes'
import { CameraRig } from '@/components/canvas/core/CameraRig'
import { RealtimePostProcessing } from '@/components/canvas/core/RealtimePostProcessing'
import { RealtimeSceneLighting } from '@/components/canvas/core/RealtimeSceneLighting'
import { HudPanelMeshes } from '@/components/canvas/HudPanelMeshes'
import type { CtfSnapshot } from '@/types/ctf'
import type { CategoryKey } from '@/components/canvas/core/coreSceneConfig'
import { ACESFilmicToneMapping, SRGBColorSpace, Vector3, type Group, type WebGLRenderer } from 'three'

export type DashboardViewMode = '实时态势' | '战队视图' | '题目视图' | '攻击视图'

function configureRenderer(gl: WebGLRenderer, exposure: number) {
  gl.outputColorSpace = SRGBColorSpace
  gl.toneMapping = ACESFilmicToneMapping
  gl.toneMappingExposure = exposure
}

function SceneRendererSettings({ isChallengeView }: { isChallengeView: boolean }) {
  const { gl } = useThree()

  useEffect(() => {
    configureRenderer(gl, isChallengeView ? 1.04 : 1)
  }, [gl, isChallengeView])

  return null
}

export function SceneCanvas({
  challengeDebug = defaultChallengeDebugSettings,
  snapshot,
  viewMode,
}: {
  challengeDebug?: ChallengeDebugSettings
  snapshot: CtfSnapshot
  viewMode: DashboardViewMode
}) {
  const [activeCategory, setActiveCategory] = useState<CategoryKey | null>(null)
  const [activeChallengeCategory, setActiveChallengeCategory] = useState<ChallengeCategory | null>(null)
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null)
  const dataCoreGroup = useRef<Group>(null)
  const activeFocusWorldPoint = useRef(new Vector3())
  const isChallengeView = viewMode === '题目视图'

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveCategory(null)
        setActiveChallengeCategory(null)
        setSelectedChallenge(null)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    const id = window.setTimeout(() => {
      setActiveCategory(null)
      setActiveChallengeCategory(null)
      setSelectedChallenge(null)
    }, 0)
    return () => window.clearTimeout(id)
  }, [viewMode])

  const clearChallengeFocus = () => {
    setActiveChallengeCategory(null)
    setSelectedChallenge(null)
  }

  return (
    <Canvas
      className="scene-canvas"
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      dpr={[1, 2]}
      onCreated={({ gl }) => {
        configureRenderer(gl, 1)
      }}
      resize={{ scroll: true, offsetSize: true, debounce: { scroll: 0, resize: 0 } }}
      onPointerMissed={() => {
        setActiveCategory(null)
        clearChallengeFocus()
      }}
    >
      <SceneRendererSettings isChallengeView={isChallengeView} />
      <fog attach="fog" args={['#05090c', 10, 32]} />
      <PerspectiveCamera makeDefault position={[0, 3.62, 9.48]} fov={41} />
      {isChallengeView ? (
        <ChallengeSceneLighting />
      ) : (
        <RealtimeSceneLighting />
      )}
      {!isChallengeView && (
        <CameraRig
          activeCategory={activeCategory}
          activeFocusWorldPoint={activeFocusWorldPoint}
          dataCoreGroup={dataCoreGroup}
        />
      )}
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
          selectedChallenge={selectedChallenge}
          viewMode={isChallengeView ? 'challenge' : 'realtime'}
        />
        {isChallengeView ? (
          <ChallengeAtlas
            activeCategory={activeChallengeCategory}
            debugSettings={challengeDebug}
            onClearCategory={clearChallengeFocus}
            onSelectCategory={(category) => {
              setActiveChallengeCategory(category)
              setSelectedChallenge(null)
            }}
            onSelectChallenge={(challenge) => {
              setActiveChallengeCategory(challenge.category)
              setSelectedChallenge(challenge)
            }}
            selectedChallenge={selectedChallenge}
          />
        ) : (
          <group ref={dataCoreGroup} scale={0.96} position={[0, 0.28, 0.02]} rotation={[0.53, 0, 0]}>
            <DataCore
              activeCategory={activeCategory}
              activeFocusWorldPoint={activeFocusWorldPoint}
              onClearCategory={() => setActiveCategory(null)}
              onSelectCategory={setActiveCategory}
              snapshot={snapshot}
            />
          </group>
        )}
      </Suspense>
      {isChallengeView && <ChallengePostProcessing />}
      {!isChallengeView && <RealtimePostProcessing />}
    </Canvas>
  )
}
