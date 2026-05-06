import { Billboard, Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AdditiveBlending,
  Color,
  DoubleSide,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  RingGeometry,
  TubeGeometry,
  Vector3,
  type Group,
} from 'three'
import type { TeamRank } from '@/types/ctf'
import type { TeamDemoEvent } from './teamDemo'
import {
  clamp01,
  eventKey,
  eventPalette,
  makeRankMotionCurve,
  rankMoveLabel,
  rankMoveTone,
  smootherstep,
} from './teamEventVisuals'
import { useTeamRankGeometry, type TeamRankKitNode } from './teamModelAssets'
import { getRankSlot, rankTone } from './teamRankLayout'

function crownNodeName(rank: number): TeamRankKitNode | null {
  if (rank === 1) return 'TeamCrownGold'
  if (rank === 2) return 'TeamCrownSilver'
  if (rank === 3) return 'TeamCrownBronze'
  return null
}

function podiumNodeName(rank: number): TeamRankKitNode | null {
  if (rank === 1) return 'RankPodiumGold'
  if (rank === 2) return 'RankPodiumSilver'
  if (rank === 3) return 'RankPodiumBronze'
  return null
}

function applyOpacity(group: Group, opacity: number) {
  group.traverse((object) => {
    if (!(object instanceof Mesh)) return
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    materials.forEach((material) => {
      if (!(material instanceof MeshBasicMaterial) && !(material instanceof MeshStandardMaterial)) return
      const base = typeof material.userData.baseOpacity === 'number' ? material.userData.baseOpacity : material.opacity
      material.userData.baseOpacity = base
      material.transparent = true
      material.opacity = Math.min(1, base * opacity)
    })
  })
}

function TeamNode({
  events,
  onSelectTeam,
  selected,
  subdued,
  team,
}: {
  events: TeamDemoEvent[]
  onSelectTeam: (team: TeamRank) => void
  selected: boolean
  subdued: boolean
  team: TeamRank
}) {
  const group = useRef<Group>(null)
  const ring = useRef<Mesh>(null)
  const liftRing = useRef<Mesh>(null)
  const rankAura = useRef<Mesh>(null)
  const motion = useRef({
    eventKey: '',
    path: makeRankMotionCurve(team.previousRank, team.rank),
    previousRank: team.previousRank,
    rank: team.previousRank,
    startedAt: 0,
  })
  const scoreState = useRef({
    from: team.previousScore,
    key: `${team.teamId}:${team.score}`,
    startedAt: 0,
    to: team.score,
  })
  const scoreRef = useRef(team.previousScore)
  const [displayScore, setDisplayScore] = useState(team.previousScore)
  const pulse = useRef(0)
  const slot = getRankSlot(team.rank)
  const previousSlot = getRankSlot(team.previousRank)
  const tone = rankTone(team.rank)
  const motionLabel = rankMoveLabel(team.rank, team.previousRank, team.score, team.previousScore)
  const motionTone = rankMoveTone(team.rank, team.previousRank, team.score, team.previousScore)
  const event = events.find((item) => item.teamId === team.teamId) ?? null
  const activeEventPalette = event?.teamId === team.teamId ? eventPalette(event) : null
  const scoreShard = useTeamRankGeometry('ScoreShard')
  const crownGold = useTeamRankGeometry('TeamCrownGold')
  const crownSilver = useTeamRankGeometry('TeamCrownSilver')
  const crownBronze = useTeamRankGeometry('TeamCrownBronze')
  const podiumGold = useTeamRankGeometry('RankPodiumGold')
  const podiumSilver = useTeamRankGeometry('RankPodiumSilver')
  const podiumBronze = useTeamRankGeometry('RankPodiumBronze')
  const crownName = crownNodeName(team.rank)
  const crown = crownName === 'TeamCrownGold' ? crownGold : crownName === 'TeamCrownSilver' ? crownSilver : crownName === 'TeamCrownBronze' ? crownBronze : null
  const podiumName = podiumNodeName(team.rank)
  const podium = podiumName === 'RankPodiumGold' ? podiumGold : podiumName === 'RankPodiumSilver' ? podiumSilver : podiumName === 'RankPodiumBronze' ? podiumBronze : null

  useFrame((state, delta) => {
    const target = group.current
    if (!target) return
    if (motion.current.rank !== team.rank || motion.current.previousRank !== team.previousRank) {
      motion.current.path = makeRankMotionCurve(team.previousRank, team.rank)
      motion.current.previousRank = team.previousRank
      motion.current.rank = team.rank
      motion.current.startedAt = state.clock.elapsedTime
    }
    const rankChanged = team.rank !== team.previousRank
    const progress = rankChanged
      ? clamp01((state.clock.elapsedTime - motion.current.startedAt - 0.28) / (team.rank < team.previousRank ? 1.34 : 1.1))
      : 1
    const eased = smootherstep(progress)
    const to = new Vector3(...slot.position)
    target.position.copy(rankChanged ? motion.current.path.getPointAt(eased) : to)

    const eventKey = event ? `${event.cycle}-${event.teamId}` : ''
    if (event?.teamId === team.teamId && eventKey !== motion.current.eventKey) {
      motion.current.eventKey = eventKey
      pulse.current = 1
    }
    pulse.current = Math.max(0, pulse.current - delta * 0.78)
    const idle = Math.sin(state.clock.elapsedTime * 1.15 + team.rank) * 0.018
    const focusScale = selected ? 1.22 : subdued ? 0.94 : 1
    const scoreBoost = event?.teamId === team.teamId ? 0.15 : 0.12
    const rankBoost = team.rank < team.previousRank ? 0.05 * Math.sin(progress * Math.PI) : 0
    const targetScale = slot.scale * focusScale * (1 + Math.sin(pulse.current * Math.PI) * scoreBoost + rankBoost)
    target.scale.setScalar(target.scale.x + (targetScale - target.scale.x) * 0.1)
    target.position.y += idle
    target.rotation.y = state.clock.elapsedTime * (team.rank <= 3 ? 0.18 : 0.1) + slot.angle * 0.12

    if (ring.current) {
      ring.current.rotation.z -= delta * (team.rank <= 3 ? 1.18 : 0.62)
      const material = ring.current.material as MeshBasicMaterial
      material.color.set(activeEventPalette?.accent ?? tone)
      material.opacity = (team.rank <= 3 ? 0.42 : 0.24) + Math.sin(pulse.current * Math.PI) * 0.28
    }
    if (liftRing.current) {
      liftRing.current.scale.setScalar(0.9 + Math.sin(pulse.current * Math.PI) * 1.1)
      const material = liftRing.current.material as MeshBasicMaterial
      material.color.set(activeEventPalette?.border ?? tone)
      material.opacity = Math.sin(pulse.current * Math.PI) * 0.34
    }
    if (rankAura.current) {
      rankAura.current.rotation.z += delta * (team.rank < team.previousRank ? 1.7 : -0.82)
      rankAura.current.scale.setScalar(1 + Math.sin(progress * Math.PI) * 0.18)
      const material = rankAura.current.material as MeshBasicMaterial
      material.opacity = rankChanged ? Math.max(0, 1 - progress) * (team.rank < team.previousRank ? 0.54 : 0.24) : 0
    }

    const scoreKey = `${team.teamId}:${team.score}`
    if (scoreState.current.key !== scoreKey) {
      scoreState.current = {
        from: team.previousScore,
        key: scoreKey,
        startedAt: state.clock.elapsedTime,
        to: team.score,
      }
      scoreRef.current = team.previousScore
      setDisplayScore(team.previousScore)
    }
    const scoreProgress = clamp01((state.clock.elapsedTime - scoreState.current.startedAt) / 1.08)
    const nextScore = Math.round(MathUtils.lerp(scoreState.current.from, scoreState.current.to, smootherstep(scoreProgress)))
    if (scoreRef.current !== nextScore) {
      scoreRef.current = nextScore
      setDisplayScore(nextScore)
    }
    applyOpacity(target, selected ? 1 : subdued ? 0.32 : team.rank > 10 ? 0.52 : 1)
  })

  const primaryLabelSize = team.rank <= 3 ? 0.12 : team.rank <= 10 ? 0.088 : 0.052
  const secondaryLabelSize = team.rank <= 3 ? 0.082 : team.rank <= 10 ? 0.058 : 0.036
  const labelVisible = selected || !subdued

  return (
    <group ref={group} position={previousSlot.position} scale={previousSlot.scale}>
      <mesh
        position={[0, team.rank <= 3 ? 0.36 : 0.26, 0]}
        renderOrder={61}
        onClick={(pointerEvent) => {
          pointerEvent.stopPropagation()
          onSelectTeam(team)
        }}
        onPointerEnter={(pointerEvent) => {
          pointerEvent.stopPropagation()
          document.body.style.cursor = 'pointer'
        }}
        onPointerLeave={() => {
          document.body.style.cursor = 'default'
        }}
      >
        <sphereGeometry args={[team.rank <= 3 ? 0.48 : team.rank <= 10 ? 0.42 : 0.34, 12, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {podium && (
        <mesh geometry={podium} position={[0, -0.16, 0]} renderOrder={18} raycast={() => undefined}>
          <meshStandardMaterial
            color={tone}
            emissive={tone}
            emissiveIntensity={0.3}
            metalness={0.7}
            roughness={0.24}
            transparent
            opacity={0.5}
          />
        </mesh>
      )}

      <mesh ref={ring} rotation={[Math.PI / 2, 0, 0]} renderOrder={22} raycast={() => undefined}>
        <torusGeometry args={[team.rank <= 3 ? 0.34 : 0.27, 0.008, 6, 86]} />
        <meshBasicMaterial color={tone} transparent opacity={0.26} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh ref={rankAura} rotation={[-Math.PI / 2, 0, 0]} renderOrder={22} raycast={() => undefined}>
        <torusGeometry args={[team.rank <= 3 ? 0.45 : 0.36, 0.01, 7, 96, Math.PI * 1.55]} />
        <meshBasicMaterial color={motionTone} transparent opacity={0} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh ref={liftRing} rotation={[-Math.PI / 2, 0, 0]} renderOrder={23} raycast={() => undefined}>
        <ringGeometry args={[0.26, 0.3, 88]} />
        <meshBasicMaterial color={tone} transparent opacity={0} side={DoubleSide} blending={AdditiveBlending} depthWrite={false} />
      </mesh>

      <mesh position={[0, 0.18, 0]} renderOrder={24} raycast={() => undefined}>
        <boxGeometry args={[0.22, 0.22, 0.22]} />
        <meshStandardMaterial
          color={tone}
          emissive={tone}
          emissiveIntensity={team.rank <= 3 ? 0.82 : 0.48}
          metalness={0.44}
          roughness={0.2}
          transparent
          opacity={team.rank <= 10 ? 0.86 : 0.44}
        />
      </mesh>

      {scoreShard && (
        <mesh geometry={scoreShard} position={[0, 0.18, 0]} scale={0.5} renderOrder={25} raycast={() => undefined}>
          <meshBasicMaterial color={tone} transparent opacity={0.38} blending={AdditiveBlending} depthWrite={false} />
        </mesh>
      )}
      {crown && (
        <mesh geometry={crown} position={[0, 0.52, 0]} scale={0.3} renderOrder={26} raycast={() => undefined}>
          <meshStandardMaterial color={tone} emissive={tone} emissiveIntensity={0.82} metalness={0.78} roughness={0.18} transparent opacity={0.9} />
        </mesh>
      )}

      {labelVisible && (
        <Billboard follow position={[0, team.rank <= 3 ? 0.84 : team.rank <= 10 ? 0.62 : 0.42, 0]} raycast={() => undefined}>
          <Text anchorX="center" anchorY="middle" color={selected ? '#ffffff' : '#f4fbff'} fontSize={primaryLabelSize} fontWeight={900} outlineColor="#05090c" outlineWidth={0.006} renderOrder={44} maxWidth={0.95}>
            {team.name}
          </Text>
          <Text anchorX="center" anchorY="middle" color={tone} fontSize={secondaryLabelSize} fontWeight={900} outlineColor="#05090c" outlineWidth={0.004} position={[0, team.rank <= 10 ? -0.115 : -0.072, 0]} renderOrder={44}>
            {`#${team.rank}  ${displayScore}  ${team.solves}题`}
          </Text>
          {team.rank <= 10 && motionLabel && (
            <Text anchorX="center" anchorY="middle" color={motionTone} fontSize={0.052} fontWeight={900} outlineColor="#05090c" outlineWidth={0.003} position={[0, -0.195, 0]} renderOrder={44}>
              {motionLabel}
            </Text>
          )}
        </Billboard>
      )}
    </group>
  )
}

function RankMotionTrace({ event }: { event: TeamDemoEvent }) {
  const group = useRef<Group>(null)
  const age = useRef(0)
  const currentEventKey = eventKey(event)
  const traces = useMemo(
    () =>
      event.rankEffects
        .slice(0, 8)
        .map((effect) => {
          const palette = event.teamId === effect.teamId ? eventPalette(event) : null
          const promoted = effect.rank < effect.previousRank
          return {
            color: palette?.border ?? (promoted ? '#ffd21f' : '#7ebdff'),
            geometry: new TubeGeometry(makeRankMotionCurve(effect.previousRank, effect.rank), 84, promoted ? 0.012 : 0.008, 6, false),
            promoted,
            teamId: effect.teamId,
          }
        }),
    [event],
  )

  useEffect(() => {
    age.current = 0
  }, [currentEventKey])

  useEffect(
    () => () => {
      traces.forEach((trace) => trace.geometry.dispose())
    },
    [traces],
  )

  useFrame((_, delta) => {
    age.current += delta
    const preview = Math.max(0, 1 - age.current / 0.34)
    const tail = Math.max(0, 1 - Math.max(0, age.current - 0.34) / 1.55)
    group.current?.children.forEach((child, index) => {
      const material = (child as Mesh).material
      if (material instanceof MeshBasicMaterial) {
        const boosted = traces[index]?.promoted ? 1 : 0.62
        material.opacity = Math.max(preview * 0.72, tail * 0.34) * boosted
      }
    })
  })

  if (traces.length === 0) return null

  return (
    <group ref={group} raycast={() => undefined}>
      {traces.map((trace) => (
        <mesh key={trace.teamId} geometry={trace.geometry} renderOrder={31}>
          <meshBasicMaterial color={trace.color} transparent opacity={0} blending={AdditiveBlending} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

function RankMotionTraces({ events }: { events: TeamDemoEvent[] }) {
  return (
    <group raycast={() => undefined}>
      {events.map((event) => (
        <RankMotionTrace key={eventKey(event)} event={event} />
      ))}
    </group>
  )
}

function TeamCloudPoints({ startRank, totalTeams }: { startRank: number; totalTeams: number }) {
  const group = useRef<Group>(null)
  const ringGeometry = useMemo(() => new RingGeometry(0.024, 0.033, 10), [])
  const points = useMemo(
    () =>
      Array.from({ length: Math.min(Math.max(totalTeams - startRank + 1, 0), 64) }, (_, index) => {
        const rank = index + startRank
        const slot = getRankSlot(rank)
        return {
          color: new Color(index % 5 === 0 ? '#ffd21f' : '#69f6ff'),
          position: slot.position,
          scale: 0.75 + (index % 4) * 0.16,
        }
      }),
    [startRank, totalTeams],
  )

  useFrame((state, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.018
    group.current?.children.forEach((child, index) => {
      child.position.y = points[index].position[1] + Math.sin(state.clock.elapsedTime * 0.8 + index) * 0.012
    })
  })

  return (
    <group ref={group} raycast={() => undefined}>
      {points.map((point, index) => (
        <mesh key={index} geometry={ringGeometry} position={point.position} rotation={[-Math.PI / 2, 0, 0]} scale={point.scale}>
          <meshBasicMaterial color={point.color} transparent opacity={0.18} blending={AdditiveBlending} depthWrite={false} side={DoubleSide} />
        </mesh>
      ))}
    </group>
  )
}

export function TeamRankNodes({
  events,
  onSelectTeam,
  selectedTeamId,
  teams,
  totalTeams,
}: {
  events: TeamDemoEvent[]
  onSelectTeam: (team: TeamRank) => void
  selectedTeamId: string | null
  teams: TeamRank[]
  totalTeams: number
}) {
  const displayedTeams = teams.slice(0, 30)

  return (
    <group>
      <TeamCloudPoints startRank={displayedTeams.length + 1} totalTeams={totalTeams} />
      <RankMotionTraces events={events} />
      {displayedTeams.map((team) => (
        <TeamNode
          key={team.teamId}
          events={events}
          onSelectTeam={onSelectTeam}
          selected={selectedTeamId === team.teamId}
          subdued={Boolean(selectedTeamId && selectedTeamId !== team.teamId)}
          team={team}
        />
      ))}
    </group>
  )
}
