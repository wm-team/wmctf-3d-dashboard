import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  CatmullRomCurve3,
  TubeGeometry,
  Vector3,
  type Mesh,
  MeshBasicMaterial,
} from 'three'
import { COLORS, flowRoutes, getCategoryNode, getCategoryNodeByKey, terrainHeight, type CategoryKey } from './coreSceneConfig'

type FlowArc = {
  color: string
  curve: CatmullRomCurve3
  geometry: TubeGeometry
  key: string
  speed: number
}

function makeFlowArc([fromName, toName]: [CategoryKey, CategoryKey], index: number): FlowArc {
  const from = getCategoryNode(fromName)
  const to = getCategoryNode(toName)
  const fromY = terrainHeight(from.x, from.z) + 0.28
  const toY = terrainHeight(to.x, to.z) + 0.28
  const middle = new Vector3(
    (from.x + to.x) / 2,
    Math.max(fromY, toY) + 0.56 + (index % 3) * 0.12,
    (from.z + to.z) / 2,
  )
  const curve = new CatmullRomCurve3([
    new Vector3(from.x, fromY, from.z),
    middle,
    new Vector3(to.x, toY, to.z),
  ])
  const isPriority = fromName === 'web' || toName === 'pwn'

  return {
    color: isPriority ? COLORS.yellow : COLORS.cyan,
    curve,
    geometry: new TubeGeometry(curve, 80, isPriority ? 0.012 : 0.009, 6, false),
    key: `${fromName}-${toName}`,
    speed: 0.065 + index * 0.008,
  }
}

function makeLocalArcs(activeCategory: CategoryKey | null) {
  if (!activeCategory) return []
  const node = getCategoryNodeByKey(activeCategory)
  return Array.from({ length: 2 }, (_, index) => {
    const angle = index * 2.1 + node.phase
    const start = new Vector3(
      node.x + Math.cos(angle) * 0.78,
      terrainHeight(node.x, node.z) + 0.22,
      node.z + Math.sin(angle) * 0.78,
    )
    const end = new Vector3(
      node.x + Math.cos(angle + 1.25) * 0.64,
      terrainHeight(node.x, node.z) + 0.26,
      node.z + Math.sin(angle + 1.25) * 0.64,
    )
    const curve = new CatmullRomCurve3([
      start,
      new Vector3(node.x + Math.cos(angle + 0.5) * 0.34, terrainHeight(node.x, node.z) + 0.58, node.z + Math.sin(angle + 0.5) * 0.34),
      end,
    ])
    return new TubeGeometry(curve, 48, 0.008, 5, false)
  })
}

export function FlowArcs({ activeCategory }: { activeCategory: CategoryKey | null }) {
  const particles = useRef<Mesh[]>([])
  const arcs = useMemo(() => flowRoutes.map(makeFlowArc), [])
  const localArcs = useMemo(() => makeLocalArcs(activeCategory), [activeCategory])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    arcs.forEach((arc, arcIndex) => {
      const related = !activeCategory || arc.key.includes(activeCategory)
      for (let particleIndex = 0; particleIndex < 2; particleIndex += 1) {
        const mesh = particles.current[arcIndex * 2 + particleIndex]
        if (!mesh) continue
        const u = (t * arc.speed * (related && activeCategory ? 1.7 : 1) + particleIndex * 0.38 + arcIndex * 0.11) % 1
        const point = arc.curve.getPoint(u)
        mesh.position.copy(point)
        const material = mesh.material as MeshBasicMaterial
        material.opacity =
          activeCategory && !related ? 0 : (related ? (activeCategory ? 0.34 : 0.5) : 0.02) + Math.sin(t * 3.2 + particleIndex) * 0.06
      }
    })
  })

  useEffect(
    () => () => {
      arcs.forEach((arc) => arc.geometry.dispose())
      localArcs.forEach((geometry) => geometry.dispose())
    },
    [arcs, localArcs],
  )

  return (
    <group>
      {arcs.map((arc, arcIndex) => (
        <group key={arc.key}>
          <mesh geometry={arc.geometry}>
            <meshBasicMaterial
              color={arc.color}
              transparent
              opacity={
                activeCategory && !arc.key.includes(activeCategory)
                  ? 0.02
                  : arc.color === COLORS.yellow
                    ? activeCategory
                      ? 0.32
                      : 0.36
                    : activeCategory
                      ? 0.26
                      : 0.28
              }
              blending={AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
          {[0, 1].map((particleIndex) => (
            <mesh
              key={`${arc.key}-particle-${particleIndex}`}
              ref={(element) => {
                if (element) particles.current[arcIndex * 2 + particleIndex] = element
              }}
            >
              <sphereGeometry args={[particleIndex === 0 ? 0.048 : 0.036, 12, 12]} />
              <meshBasicMaterial
                color={arc.color}
                transparent
                opacity={0.7}
                blending={AdditiveBlending}
                depthWrite={false}
              />
            </mesh>
          ))}
        </group>
      ))}
      {localArcs.map((geometry, index) => (
        <mesh key={`local-flow-${activeCategory}-${index}`} geometry={geometry}>
          <meshBasicMaterial
            color={activeCategory ? getCategoryNodeByKey(activeCategory).accentColor : COLORS.cyan}
            transparent
            opacity={activeCategory ? 0.24 : 0}
            blending={AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  )
}
