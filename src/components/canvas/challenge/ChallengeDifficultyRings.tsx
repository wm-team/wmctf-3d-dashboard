import { useEffect, useMemo } from 'react'
import { Text } from '@react-three/drei'
import {
  AdditiveBlending,
  BufferGeometry,
  Float32BufferAttribute,
  Line as ThreeLine,
  LineBasicMaterial,
} from 'three'
import { challengeDifficultyBands } from './challengeData'
import type { ChallengeCategory } from './challengeTypes'

function makeRingLineGeometry(radius: number, y: number) {
  const positions: number[] = []
  for (let index = 0; index <= 192; index += 1) {
    const angle = (index / 192) * Math.PI * 2
    positions.push(Math.cos(angle) * radius, y, Math.sin(angle) * radius)
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  return geometry
}

function RingLine({
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
    nextLine.renderOrder = 10
    return nextLine
  }, [geometry, material])

  useEffect(() => () => material.dispose(), [material])

  return <primitive object={line} />
}

export function ChallengeDifficultyRings({ activeCategory }: { activeCategory: ChallengeCategory | null }) {
  const ringGeometries = useMemo(
    () =>
      challengeDifficultyBands.map((band) => ({
        inner: makeRingLineGeometry(band.innerRadius, band.height + 0.035),
        outer: makeRingLineGeometry(band.outerRadius, band.height + 0.035),
      })),
    [],
  )

  useEffect(
    () => () => {
      ringGeometries.forEach((geometryPair) => {
        geometryPair.inner.dispose()
        geometryPair.outer.dispose()
      })
    },
    [ringGeometries],
  )

  return (
    <group>
      {challengeDifficultyBands.map((band, index) => {
        const color = index === challengeDifficultyBands.length - 1 ? '#ffd21f' : '#9bddff'
        const opacity = activeCategory ? 0.18 : 0.32
        return (
          <group key={band.key}>
            <RingLine color={color} geometry={ringGeometries[index].inner} opacity={opacity * 0.72} />
            <RingLine color={color} geometry={ringGeometries[index].outer} opacity={opacity} />
            <Text
              color={color}
              fontSize={0.11}
              fontWeight={800}
              position={[band.outerRadius + 0.16, band.height + 0.08, -0.18]}
              rotation={[-0.28, 0, 0]}
            >
              {band.label.toUpperCase()}
            </Text>
          </group>
        )
      })}
    </group>
  )
}
