import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import {
  AdditiveBlending,
  BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Line as ThreeLine,
  LineBasicMaterial,
  MeshStandardMaterial,
  type Group,
} from 'three'
import {
  atlasSectorGap,
  challengeCategories,
  challengeDifficultyBands,
  getCategoryAngle,
  getCategoryMeta,
} from './challengeData'
import type { ChallengeCategory } from './challengeTypes'

function makeSectorPlatformGeometry(
  startAngle: number,
  endAngle: number,
  innerRadius: number,
  outerRadius: number,
  topY: number,
) {
  const segments = 24
  const bottomY = Math.max(-0.045, topY - 0.14)
  const positions: number[] = []
  const indices: number[] = []

  for (let index = 0; index <= segments; index += 1) {
    const t = index / segments
    const angle = startAngle + (endAngle - startAngle) * t
    positions.push(
      Math.cos(angle) * innerRadius,
      topY,
      Math.sin(angle) * innerRadius,
      Math.cos(angle) * outerRadius,
      topY,
      Math.sin(angle) * outerRadius,
      Math.cos(angle) * innerRadius,
      bottomY,
      Math.sin(angle) * innerRadius,
      Math.cos(angle) * outerRadius,
      bottomY,
      Math.sin(angle) * outerRadius,
    )
  }

  for (let index = 0; index < segments; index += 1) {
    const a = index * 4
    const b = a + 4
    const topInnerA = a
    const topOuterA = a + 1
    const bottomInnerA = a + 2
    const bottomOuterA = a + 3
    const topInnerB = b
    const topOuterB = b + 1
    const bottomInnerB = b + 2
    const bottomOuterB = b + 3
    indices.push(
      topInnerA,
      topOuterA,
      topInnerB,
      topOuterA,
      topOuterB,
      topInnerB,
      topOuterA,
      bottomOuterA,
      topOuterB,
      bottomOuterA,
      bottomOuterB,
      topOuterB,
      bottomInnerA,
      topInnerA,
      bottomInnerB,
      topInnerA,
      topInnerB,
      bottomInnerB,
      bottomInnerA,
      bottomOuterA,
      bottomInnerB,
      bottomOuterA,
      bottomOuterB,
      bottomInnerB,
    )
  }

  const first = 0
  const last = segments * 4
  indices.push(
    first,
    first + 2,
    first + 1,
    first + 1,
    first + 2,
    first + 3,
    last,
    last + 1,
    last + 2,
    last + 1,
    last + 3,
    last + 2,
  )

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function makePolylineGeometry(points: Array<[number, number, number]>) {
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(points.flat(), 3))
  return geometry
}

function SectorLine({
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
    nextLine.renderOrder = 6
    return nextLine
  }, [geometry, material])

  useEffect(() => () => material.dispose(), [material])

  return <primitive object={line} />
}

function arcPoints(radius: number, startAngle: number, endAngle: number, y = 0.08) {
  return Array.from({ length: 34 }, (_, index) => {
    const t = index / 33
    const angle = startAngle + (endAngle - startAngle) * t
    return [Math.cos(angle) * radius, y, Math.sin(angle) * radius] as [number, number, number]
  })
}

function radialPoints(angle: number, innerRadius: number, outerRadius: number, y = 0.09) {
  return [
    [Math.cos(angle) * innerRadius, y, Math.sin(angle) * innerRadius],
    [Math.cos(angle) * outerRadius, y, Math.sin(angle) * outerRadius],
  ] as Array<[number, number, number]>
}

function getSectorTransform(category: ChallengeCategory) {
  if (category === 'misc') return { scale: [0.88, 1, 0.78] as const, x: 0.22, z: -0.2 }
  if (category === 'crypto') return { scale: [0.88, 1, 0.64] as const, x: 0, z: -0.46 }
  if (category === 'rev') return { scale: [0.88, 1, 0.78] as const, x: -0.22, z: -0.2 }
  return { scale: [1, 1, 1] as const, x: 0, z: 0 }
}

function makeMotifLines(category: ChallengeCategory, startAngle: number, endAngle: number) {
  const center = getCategoryAngle(category)
  const lines: Array<Array<[number, number, number]>> = []
  if (category === 'crypto') {
    lines.push(arcPoints(1.76, center - 0.18, center + 0.18, 0.12))
    lines.push(arcPoints(2.52, center - 0.22, center + 0.22, 0.12))
    lines.push(arcPoints(3.24, center - 0.26, center + 0.26, 0.12))
  } else if (category === 'rev') {
    lines.push(radialPoints(center, 1.2, 3.45, 0.12))
    lines.push(radialPoints(center - 0.18, 2.0, 3.4, 0.12))
    lines.push(radialPoints(center + 0.2, 2.0, 3.55, 0.12))
  } else if (category === 'pwn') {
    lines.push([
      [Math.cos(center - 0.2) * 1.35, 0.12, Math.sin(center - 0.2) * 1.35],
      [Math.cos(center - 0.06) * 2.1, 0.12, Math.sin(center - 0.06) * 2.1],
      [Math.cos(center + 0.11) * 2.58, 0.12, Math.sin(center + 0.11) * 2.58],
      [Math.cos(center + 0.03) * 3.58, 0.12, Math.sin(center + 0.03) * 3.58],
    ])
  } else if (category === 'web') {
    lines.push(arcPoints(1.44, center - 0.18, center + 0.18, 0.12))
    lines.push(radialPoints(center - 0.2, 1.52, 3.6, 0.12))
    lines.push(radialPoints(center + 0.2, 1.52, 3.6, 0.12))
  } else if (category === 'misc') {
    lines.push(arcPoints(2.0, startAngle + 0.14, endAngle - 0.14, 0.12))
    lines.push(arcPoints(3.08, startAngle + 0.22, endAngle - 0.22, 0.12))
  } else {
    lines.push(radialPoints(center, 1.2, 3.75, 0.12))
    lines.push(arcPoints(2.25, center - 0.26, center + 0.26, 0.12))
    lines.push(arcPoints(3.15, center - 0.32, center + 0.32, 0.12))
  }
  return lines
}

export function ChallengeSector({
  activeCategory,
  category,
  hoverCategory,
  labelVerbose,
  onHoverCategory,
  onSelectCategory,
}: {
  activeCategory: ChallengeCategory | null
  category: ChallengeCategory
  hoverCategory: ChallengeCategory | null
  labelVerbose: boolean
  onHoverCategory: (category: ChallengeCategory | null) => void
  onSelectCategory: (category: ChallengeCategory) => void
}) {
  const group = useRef<Group>(null)
  const material = useRef<MeshStandardMaterial>(null)
  const index = Math.max(challengeCategories.findIndex((item) => item.key === category), 0)
  const sectorAngle = (Math.PI * 2) / challengeCategories.length
  const centerAngle = getCategoryAngle(category)
  const startAngle = centerAngle - sectorAngle / 2 + atlasSectorGap
  const endAngle = centerAngle + sectorAngle / 2 - atlasSectorGap
  const meta = getCategoryMeta(category)
  const sectorTransform = getSectorTransform(category)
  const isActive = activeCategory === category
  const isHover = hoverCategory === category
  const isDimmed = Boolean(activeCategory && !isActive)
  const sectorGeometries = useMemo(
    () =>
      challengeDifficultyBands.map((band) =>
        makeSectorPlatformGeometry(startAngle, endAngle, band.innerRadius, band.outerRadius, band.height),
      ),
    [endAngle, startAngle],
  )
  const borderGeometries = useMemo(
    () =>
      challengeDifficultyBands.flatMap((band) => [
        makePolylineGeometry(arcPoints(band.outerRadius, startAngle, endAngle, band.height + 0.028)),
        makePolylineGeometry(radialPoints(startAngle, band.innerRadius, band.outerRadius, band.height + 0.03)),
        makePolylineGeometry(radialPoints(endAngle, band.innerRadius, band.outerRadius, band.height + 0.03)),
      ]),
    [endAngle, startAngle],
  )
  const motifGeometries = useMemo(
    () => makeMotifLines(category, startAngle, endAngle).map(makePolylineGeometry),
    [category, endAngle, startAngle],
  )

  useEffect(() => {
    return () => {
      sectorGeometries.forEach((geometry) => geometry.dispose())
      borderGeometries.forEach((geometry) => geometry.dispose())
      motifGeometries.forEach((geometry) => geometry.dispose())
    }
  }, [borderGeometries, motifGeometries, sectorGeometries])

  useFrame((state) => {
    const target = group.current
    if (!target) return
    const lift = isActive ? 0.035 : isHover ? 0.022 : 0
    const scale = isActive ? 1.018 : isHover ? 1.012 : 1
    target.position.y += (lift - target.position.y) * 0.1
    target.scale.setScalar(target.scale.x + (scale - target.scale.x) * 0.1)
    if (material.current) {
      const pulse = 0.06 + Math.sin(state.clock.elapsedTime * 1.8 + index) * 0.025
      material.current.opacity += ((isDimmed ? 0.12 : isActive || isHover ? 0.5 : 0.36) - material.current.opacity) * 0.12
      material.current.emissiveIntensity = isActive || isHover ? 0.24 + pulse : 0.08
    }
  })

  const labelPosition = (() => {
    if (category === 'misc') return [-2.08, 0.96, 0.36] as const
    if (category === 'crypto') return [0, 1.04, 1.42] as const
    if (category === 'rev') return [2.08, 0.96, 0.36] as const
    const labelRadius = 3.52
    return [Math.cos(centerAngle) * labelRadius, 0.56, Math.sin(centerAngle) * labelRadius] as const
  })()

  return (
    <group
      ref={group}
      position={[sectorTransform.x, 0, sectorTransform.z]}
      scale={sectorTransform.scale}
      onClick={(event) => {
        event.stopPropagation()
        onSelectCategory(category)
      }}
      onPointerEnter={(event) => {
        event.stopPropagation()
        onHoverCategory(category)
      }}
      onPointerLeave={() => onHoverCategory(null)}
    >
      {sectorGeometries.map((geometry, bandIndex) => (
        <mesh key={`${category}-platform-${challengeDifficultyBands[bandIndex].key}`} geometry={geometry} renderOrder={4}>
          <meshStandardMaterial
            ref={bandIndex === 0 ? material : undefined}
            color={bandIndex % 2 === 0 ? '#071b22' : '#0a2229'}
            emissive={meta.accent}
            emissiveIntensity={isActive || isHover ? 0.16 : 0.07}
            metalness={0.5}
            roughness={0.52}
            transparent
            opacity={isDimmed ? 0.12 : 0.34 + bandIndex * 0.035}
            side={DoubleSide}
          />
        </mesh>
      ))}
      {borderGeometries.map((geometry, lineIndex) => (
        <SectorLine
          key={`${category}-border-${lineIndex}`}
          color={lineIndex === 1 ? meta.accent : '#9bddff'}
          geometry={geometry}
          opacity={isDimmed ? 0.16 : isActive || isHover ? 0.78 : 0.34}
        />
      ))}
      {motifGeometries.map((geometry, motifIndex) => (
        <SectorLine
          key={`${category}-motif-${motifIndex}`}
          color={meta.accent}
          geometry={geometry}
          opacity={isDimmed ? 0.08 : isActive || isHover ? 0.48 : 0.22}
        />
      ))}
      <Text
        color={isDimmed ? 'rgba(210, 226, 234, 0.24)' : '#f4fbff'}
        fontSize={labelVerbose && isActive ? 0.2 : 0.17}
        fontWeight={900}
        position={labelPosition}
        textAlign="center"
      >
        {meta.label.toUpperCase()}
      </Text>
    </group>
  )
}
