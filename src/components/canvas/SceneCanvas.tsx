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
import { TeamCameraRig } from '@/components/canvas/team/TeamCameraRig'
import { useTeamDemoSnapshot } from '@/components/canvas/team/teamDemo'
import {
  defaultTeamDebugSettings,
  type TeamDebugSettings,
  type TeamDebugStatus,
} from '@/components/canvas/team/teamDebug'
import { TeamRankAtlas } from '@/components/canvas/team/TeamRankAtlas'
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
  onTeamDebugStatusChange,
  snapshot,
  teamDebug = defaultTeamDebugSettings,
  viewMode,
}: {
  challengeDebug?: ChallengeDebugSettings
  onTeamDebugStatusChange?: (status: TeamDebugStatus) => void
  snapshot: CtfSnapshot
  teamDebug?: TeamDebugSettings
  viewMode: DashboardViewMode
}) {
  const [activeCategory, setActiveCategory] = useState<CategoryKey | null>(null)
  const [activeChallengeCategory, setActiveChallengeCategory] = useState<ChallengeCategory | null>(null)
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null)
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const dataCoreGroup = useRef<Group>(null)
  const activeFocusWorldPoint = useRef(new Vector3())
  const lastTeamClearFocusStep = useRef(0)
  const lastTeamFocusStep = useRef(0)
  const lastTeamEventNonce = useRef(0)
  const isChallengeView = viewMode === '题目视图'
  const isTeamView = viewMode === '战队视图'
  const teamDemo = useTeamDemoSnapshot(snapshot, isTeamView)
  const viewSnapshot = isTeamView ? teamDemo.snapshot : snapshot

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveCategory(null)
        setActiveChallengeCategory(null)
        setSelectedChallenge(null)
        setSelectedTeamId(null)
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
      setSelectedTeamId(null)
    }, 0)
    return () => window.clearTimeout(id)
  }, [viewMode])

  const clearChallengeFocus = () => {
    setActiveChallengeCategory(null)
    setSelectedChallenge(null)
  }

  useEffect(() => {
    if (!isTeamView || teamDebug.focusStep <= 0 || teamDebug.focusStep === lastTeamFocusStep.current) return
    lastTeamFocusStep.current = teamDebug.focusStep
    const teams = viewSnapshot.topTeams.slice(0, 30)
    if (!teams.length) return
    const currentIndex = teams.findIndex((team) => team.teamId === selectedTeamId)
    const direction = teamDebug.focusDirection >= 0 ? 1 : -1
    const nextIndex = currentIndex < 0
      ? direction > 0 ? 0 : teams.length - 1
      : (currentIndex + direction + teams.length) % teams.length
    const id = window.setTimeout(() => setSelectedTeamId(teams[nextIndex].teamId), 0)
    return () => window.clearTimeout(id)
  }, [isTeamView, selectedTeamId, teamDebug.focusDirection, teamDebug.focusStep, viewSnapshot.topTeams])

  useEffect(() => {
    if (!isTeamView || teamDebug.clearFocusStep <= 0 || teamDebug.clearFocusStep === lastTeamClearFocusStep.current) return
    lastTeamClearFocusStep.current = teamDebug.clearFocusStep
    const id = window.setTimeout(() => setSelectedTeamId(null), 0)
    return () => window.clearTimeout(id)
  }, [isTeamView, teamDebug.clearFocusStep])

  useEffect(() => {
    if (!isTeamView || teamDebug.eventNonce <= 0 || teamDebug.eventNonce === lastTeamEventNonce.current) return
    lastTeamEventNonce.current = teamDebug.eventNonce
    teamDemo.triggerDebugEvent(teamDebug.eventNonce)
  }, [isTeamView, teamDebug.eventNonce, teamDemo])

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
        setSelectedTeamId(null)
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
      {!isChallengeView && !isTeamView && (
        <CameraRig
          activeCategory={activeCategory}
          activeFocusWorldPoint={activeFocusWorldPoint}
          dataCoreGroup={dataCoreGroup}
        />
      )}
      {isTeamView && (
        <TeamCameraRig
          debugSettings={teamDebug}
          event={teamDemo.event}
          selectedTeamId={selectedTeamId}
          teams={viewSnapshot.topTeams}
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
          snapshot={viewSnapshot}
          dimmed={isChallengeView || isTeamView ? false : Boolean(activeCategory)}
          selectedChallenge={selectedChallenge}
          viewMode={isChallengeView ? 'challenge' : isTeamView ? 'team' : 'realtime'}
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
        ) : isTeamView ? (
          <TeamRankAtlas
            debugSettings={teamDebug}
            event={teamDemo.event}
            events={teamDemo.events}
            onClearTeam={() => setSelectedTeamId(null)}
            onDebugStatusChange={onTeamDebugStatusChange}
            onSelectTeam={(team) => setSelectedTeamId(team.teamId)}
            selectedTeamId={selectedTeamId}
            snapshot={viewSnapshot}
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
