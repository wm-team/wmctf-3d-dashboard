import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Line as ThreeLine,
  LineBasicMaterial,
  MeshBasicMaterial,
  MeshStandardMaterial,
  type Group,
} from 'three'
import { challengeCategories, firstBloodName, getChallengePosition, getCategoryMeta } from './challengeData'
import { ChallengeNodeBillboard, ChallengeSolveFx } from './ChallengeNodeBillboard'
import type { Challenge, ChallengeCategory, ChallengeStatus, ChallengeViewMode } from './challengeTypes'

function statusColor(status: ChallengeStatus) {
  if (status === 'solved') return '#69f6ff'
  if (status === 'hot') return '#ffd21f'
  if (status === 'locked') return '#50616a'
  return '#86a9ba'
}

function makeBandGeometry(from: readonly [number, number, number], to: readonly [number, number, number]) {
  const dx = to[0] - from[0]
  const dz = to[2] - from[2]
  const length = Math.hypot(dx, dz) || 1
  const width = 0.018
  const nx = (-dz / length) * width
  const nz = (dx / length) * width
  const fromY = from[1] + 0.035
  const toY = to[1] + 0.035
  const geometry = new BufferGeometry()
  geometry.setAttribute(
    'position',
    new Float32BufferAttribute(
      [
        from[0] + nx,
        fromY,
        from[2] + nz,
        from[0] - nx,
        fromY,
        from[2] - nz,
        to[0] + nx,
        toY,
        to[2] + nz,
        to[0] - nx,
        toY,
        to[2] - nz,
      ],
      3,
    ),
  )
  geometry.setIndex([0, 1, 2, 2, 1, 3])
  geometry.computeVertexNormals()
  return geometry
}

function makeLineGeometry(points: Array<readonly [number, number, number]>) {
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(points.flatMap(([x, y, z]) => [x, y + 0.08, z]), 3))
  return geometry
}

function NetworkBand({
  color,
  geometry,
  opacity,
}: {
  color: string
  geometry: BufferGeometry
  opacity: number
}) {
  const material = useMemo(
    () =>
      new MeshBasicMaterial({
        blending: AdditiveBlending,
        color,
        depthWrite: false,
        opacity,
        side: DoubleSide,
        transparent: true,
      }),
    [color, opacity],
  )

  useEffect(() => () => material.dispose(), [material])

  return (
    <mesh geometry={geometry} material={material} renderOrder={14} raycast={() => undefined} />
  )
}

function NetworkPinLine({
  color,
  geometry,
  opacity,
}: {
  color: string
  geometry: BufferGeometry
  opacity: number
}) {
  const material = useMemo(
    () =>
      new LineBasicMaterial({
        blending: AdditiveBlending,
        color,
        depthWrite: false,
        opacity,
        transparent: true,
      }),
    [color, opacity],
  )
  const line = useMemo(() => {
    const nextLine = new ThreeLine(geometry, material)
    nextLine.renderOrder = 15
    return nextLine
  }, [geometry, material])

  useEffect(() => () => material.dispose(), [material])

  return <primitive object={line} />
}

function ChallengeNode({
  activeCategory,
  autoplayFocusId,
  challenge,
  categoryLabelsVerbose,
  isSelected,
  onHoverChallenge,
  onSelectChallenge,
  position,
  viewMode,
}: {
  activeCategory: ChallengeCategory | null
  autoplayFocusId: string | null
  challenge: Challenge
  categoryLabelsVerbose: boolean
  isSelected: boolean
  onHoverChallenge: (id: string | null) => void
  onSelectChallenge: (challenge: Challenge) => void
  position: readonly [number, number, number]
  viewMode: ChallengeViewMode
}) {
  const group = useRef<Group>(null)
  const coreMaterial = useRef<MeshStandardMaterial>(null)
  const pulseMaterial = useRef<MeshBasicMaterial>(null)
  const haloMaterial = useRef<MeshBasicMaterial>(null)
  const scanRing = useRef<MeshBasicMaterial>(null)
  const [hovered, setHovered] = useState(false)
  const [solveFx, setSolveFx] = useState(0)
  const prevStatus = useRef(challenge.status)

  const isLocked = challenge.status === 'locked'
  const isHot = challenge.status === 'hot'
  const isSolved = challenge.status === 'solved'
  const isFirstBlood = Boolean(firstBloodName(challenge))
  const isDimmed = Boolean(activeCategory && activeCategory !== challenge.category)
  const color = statusColor(challenge.status)
  const size = 0.16 + Math.min(challenge.points / 800, 0.72) * 0.09
  const moduleHeight = 0.1 + Math.min(challenge.points / 900, 0.7) * 0.08
  const categoryAccent = getCategoryMeta(challenge.category).accent

  const showBillboard =
    !isLocked &&
    (hovered ||
      isSelected ||
      (autoplayFocusId === challenge.id && (viewMode === 'autoplay-focus' || viewMode === 'manual-challenge')))

  useEffect(() => {
    if (prevStatus.current === 'unsolved' && challenge.status === 'solved') {
      setSolveFx((n) => n + 1)
    }
    prevStatus.current = challenge.status
  }, [challenge.status])

  useFrame((state) => {
    const target = group.current
    if (!target) return
    const pulse = Math.sin(state.clock.elapsedTime * (isHot ? 4.1 : 2.2) + position[0]) * 0.5 + 0.5
    const selectedBoost = isSelected ? 1.22 : 1
    const labelBoost = categoryLabelsVerbose && activeCategory === challenge.category ? 1.06 : 1
    const focusBoost = activeCategory === challenge.category ? 1.08 : 1
    const lift =
      (isHot ? pulse * 0.018 : 0) +
      (isSelected ? 0.055 : autoplayFocusId === challenge.id ? 0.035 : 0)
    target.position.y = position[1] + lift
    target.scale.setScalar(selectedBoost * focusBoost * labelBoost * (isLocked ? 0.72 : 1))
    if (coreMaterial.current) {
      coreMaterial.current.opacity = isLocked ? 0.14 : isDimmed ? 0.22 : isSolved ? 0.96 : 0.82
      coreMaterial.current.emissiveIntensity = isSelected
        ? 0.95
        : isHot
          ? 0.46 + pulse * 0.28
          : isSolved
            ? 0.58
            : 0.14
    }
    if (pulseMaterial.current) {
      pulseMaterial.current.opacity = isDimmed
        ? 0.04
        : isSelected
          ? 0.72
          : isHot
            ? 0.26 + pulse * 0.26
            : isSolved
              ? 0.38
              : 0.14
      target.rotation.y += isSelected ? 0.012 : 0.006
    }
    if (haloMaterial.current) {
      haloMaterial.current.opacity = isDimmed ? 0.03 : isSelected ? 0.42 : isHot ? 0.2 + pulse * 0.18 : isSolved ? 0.28 : 0.1
    }
    if (scanRing.current) {
      scanRing.current.opacity = isSelected ? 0.42 + pulse * 0.12 : 0
    }
  })

  return (
    <group
      ref={group}
      position={position}
      onClick={(event) => {
        event.stopPropagation()
        if (!isLocked) onSelectChallenge(challenge)
      }}
      onPointerEnter={(event) => {
        event.stopPropagation()
        setHovered(true)
        onHoverChallenge(challenge.id)
      }}
      onPointerLeave={() => {
        setHovered(false)
        onHoverChallenge(null)
      }}
    >
      <mesh position={[0, moduleHeight * 0.5, 0]} renderOrder={12}>
        <cylinderGeometry args={[size, size * 1.08, moduleHeight, 6, 1]} />
        <meshStandardMaterial
          ref={coreMaterial}
          color={isLocked ? '#1a2329' : '#0b1c22'}
          emissive={color}
          emissiveIntensity={0.3}
          metalness={0.54}
          roughness={0.34}
          transparent
          opacity={0.86}
        />
      </mesh>
      <mesh position={[0, moduleHeight + 0.035, 0]} rotation={[0, Math.PI / 6, 0]} renderOrder={13}>
        <boxGeometry args={[size * 1.25, 0.045, size * 0.78]} />
        <meshStandardMaterial
          color={isLocked ? '#223139' : '#0e2a31'}
          emissive={color}
          emissiveIntensity={isSelected ? 0.78 : isHot ? 0.52 : 0.28}
          metalness={0.58}
          roughness={0.3}
          transparent
          opacity={isLocked ? 0.22 : isDimmed ? 0.26 : 0.92}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.018, 0]} renderOrder={11}>
        <ringGeometry args={[size * 0.66, size * 0.96, 32]} />
        <meshBasicMaterial
          ref={pulseMaterial}
          color={isSelected ? categoryAccent : color}
          transparent
          opacity={0.16}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} renderOrder={10}>
        <ringGeometry args={[size * 1.15, size * 1.72, 36]} />
        <meshBasicMaterial
          ref={haloMaterial}
          color={isSelected ? categoryAccent : color}
          transparent
          opacity={0.1}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      {isSolved && (
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} renderOrder={9}>
          <ringGeometry args={[size * 1.05, size * 1.25, 40]} />
          <meshBasicMaterial color="#69f6ff" transparent opacity={0.35} blending={AdditiveBlending} depthWrite={false} />
        </mesh>
      )}
      {isSelected && (
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.002, 0]} renderOrder={16}>
          <ringGeometry args={[size * 1.35, size * 1.52, 48]} />
          <meshBasicMaterial
            ref={scanRing}
            color={categoryAccent}
            transparent
            opacity={0}
            blending={AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      )}
      {isHot && (
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} renderOrder={8}>
          <ringGeometry args={[size * 1.4, size * 1.85, 40]} />
          <meshBasicMaterial color="#ffd21f" transparent opacity={0.14} blending={AdditiveBlending} depthWrite={false} />
        </mesh>
      )}
      {isFirstBlood && (isSolved || isHot) && (
        <mesh position={[size * 0.7, moduleHeight + 0.12, -size * 0.42]} rotation={[0, 0, -0.16]} renderOrder={14}>
          <coneGeometry args={[0.052, 0.13, 3]} />
          <meshBasicMaterial color="#ffd21f" transparent opacity={isDimmed ? 0.22 : 0.92} />
        </mesh>
      )}
      <ChallengeSolveFx accent={categoryAccent} playToken={solveFx} />
      <ChallengeNodeBillboard accent={categoryAccent} challenge={challenge} visible={showBillboard} />
    </group>
  )
}

function ChallengeNetwork({
  activeCategory,
  challenges,
  positions,
}: {
  activeCategory: ChallengeCategory | null
  challenges: Challenge[]
  positions: Map<string, readonly [number, number, number]>
}) {
  const lineGroups = useMemo(
    () =>
      challengeCategories.flatMap((category) => {
        const items = challenges
          .filter((challenge) => challenge.category === category.key)
          .sort((left, right) => left.points - right.points)
        const lines: Array<{ category: ChallengeCategory; geometry: BufferGeometry; glowGeometry: BufferGeometry; id: string }> = []
        for (let index = 0; index < items.length - 1; index += 1) {
          const from = positions.get(items[index].id)
          const to = positions.get(items[index + 1].id)
          if (from && to) {
            lines.push({
              category: category.key,
              geometry: makeBandGeometry(from, to),
              glowGeometry: makeLineGeometry([from, to]),
              id: `${items[index].id}-${items[index + 1].id}`,
            })
          }
        }
        if (items.length >= 4) {
          const from = positions.get(items[0].id)
          const to = positions.get(items[3].id)
          if (from && to) {
            lines.push({
              category: category.key,
              geometry: makeBandGeometry(from, to),
              glowGeometry: makeLineGeometry([from, to]),
              id: `${items[0].id}-${items[3].id}`,
            })
          }
        }
        return lines
      }),
    [challenges, positions],
  )

  useEffect(
    () => () => {
      lineGroups.forEach((line) => {
        line.geometry.dispose()
        line.glowGeometry.dispose()
      })
    },
    [lineGroups],
  )

  return (
    <group>
      {lineGroups.map((line) => {
        const meta = getCategoryMeta(line.category)
        const isDimmed = Boolean(activeCategory && activeCategory !== line.category)
        return (
          <group key={line.id}>
            <NetworkBand
              color={meta.accent}
              geometry={line.geometry}
              opacity={isDimmed ? 0.035 : activeCategory === line.category ? 0.36 : 0.2}
            />
            <NetworkPinLine
              color={meta.accent}
              geometry={line.glowGeometry}
              opacity={isDimmed ? 0.04 : activeCategory === line.category ? 0.68 : 0.38}
            />
          </group>
        )
      })}
    </group>
  )
}

export function ChallengeNodes({
  activeCategory,
  autoplayFocusId,
  categoryLabelsVerbose,
  challenges,
  onHoverChallenge,
  onSelectChallenge,
  selectedChallenge,
  viewMode,
}: {
  activeCategory: ChallengeCategory | null
  autoplayFocusId: string | null
  categoryLabelsVerbose: boolean
  challenges: Challenge[]
  onHoverChallenge: (id: string | null) => void
  onSelectChallenge: (challenge: Challenge) => void
  selectedChallenge: Challenge | null
  viewMode: ChallengeViewMode
}) {
  const positions = useMemo(
    () => new Map(challenges.map((challenge) => [challenge.id, getChallengePosition(challenge, challenges)])),
    [challenges],
  )

  return (
    <group>
      <ChallengeNetwork activeCategory={activeCategory} challenges={challenges} positions={positions} />
      {challenges.map((challenge) => (
        <ChallengeNode
          key={challenge.id}
          activeCategory={activeCategory}
          autoplayFocusId={autoplayFocusId}
          categoryLabelsVerbose={categoryLabelsVerbose}
          challenge={challenge}
          isSelected={selectedChallenge?.id === challenge.id}
          onHoverChallenge={onHoverChallenge}
          onSelectChallenge={onSelectChallenge}
          position={positions.get(challenge.id) ?? [0, 0.18, 0]}
          viewMode={viewMode}
        />
      ))}
    </group>
  )
}
