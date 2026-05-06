import { Billboard, Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  DoubleSide,
  MathUtils,
  MeshBasicMaterial,
  Vector3,
  type Group,
  type Mesh,
  type PerspectiveCamera,
} from 'three'
import { COLORS } from '@/components/canvas/core/coreSceneConfig'
import type { CtfSnapshot, TeamRank } from '@/types/ctf'
import type { TeamDebugSettings, TeamDebugStatus, TeamFocusMotionMode } from './teamDebug'
import type { TeamDemoEvent } from './teamDemo'
import { TeamChallengeSources } from './TeamChallengeSources'
import { TeamEnergyLinks } from './TeamEnergyLinks'
import { useTeamRankGeometry } from './teamModelAssets'
import { TeamOrbitField } from './TeamOrbitField'
import { TeamRankNodes } from './TeamRankNodes'
import { getRankSlot, rankTone } from './teamRankLayout'

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

const teamFocusConfig = {
  atlasRollLimit: 0.12,
  atlasXLimit: 0.42,
  cinematicDuration: 1.58,
  diveAtlasY: 0.22,
  diveAtlasZ: 0.14,
  divePitch: 0.37,
  diveSlotY: 0.24,
  diveSlotZ: 0.12,
  focusSlotX: 0.12,
  heroAtlasY: 0.28,
  heroAtlasZ: 0.48,
  heroPitch: 0.64,
  heroScale: 1.42,
  heroSlotY: 0.48,
  heroSlotZ: 0.58,
  lockSlotY: 0,
  lockSlotZ: 0,
  overviewPitch: 0.47,
  overviewX: 0,
  overviewY: 0.12,
  overviewZ: 0.02,
  panLimitX: 5.1,
  panLimitZ: 4.6,
  skimAtlasZ: 0.34,
  skimPitch: 0.53,
  skimSurgeZ: 0.26,
  switchArcX: 0.3,
  switchDuration: 0.84,
  switchLiftY: 0.16,
  switchSurgeMultiplier: 0.55,
  transitionDamping: 4.4,
}

function TeamCore({
  event,
  labelsVisible = true,
  snapshot,
}: {
  event: TeamDemoEvent | null
  labelsVisible?: boolean
  snapshot: CtfSnapshot
}) {
  const core = useRef<Group>(null)
  const orbitA = useRef<Group>(null)
  const orbitB = useRef<Group>(null)
  const leaderWave = useRef<Mesh>(null)
  const topThreeWave = useRef<Mesh>(null)
  const burst = useRef({ key: '', startedAt: -3 })
  const crystal = useTeamRankGeometry('TeamCoreCrystal')
  const scoreShard = useTeamRankGeometry('ScoreShard')
  const leader = snapshot.topTeams[0]
  const previousLeader = snapshot.topTeams.find((team) => team.previousRank === 1 && team.teamId !== leader?.teamId)
  const leadGap = leader ? leader.score - (snapshot.topTeams[1]?.score ?? leader.score) : 0
  const newLeader = Boolean(leader && leader.previousRank !== 1)
  const topThreeChanged = snapshot.topTeams.some((team) => (team.rank <= 3 && team.previousRank > 3) || (team.rank > 3 && team.previousRank <= 3))

  useFrame((state, delta) => {
    const key = event ? `${event.cycle}:${leader?.teamId ?? 'none'}:${newLeader ? 'leader' : topThreeChanged ? 'top3' : 'rank'}` : 'idle'
    if (key !== burst.current.key) {
      burst.current.key = key
      burst.current.startedAt = state.clock.elapsedTime
    }
    const burstAge = state.clock.elapsedTime - burst.current.startedAt
    const burstPulse = event ? Math.max(0, 1 - burstAge / (newLeader ? 2.2 : 1.55)) : 0
    if (core.current) {
      core.current.rotation.y += delta * 0.22
      core.current.position.y = 0.42 + Math.sin(state.clock.elapsedTime * 0.86) * 0.026
      core.current.scale.setScalar(1 + burstPulse * (newLeader ? 0.08 : 0.045))
    }
    if (orbitA.current) orbitA.current.rotation.y += delta * 0.36
    if (orbitB.current) orbitB.current.rotation.y -= delta * 0.22
    if (leaderWave.current) {
      leaderWave.current.scale.setScalar(0.28 + segment(burstAge, 0, 1.18) * 2.4)
      const material = leaderWave.current.material as MeshBasicMaterial
      material.opacity = (newLeader ? 0.52 : 0.28) * Math.max(0, 1 - burstAge / 1.28)
    }
    if (topThreeWave.current) {
      topThreeWave.current.scale.setScalar(0.4 + segment(burstAge, 0.18, 1.46) * 2.9)
      const material = topThreeWave.current.material as MeshBasicMaterial
      material.opacity = (topThreeChanged ? 0.32 : 0.16) * Math.max(0, 1 - Math.max(0, burstAge - 0.14) / 1.52)
    }
  })

  return (
    <group raycast={() => undefined}>
      <group ref={orbitA} position={[0, 0.18, 0]}>
        {[0.78, 1.12, 1.48].map((radius, index) => (
          <mesh key={radius} rotation={[Math.PI / 2, 0, index * 0.22]} renderOrder={20}>
            <torusGeometry args={[radius, 0.008 + index * 0.002, 8, 164, Math.PI * (1.35 + index * 0.12)]} />
            <meshBasicMaterial color={index === 1 ? COLORS.yellow : COLORS.cyan} transparent opacity={index === 1 ? 0.32 : 0.22} blending={AdditiveBlending} depthWrite={false} />
          </mesh>
        ))}
      </group>
      <group ref={orbitB} position={[0, 0.21, 0]}>
        <mesh rotation={[Math.PI / 2, 0, Math.PI * 0.3]} renderOrder={21}>
          <torusGeometry args={[1.92, 0.006, 8, 180, Math.PI * 1.1]} />
          <meshBasicMaterial color={COLORS.cyanSoft} transparent opacity={0.18} blending={AdditiveBlending} depthWrite={false} />
        </mesh>
      </group>

      <mesh ref={leaderWave} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} renderOrder={24} raycast={() => undefined}>
        <ringGeometry args={[0.68, 0.72, 128]} />
        <meshBasicMaterial color={COLORS.yellow} transparent opacity={0} side={DoubleSide} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh ref={topThreeWave} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]} renderOrder={23} raycast={() => undefined}>
        <ringGeometry args={[0.98, 1.02, 128]} />
        <meshBasicMaterial color={COLORS.cyan} transparent opacity={0} side={DoubleSide} blending={AdditiveBlending} depthWrite={false} />
      </mesh>

      <group ref={core} position={[0, 0.42, 0]} scale={1.04}>
        {crystal && (
          <mesh geometry={crystal} scale={1.18} renderOrder={28}>
            <meshStandardMaterial color={COLORS.cyan} emissive={COLORS.cyan} emissiveIntensity={0.82} metalness={0.48} roughness={0.18} transparent opacity={0.78} />
          </mesh>
        )}
        {scoreShard && (
          <mesh geometry={scoreShard} scale={1.24} renderOrder={27}>
            <meshBasicMaterial color={COLORS.yellow} transparent opacity={0.48} side={DoubleSide} blending={AdditiveBlending} depthWrite={false} />
          </mesh>
        )}
      </group>

      {labelsVisible && (
        <Billboard follow position={[0, 1.28, 0]} raycast={() => undefined}>
          <Text anchorX="center" anchorY="middle" color={newLeader ? '#ffd21f' : '#f4fbff'} fontSize={0.13} fontWeight={900} outlineColor="#05090c" outlineWidth={0.006} textAlign="center" renderOrder={46}>
            {newLeader ? 'NEW LEADER' : 'TEAM RANK CORE'}
          </Text>
          <Text anchorX="center" anchorY="middle" color="#9bddff" fontSize={0.078} fontWeight={900} outlineColor="#05090c" outlineWidth={0.004} position={[0, 0.16, 0]} renderOrder={46}>
            {leader ? `${newLeader ? `${previousLeader?.name ?? '---'} → ` : ''}${leader.name} / ${leader.score} pts / 领先 +${leadGap}` : 'WAITING'}
          </Text>
        </Billboard>
      )}

      {labelsVisible && ([
        ['2400+', '领跑梯队', 0.72],
        ['1800-2400', '强队梯队', 1.58],
        ['1200-1800', '中坚梯队', 2.46],
        ['0-1200', '新锐队伍', 3.46],
      ] as const).map(([score, label, radius]) => (
        <Billboard key={score} follow position={[0, 0.12, Number(radius)]} raycast={() => undefined}>
          <Text anchorX="center" anchorY="middle" color={score === '2400+' ? '#ffd21f' : '#9bddff'} fontSize={0.068} fontWeight={900} outlineColor="#05090c" outlineWidth={0.004} renderOrder={43}>
            {score}
          </Text>
          <Text anchorX="center" anchorY="middle" color="#c7d6dc" fontSize={0.046} fontWeight={800} outlineColor="#05090c" outlineWidth={0.003} position={[0, -0.068, 0]} renderOrder={43}>
            {label}
          </Text>
        </Billboard>
      ))}
    </group>
  )
}

function TeamFocusCard({ team }: { team: TeamRank | null }) {
  if (!team) return null

  const slot = getRankSlot(team.rank)
  const tone = rankTone(team.rank)
  const side = slot.position[0] >= 0 ? -1 : 1
  const foreground = slot.position[2] > 0.62
  const delta = team.previousRank - team.rank
  const scoreDelta = team.score - team.previousScore
  const position = [
    slot.position[0] + side * (team.rank <= 3 ? 0.96 : 0.78),
    slot.position[1] + (foreground ? 0.84 : 0.66),
    slot.position[2] + (foreground ? -0.82 : -0.12),
  ] as [number, number, number]

  return (
    <Billboard follow position={position} raycast={() => undefined}>
      <mesh position={[0, -0.02, -0.026]} renderOrder={54}>
        <planeGeometry args={[1.42, 0.72]} />
        <meshBasicMaterial color="#030a0d" transparent opacity={0.78} depthWrite={false} />
      </mesh>
      <mesh position={[-0.69, -0.02, -0.014]} renderOrder={55}>
        <planeGeometry args={[0.032, 0.62]} />
        <meshBasicMaterial color={tone} transparent opacity={0.95} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh position={[0, -0.345, -0.012]} renderOrder={55}>
        <planeGeometry args={[1.28, 0.018]} />
        <meshBasicMaterial color={tone} transparent opacity={0.58} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
      <Text anchorX="left" anchorY="middle" color="#f4fbff" fontSize={0.105} fontWeight={900} outlineColor="#05090c" outlineWidth={0.005} position={[-0.61, 0.24, 0]} renderOrder={58} maxWidth={1.08}>
        {team.name}
      </Text>
      <Text anchorX="left" anchorY="middle" color={tone} fontSize={0.064} fontWeight={900} outlineColor="#05090c" outlineWidth={0.0035} position={[-0.61, 0.09, 0]} renderOrder={58}>
        {`#${team.rank}  ${team.score} pts  ${delta > 0 ? `↑${delta}` : delta < 0 ? `↓${Math.abs(delta)}` : scoreDelta > 0 ? `+${scoreDelta}` : 'LOCK'}`}
      </Text>
      <Text anchorX="left" anchorY="middle" color="#9bddff" fontSize={0.052} fontWeight={800} outlineColor="#05090c" outlineWidth={0.003} position={[-0.61, -0.045, 0]} renderOrder={58}>
        {`${team.solves} solved  /  ${team.firstBloods} first blood`}
      </Text>
      <Text anchorX="left" anchorY="middle" color="#c7d6dc" fontSize={0.046} fontWeight={800} outlineColor="#05090c" outlineWidth={0.0028} position={[-0.61, -0.17, 0]} renderOrder={58}>
        {`主攻分类 ${team.topCategory}  /  上轮 ${team.previousScore}`}
      </Text>
      <Text anchorX="left" anchorY="middle" color="#9aa6ad" fontSize={0.036} fontWeight={700} outlineColor="#05090c" outlineWidth={0.0022} position={[-0.61, -0.285, 0]} renderOrder={58}>
        CLICK EMPTY SPACE TO RETURN ORBIT
      </Text>
    </Billboard>
  )
}

export function TeamRankAtlas({
  debugSettings,
  event,
  events,
  onClearTeam,
  onDebugStatusChange,
  onSelectTeam,
  selectedTeamId,
  snapshot,
}: {
  debugSettings: TeamDebugSettings
  event: TeamDemoEvent | null
  events: TeamDemoEvent[]
  onClearTeam: () => void
  onDebugStatusChange?: (status: TeamDebugStatus) => void
  onSelectTeam: (team: TeamRank) => void
  selectedTeamId: string | null
  snapshot: CtfSnapshot
}) {
  const atlasGroup = useRef<Group>(null)
  const mapGroup = useRef<Group>(null)
  const focusFrom = useRef(new Vector3())
  const focusTo = useRef(new Vector3())
  const focusCurrent = useRef(new Vector3())
  const focusMotion = useRef<{ id: string | null; mode: TeamFocusMotionMode; startedAt: number; switchSide: number }>({
    id: null,
    mode: 'idle',
    startedAt: 0,
    switchSide: 1,
  })
  const lastDebugReportAt = useRef(0)
  const selectedTeam = selectedTeamId ? snapshot.topTeams.find((team) => team.teamId === selectedTeamId) ?? null : null
  const rankDiff = useMemo(() => {
    const changedTeams = snapshot.topTeams.filter((team) =>
      team.rank !== team.previousRank ||
      team.score !== team.previousScore ||
      team.solves !== team.previousSolved
    )
    return {
      changed: changedTeams.length,
      demoted: changedTeams.filter((team) => team.rank > team.previousRank).length,
      promoted: changedTeams.filter((team) => team.rank < team.previousRank).length,
      scoreOnly: changedTeams.filter((team) => team.rank === team.previousRank && team.score !== team.previousScore).length,
    }
  }, [snapshot.topTeams])

  useFrame((state, delta) => {
    if (!mapGroup.current) return
    const camera = state.camera as PerspectiveCamera
    const focusSlot = selectedTeam ? getRankSlot(selectedTeam.rank) : null
    const focusPosition = focusSlot?.position ?? null
    const focusId = selectedTeam ? `${selectedTeam.teamId}:${selectedTeam.rank}` : null
    const focus = teamFocusConfig
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

    const focusAge = selectedTeam ? state.clock.elapsedTime - focusMotion.current.startedAt : 0
    const switching = focusMotion.current.mode === 'switch'
    const switchProgress = switching ? smoothstep01(focusAge / focus.switchDuration) : 1
    const switchArc = switching ? Math.sin(switchProgress * Math.PI) : 0
    if (switching) focusCurrent.current.lerpVectors(focusFrom.current, focusTo.current, switchProgress)
    else if (selectedTeam) focusCurrent.current.copy(focusTo.current)
    else focusCurrent.current.set(0, 0, 0)

    const focusX = focusCurrent.current.x
    const focusY = focusCurrent.current.y
    const focusZ = focusCurrent.current.z
    const focusProgress = focusMotion.current.mode === 'enter' ? clamp01(focusAge / focus.cinematicDuration) : selectedTeam ? 1 : 0
    const dive = switching ? 1 : segment(focusProgress, 0.04, 0.42)
    const skim = switching ? 1 : segment(focusProgress, 0.34, 0.74)
    const hero = switching ? 1 : segment(focusProgress, 0.66, 1)
    const skimRush = switching ? switchArc * focus.switchSurgeMultiplier : Math.sin(skim * Math.PI)
    const scaleBias = MathUtils.clamp((debugSettings.focusScale - 1) * 0.26, -0.04, 0.16)
    const targetScale = selectedTeam
      ? debugSettings.mapScale * (1.02 + 0.06 * dive + (focus.heroScale - 1 + scaleBias) * hero)
      : debugSettings.mapScale
    const focusSlotY = selectedTeam
      ? MathUtils.lerp(MathUtils.lerp(focus.lockSlotY, focus.diveSlotY, dive), focus.heroSlotY, hero) -
        skimRush * 0.08 +
        switchArc * focus.switchLiftY
      : 0
    const focusSlotZ = selectedTeam
      ? MathUtils.lerp(MathUtils.lerp(focus.lockSlotZ, focus.diveSlotZ, dive), focus.heroSlotZ, hero) +
        skimRush * focus.skimSurgeZ
      : 0
    const atlasPitch = selectedTeam
      ? MathUtils.lerp(MathUtils.lerp(MathUtils.lerp(focus.overviewPitch, focus.divePitch, dive), focus.skimPitch, skim), focus.heroPitch, hero)
      : focus.overviewPitch
    const atlasY = selectedTeam
      ? MathUtils.lerp(MathUtils.lerp(focus.overviewY, focus.diveAtlasY, dive), focus.heroAtlasY, hero)
      : focus.overviewY
    const atlasZ = selectedTeam
      ? MathUtils.lerp(MathUtils.lerp(MathUtils.lerp(focus.overviewZ, focus.diveAtlasZ, dive), focus.skimAtlasZ, skim), focus.heroAtlasZ, hero)
      : focus.overviewZ
    const transition = 1 - Math.exp(-focus.transitionDamping * delta)
    const scaleTransition = 1 - Math.exp(-(focus.transitionDamping + 0.45) * delta)
    const idleFloatY = Math.sin(state.clock.elapsedTime * 0.45) * 0.012
    const focusedMapY = focusSlotY - focusY * targetScale

    if (atlasGroup.current) {
      atlasGroup.current.position.x = MathUtils.lerp(
        atlasGroup.current.position.x,
        selectedTeam ? MathUtils.clamp(-focusX * 0.048, -focus.atlasXLimit, focus.atlasXLimit) : focus.overviewX,
        transition,
      )
      atlasGroup.current.position.y = MathUtils.lerp(atlasGroup.current.position.y, atlasY, transition)
      atlasGroup.current.position.z = MathUtils.lerp(atlasGroup.current.position.z, atlasZ, transition)
      atlasGroup.current.rotation.x = MathUtils.lerp(atlasGroup.current.rotation.x, atlasPitch, transition)
      atlasGroup.current.rotation.z = MathUtils.lerp(
        atlasGroup.current.rotation.z,
        selectedTeam ? MathUtils.clamp(focusX * 0.018 - focusZ * 0.009, -focus.atlasRollLimit, focus.atlasRollLimit) : 0,
        transition,
      )
    }

    if (selectedTeam) {
      const targetYaw = MathUtils.clamp(-focusX * 0.09 + focusZ * 0.04, -0.62, 0.62) * (0.5 + hero * 0.5)
      mapGroup.current.rotation.y = MathUtils.lerp(mapGroup.current.rotation.y, targetYaw, transition * 0.42)
      const cos = Math.cos(mapGroup.current.rotation.y)
      const sin = Math.sin(mapGroup.current.rotation.y)
      const rotatedX = focusX * cos + focusZ * sin
      const rotatedZ = -focusX * sin + focusZ * cos
      mapGroup.current.position.x = MathUtils.lerp(
        mapGroup.current.position.x,
        MathUtils.clamp(
          focus.focusSlotX + focusMotion.current.switchSide * switchArc * focus.switchArcX - rotatedX * targetScale + debugSettings.focusOffsetX,
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
      mapGroup.current.rotation.y += delta * ((Math.PI * 2) / 80) * debugSettings.rotateSpeed
      mapGroup.current.position.x = MathUtils.lerp(mapGroup.current.position.x, 0, transition)
      mapGroup.current.position.z = MathUtils.lerp(mapGroup.current.position.z, 0, transition)
    }
    mapGroup.current.position.y = MathUtils.lerp(mapGroup.current.position.y, selectedTeam ? focusedMapY : idleFloatY, scaleTransition)
    mapGroup.current.scale.setScalar(MathUtils.lerp(mapGroup.current.scale.x, targetScale, scaleTransition))

    if (onDebugStatusChange && debugSettings.enabled && state.clock.elapsedTime - lastDebugReportAt.current > 0.18) {
      lastDebugReportAt.current = state.clock.elapsedTime
      const focusPhase: TeamDebugStatus['focusPhase'] = switching
        ? 'switch'
        : !selectedTeam
          ? 'overview'
          : hero > 0.5
            ? 'hero'
            : skim > 0.5
              ? 'skim'
              : 'dive'
      onDebugStatusChange({
        cameraFov: camera.fov,
        cameraPosition: [camera.position.x, camera.position.y, camera.position.z],
        changedTeams: rankDiff.changed,
        demotedTeams: rankDiff.demoted,
        eventCycle: event?.cycle ?? 0,
        eventTeam: event?.team ?? '-',
        eventTone: event?.eventTone ?? '-',
        focusPhase,
        focusProgress: switching ? switchProgress : focusProgress,
        focusRank: selectedTeam?.rank ?? 0,
        focusTeam: selectedTeam?.name ?? '-',
        mapRotationY: mapGroup.current.rotation.y,
        mapScale: mapGroup.current.scale.x,
        motionMode: focusMotion.current.mode,
        promotedTeams: rankDiff.promoted,
        rankDelta: event?.rankDelta ?? (selectedTeam ? selectedTeam.previousRank - selectedTeam.rank : 0),
        scoreOnlyTeams: rankDiff.scoreOnly,
      })
    }
  })

  return (
    <group
      ref={atlasGroup}
      scale={0.96}
      position={[0, 0.12, 0.02]}
      rotation={[0.47, 0, 0]}
      onClick={() => {
        if (selectedTeam) onClearTeam()
      }}
    >
      <group ref={mapGroup}>
        <TeamOrbitField />
        <TeamChallengeSources events={events} />
        <TeamCore event={event} labelsVisible={!selectedTeam} snapshot={snapshot} />
        <TeamEnergyLinks events={events} />
        <TeamRankNodes
          events={events}
          onSelectTeam={onSelectTeam}
          selectedTeamId={selectedTeamId}
          teams={snapshot.topTeams}
          totalTeams={snapshot.totalTeams}
        />
        <TeamFocusCard team={selectedTeam} />
      </group>
    </group>
  )
}
