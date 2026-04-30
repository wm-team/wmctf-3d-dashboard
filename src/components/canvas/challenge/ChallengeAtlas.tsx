import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { MathUtils, PerspectiveCamera, Vector3, type Group } from 'three'
import { useChallengeAutoDirector } from './ChallengeAutoDirector'
import type { ChallengeDebugSettings } from './challengeDebug'
import { ChallengeCore } from './ChallengeCore'
import { ChallengeFocusTrace } from './ChallengeFocusTrace'
import { ChallengeCategoryLandmarks } from './ChallengeModelSet'
import { ChallengeNodes } from './ChallengeNodes'
import { ChallengeTerrain } from './ChallengeTerrain'
import { challengeData, getChallengePosition } from './challengeData'
import type { Challenge, ChallengeCategory } from './challengeTypes'
import { challengeVisualConfig } from './challengeVisualConfig'

function clamp01(value: number) {
  return MathUtils.clamp(value, 0, 1)
}

function smoothstep01(value: number) {
  const t = clamp01(value)
  return t * t * t * (t * (t * 6 - 15) + 10)
}

function segment(value: number, start: number, end: number) {
  return smoothstep01((value - start) / Math.max(end - start, 0.0001))
}

type FocusMotionMode = 'idle' | 'enter' | 'switch'

function ChallengeAtlasCameraRig({
  debugSettings,
}: {
  debugSettings: ChallengeDebugSettings
}) {
  const lookAt = useRef(new Vector3(0, 0.1, 0))
  const targetPosition = useMemo(() => new Vector3(), [])
  const targetLookAt = useMemo(() => new Vector3(), [])

  useFrame((state) => {
    const camera = state.camera as PerspectiveCamera
    targetPosition.set(debugSettings.cameraX, debugSettings.cameraY, debugSettings.cameraZ)
    targetLookAt.set(debugSettings.lookAtX, debugSettings.lookAtY, debugSettings.lookAtZ)

    camera.fov += (debugSettings.fov - camera.fov) * 0.08
    camera.position.lerp(targetPosition, 0.08)
    lookAt.current.lerp(targetLookAt, 0.08)
    camera.lookAt(lookAt.current)
    camera.updateProjectionMatrix()
  })

  return null
}

export function ChallengeAtlas({
  activeCategory,
  debugSettings,
  onClearCategory,
  onSelectCategory,
  onSelectChallenge,
  selectedChallenge,
}: {
  activeCategory: ChallengeCategory | null
  debugSettings: ChallengeDebugSettings
  onClearCategory: () => void
  onSelectCategory: (category: ChallengeCategory) => void
  onSelectChallenge: (challenge: Challenge) => void
  selectedChallenge: Challenge | null
}) {
  const atlasGroup = useRef<Group>(null)
  const mapGroup = useRef<Group>(null)
  const focusFrom = useRef(new Vector3())
  const focusTo = useRef(new Vector3())
  const focusCurrent = useRef(new Vector3())
  const focusMotion = useRef<{ id: string | null; mode: FocusMotionMode; startedAt: number; switchSide: number }>({
    id: null,
    mode: 'idle',
    startedAt: 0,
    switchSide: 1,
  })
  const lastSolveFxNonce = useRef(0)
  const [solveFxTarget, setSolveFxTarget] = useState<{ challengeId: string | null; nonce: number }>({
    challengeId: null,
    nonce: 0,
  })
  const challenges = useMemo(() => challengeData, [])
  const director = useChallengeAutoDirector({
    autoFocusEnabled: debugSettings.autoFocusEnabled,
    challenges,
    debugClearFocusStep: debugSettings.clearFocusStep,
    debugFocusDirection: debugSettings.focusDirection,
    debugFocusStep: debugSettings.focusStep,
    onClearFocus: onClearCategory,
    onFocusChallenge: onSelectChallenge,
  })
  const stats = useMemo(
    () => ({
      hot: challenges.filter((challenge) => challenge.status === 'hot').length,
      solved: challenges.filter((challenge) => challenge.status === 'solved').length,
      total: challenges.length,
    }),
    [challenges],
  )
  const focusedCategory = selectedChallenge?.category ?? director.focusedChallenge?.category ?? activeCategory
  const focusedChallenge = selectedChallenge ?? director.focusedChallenge
  const handleSelectChallenge = useCallback((challenge: Challenge) => {
    director.markManualChallenge(challenge)
    onSelectCategory(challenge.category)
    onSelectChallenge(challenge)
  }, [director, onSelectCategory, onSelectChallenge])

  useEffect(() => {
    if (debugSettings.solveFxNonce <= 0 || debugSettings.solveFxNonce === lastSolveFxNonce.current) return
    lastSolveFxNonce.current = debugSettings.solveFxNonce
    const fallbackChallenge = challenges[Math.floor(Math.random() * challenges.length)] ?? null
    const targetChallenge = focusedChallenge ?? fallbackChallenge
    setSolveFxTarget({
      challengeId: targetChallenge?.id ?? null,
      nonce: debugSettings.solveFxNonce,
    })
  }, [challenges, debugSettings.solveFxNonce, focusedChallenge])

  useFrame((state, delta) => {
    if (!mapGroup.current) return
    const focusPosition = focusedChallenge ? getChallengePosition(focusedChallenge) : null
    const focusId = focusedChallenge?.id ?? null
    const focus = challengeVisualConfig.focus
    if (focusMotion.current.id !== focusId) {
      const hadFocus = Boolean(focusMotion.current.id)
      const hasNextFocus = Boolean(focusId && focusPosition)
      focusFrom.current.copy(hadFocus ? focusCurrent.current : focusTo.current)
      if (focusPosition) {
        focusTo.current.set(focusPosition[0], focusPosition[1], focusPosition[2])
        if (!hadFocus) focusFrom.current.copy(focusTo.current)
      } else {
        focusTo.current.set(0, 0, 0)
      }
      const deltaX = focusTo.current.x - focusFrom.current.x
      const deltaZ = focusTo.current.z - focusFrom.current.z
      focusMotion.current.id = focusId
      focusMotion.current.mode = hasNextFocus ? (hadFocus ? 'switch' : 'enter') : 'idle'
      focusMotion.current.startedAt = state.clock.elapsedTime
      focusMotion.current.switchSide = Math.sign(Math.abs(deltaX) > Math.abs(deltaZ) ? deltaX : deltaZ) || focusMotion.current.switchSide || 1
    }
    const focusAge = focusedChallenge ? state.clock.elapsedTime - focusMotion.current.startedAt : 0
    const switching = focusMotion.current.mode === 'switch'
    const switchProgress = switching ? smoothstep01(focusAge / focus.switchDuration) : 1
    const switchArc = switching ? Math.sin(switchProgress * Math.PI) : 0
    if (switching) focusCurrent.current.lerpVectors(focusFrom.current, focusTo.current, switchProgress)
    else if (focusedChallenge) focusCurrent.current.copy(focusTo.current)
    else focusCurrent.current.set(0, 0, 0)

    const focusX = focusCurrent.current.x
    const focusY = focusCurrent.current.y
    const focusZ = focusCurrent.current.z
    const focusProgress = focusMotion.current.mode === 'enter' ? clamp01(focusAge / focus.cinematicDuration) : focusedChallenge ? 1 : 0
    const dive = switching ? 1 : segment(focusProgress, 0.04, 0.42)
    const skim = switching ? 1 : segment(focusProgress, 0.34, 0.74)
    const hero = switching ? 1 : segment(focusProgress, 0.66, 1)
    const skimRush = switching ? switchArc * focus.switchSurgeMultiplier : Math.sin(skim * Math.PI)
    const scaleBias = MathUtils.clamp((debugSettings.focusScale - 1) * 0.26, -0.04, 0.16)
    const targetScale = focusedChallenge
      ? debugSettings.mapScale * (1.02 + 0.06 * dive + (focus.heroScale - 1 + scaleBias) * hero)
      : debugSettings.mapScale
    const focusSlotY = focusedChallenge
      ? MathUtils.lerp(
          MathUtils.lerp(focus.lockSlotY, focus.diveSlotY, dive),
          focus.heroSlotY,
          hero,
        ) - skimRush * 0.08 + switchArc * focus.switchLiftY
      : 0
    const focusSlotZ = focusedChallenge
      ? MathUtils.lerp(
          MathUtils.lerp(focus.lockSlotZ, focus.diveSlotZ, dive),
          focus.heroSlotZ,
          hero,
        ) + skimRush * focus.skimSurgeZ
      : 0
    const atlasPitch = focusedChallenge
      ? MathUtils.lerp(
          MathUtils.lerp(
            MathUtils.lerp(focus.overviewPitch, focus.divePitch, dive),
            focus.skimPitch,
            skim,
          ),
          focus.heroPitch,
          hero,
        )
      : focus.overviewPitch
    const atlasY = focusedChallenge
      ? MathUtils.lerp(
          MathUtils.lerp(focus.overviewY, focus.diveAtlasY, dive),
          focus.heroAtlasY,
          hero,
        )
      : focus.overviewY
    const atlasZ = focusedChallenge
      ? MathUtils.lerp(
          MathUtils.lerp(
            MathUtils.lerp(focus.overviewZ, focus.diveAtlasZ, dive),
            focus.skimAtlasZ,
            skim,
          ),
          focus.heroAtlasZ,
          hero,
        )
      : focus.overviewZ
    const transition = 1 - Math.exp(-focus.transitionDamping * delta)
    const scaleTransition = 1 - Math.exp(-(focus.transitionDamping + 0.45) * delta)
    const idleFloatY = Math.sin(state.clock.elapsedTime * 0.45) * 0.012
    const focusedMapY = focusSlotY - focusY * targetScale
    if (atlasGroup.current) {
      atlasGroup.current.position.x = MathUtils.lerp(
        atlasGroup.current.position.x,
        focusedChallenge ? MathUtils.clamp(-focusX * 0.048, -focus.atlasXLimit, focus.atlasXLimit) : focus.overviewX,
        transition,
      )
      atlasGroup.current.position.y = MathUtils.lerp(
        atlasGroup.current.position.y,
        atlasY,
        transition,
      )
      atlasGroup.current.position.z = MathUtils.lerp(
        atlasGroup.current.position.z,
        atlasZ,
        transition,
      )
      atlasGroup.current.rotation.x = MathUtils.lerp(
        atlasGroup.current.rotation.x,
        atlasPitch,
        transition,
      )
      atlasGroup.current.rotation.z = MathUtils.lerp(
        atlasGroup.current.rotation.z,
        focusedChallenge ? MathUtils.clamp(focusX * 0.018 - focusZ * 0.009, -focus.atlasRollLimit, focus.atlasRollLimit) : 0,
        transition,
      )
    }
    if (focusedChallenge) {
      const targetYaw = MathUtils.clamp(-focusX * 0.036 + focusZ * 0.018, -0.16, 0.16) * (0.5 + hero * 0.5)
      mapGroup.current.rotation.y = MathUtils.lerp(mapGroup.current.rotation.y, targetYaw, transition * 0.42)
      const cos = Math.cos(mapGroup.current.rotation.y)
      const sin = Math.sin(mapGroup.current.rotation.y)
      const rotatedX = focusX * cos + focusZ * sin
      const rotatedZ = -focusX * sin + focusZ * cos
      mapGroup.current.position.x = MathUtils.lerp(
        mapGroup.current.position.x,
        MathUtils.clamp(
          focus.focusSlotX +
            focusMotion.current.switchSide * switchArc * focus.switchArcX -
            rotatedX * targetScale +
            debugSettings.focusOffsetX,
          -focus.panLimitX,
          focus.panLimitX,
        ),
        transition,
      )
      mapGroup.current.position.z = MathUtils.lerp(
        mapGroup.current.position.z,
        MathUtils.clamp(focusSlotZ - rotatedZ * targetScale + debugSettings.focusOffsetZ, -focus.panLimitZ, focus.panLimitZ),
        transition,
      )
    } else {
      mapGroup.current.rotation.y += delta * ((Math.PI * 2) / 150) * debugSettings.rotateSpeed
      mapGroup.current.position.x = MathUtils.lerp(mapGroup.current.position.x, 0, transition)
      mapGroup.current.position.z = MathUtils.lerp(mapGroup.current.position.z, 0, transition)
    }
    mapGroup.current.position.y = MathUtils.lerp(mapGroup.current.position.y, focusedChallenge ? focusedMapY : idleFloatY, scaleTransition)
    mapGroup.current.scale.setScalar(MathUtils.lerp(mapGroup.current.scale.x, targetScale, scaleTransition))
  })

  return (
    <>
      <ChallengeAtlasCameraRig
        debugSettings={debugSettings}
      />
      <group
        ref={atlasGroup}
        scale={[0.96, 0.96, 0.96]}
        position={[0, 0.3, 0.02]}
        rotation={[0.53, 0, 0]}
        onClick={() => {
          director.markInteraction()
          if (activeCategory || selectedChallenge) onClearCategory()
        }}
      >
        <group ref={mapGroup}>
          <ChallengeTerrain activeCategory={focusedCategory} />
          <ChallengeCategoryLandmarks activeCategory={focusedCategory} />
          <ChallengeFocusTrace challenge={focusedChallenge} challenges={challenges} />
          <ChallengeNodes
            activeCategory={focusedCategory}
            challenges={challenges}
            focusedChallenge={focusedChallenge}
            forceSolveFxChallengeId={solveFxTarget.challengeId}
            forceSolveFxNonce={solveFxTarget.nonce}
            onSelectChallenge={handleSelectChallenge}
            selectedChallenge={selectedChallenge}
          />
          <ChallengeCore hot={stats.hot} solved={stats.solved} total={stats.total} />
        </group>
      </group>
    </>
  )
}
