import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  BufferGeometry,
  Float32BufferAttribute,
  Line as ThreeLine,
  LineBasicMaterial,
  type Group,
} from 'three'
import { atlasOuterRadius, challengeCategories, getCategoryAngle } from './challengeData'
import type { ChallengeCategory } from './challengeTypes'

function makeLineGeometry(points: Array<[number, number, number]>) {
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(points.flat(), 3))
  return geometry
}

function DecorLine({
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
    nextLine.renderOrder = 5
    return nextLine
  }, [geometry, material])

  useEffect(() => () => material.dispose(), [material])

  return <primitive object={line} />
}

export function ChallengeAtlasDecor({ activeCategory }: { activeCategory: ChallengeCategory | null }) {
  const scan = useRef<Group>(null)
  const radialGeometries = useMemo(
    () =>
      challengeCategories.map((category) => {
        const angle = getCategoryAngle(category.key)
        return {
          geometry: makeLineGeometry([
            [Math.cos(angle) * 0.98, 0.12, Math.sin(angle) * 0.98],
            [Math.cos(angle) * atlasOuterRadius, 0.24, Math.sin(angle) * atlasOuterRadius],
          ]),
          key: category.key,
          color: category.accent,
        }
      }),
    [],
  )

  useEffect(
    () => () => {
      radialGeometries.forEach((item) => item.geometry.dispose())
    },
    [radialGeometries],
  )

  useFrame((state) => {
    if (!scan.current) return
    scan.current.rotation.y = state.clock.elapsedTime * 0.08
  })

  return (
    <group>
      {radialGeometries.map((item) => (
        <DecorLine
          key={item.key}
          color={item.color}
          geometry={item.geometry}
          opacity={activeCategory && activeCategory !== item.key ? 0.06 : 0.24}
        />
      ))}
      <group ref={scan}>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
          <torusGeometry args={[4.02, 0.006, 6, 180]} />
          <meshBasicMaterial color="#9bddff" transparent opacity={0.2} blending={AdditiveBlending} />
        </mesh>
        {Array.from({ length: 36 }, (_, index) => {
          const angle = (index / 36) * Math.PI * 2
          const radius = index % 3 === 0 ? 3.94 : 3.82
          return (
            <mesh
              key={angle}
              position={[Math.cos(angle) * radius, 0.055, Math.sin(angle) * radius]}
              rotation={[0, -angle, 0]}
            >
              <boxGeometry args={[0.012, 0.045, index % 3 === 0 ? 0.2 : 0.11]} />
              <meshBasicMaterial
                color={index % 4 === 0 ? '#ffd21f' : '#9bddff'}
                transparent
                opacity={index % 4 === 0 ? 0.44 : 0.25}
                blending={AdditiveBlending}
              />
            </mesh>
          )
        })}
      </group>
    </group>
  )
}
