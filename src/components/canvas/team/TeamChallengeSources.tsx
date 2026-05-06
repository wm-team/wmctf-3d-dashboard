import { Billboard, Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  DoubleSide,
  MeshBasicMaterial,
  TorusGeometry,
  type Group,
  type Mesh,
} from 'three'
import { categoryNodes } from '@/components/canvas/core/coreSceneConfig'
import type { TeamDemoEvent } from './teamDemo'
import { eventKey, eventPalette, segment } from './teamEventVisuals'
import {
  challengeSeatCount,
  getCategoryAnchor,
  getChallengeSeatAnchor,
  getChallengeSeatSlot,
} from './teamRankLayout'

function sameCategory(left: string, right: string) {
  return left.toLowerCase() === right.toLowerCase()
}

function CategoryBeam({ category }: { category: string }) {
  const group = useRef<Group>(null)
  const beam = useRef<Mesh>(null)
  const well = useRef<Mesh>(null)
  const [x, y, z] = getCategoryAnchor(category)
  const meta = categoryNodes.find((node) => sameCategory(node.name, category))
  const color = meta?.accentColor ?? '#69f6ff'

  useFrame((state, delta) => {
    if (group.current) group.current.position.y = y + Math.sin(state.clock.elapsedTime * 0.7 + x) * 0.008
    if (beam.current) {
      beam.current.rotation.y += delta * 0.14
      const material = beam.current.material as MeshBasicMaterial
      material.opacity = 0.055 + Math.sin(state.clock.elapsedTime * 0.9 + z) * 0.012
    }
    if (well.current) {
      well.current.rotation.z += delta * 0.22
      const material = well.current.material as MeshBasicMaterial
      material.opacity = 0.16 + Math.sin(state.clock.elapsedTime * 1.1 + x) * 0.025
    }
  })

  return (
    <group ref={group} position={[x, y, z]} raycast={() => undefined}>
      <mesh ref={well} rotation={[-Math.PI / 2, 0, 0]} renderOrder={30}>
        <torusGeometry args={[0.21, 0.006, 6, 72]} />
        <meshBasicMaterial color={color} transparent opacity={0.16} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={29}>
        <ringGeometry args={[0.15, 0.28, 88]} />
        <meshBasicMaterial color={color} transparent opacity={0.07} side={DoubleSide} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh ref={beam} position={[0, 0.62, 0]} renderOrder={28}>
        <cylinderGeometry args={[0.035, 0.13, 1.24, 18, 1, true]} />
        <meshBasicMaterial color={color} transparent opacity={0.06} side={DoubleSide} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
      <Billboard follow position={[0, 0.34, 0]} raycast={() => undefined}>
        <Text anchorX="center" anchorY="middle" color={color} fontSize={0.052} fontWeight={900} outlineColor="#05090c" outlineWidth={0.003} renderOrder={43}>
          {category.toUpperCase()}
        </Text>
      </Billboard>
    </group>
  )
}

function CategoryBeamPulse({ event }: { event: TeamDemoEvent }) {
  const group = useRef<Group>(null)
  const ring = useRef<Mesh>(null)
  const beam = useRef<Mesh>(null)
  const age = useRef(0)
  const palette = eventPalette(event)
  const [x, y, z] = getCategoryAnchor(event.category)
  const currentEventKey = eventKey(event)

  useEffect(() => {
    age.current = 0
  }, [currentEventKey])

  useFrame((_, delta) => {
    age.current += delta
    const pulse = Math.max(0, 1 - age.current / 1.26)
    if (group.current) group.current.visible = pulse > 0
    if (ring.current) {
      ring.current.scale.setScalar(0.72 + segment(age.current, 0, 0.92) * 1.42)
      const material = ring.current.material as MeshBasicMaterial
      material.opacity = pulse * 0.42
    }
    if (beam.current) {
      beam.current.scale.setScalar(1 + Math.sin(Math.min(age.current / 0.62, 1) * Math.PI) * 0.18)
      const material = beam.current.material as MeshBasicMaterial
      material.opacity = pulse * (event.eventTone === 'firstBlood' ? 0.26 : 0.18)
    }
  })

  return (
    <group ref={group} position={[x, y, z]} raycast={() => undefined}>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} renderOrder={36}>
        <ringGeometry args={[0.24, 0.28, 96]} />
        <meshBasicMaterial color={palette.border} transparent opacity={0} side={DoubleSide} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh ref={beam} position={[0, 0.68, 0]} renderOrder={35}>
        <cylinderGeometry args={[0.055, 0.18, 1.36, 18, 1, true]} />
        <meshBasicMaterial color={palette.accent} transparent opacity={0} side={DoubleSide} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  )
}

function ChallengeSeat({
  category,
  index,
  geometry,
}: {
  category: string
  geometry: TorusGeometry
  index: number
}) {
  const mesh = useRef<Mesh>(null)
  const [x, y, z] = getChallengeSeatSlot(category, index)
  const meta = categoryNodes.find((node) => sameCategory(node.name, category))
  const color = meta?.accentColor ?? '#69f6ff'

  useFrame((state, delta) => {
    if (!mesh.current) return
    mesh.current.rotation.z += delta * (0.12 + index * 0.01)
    mesh.current.position.y = y + Math.sin(state.clock.elapsedTime * 0.8 + index + x) * 0.009
  })

  return (
    <mesh ref={mesh} geometry={geometry} position={[x, y, z]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={31} raycast={() => undefined}>
      <meshBasicMaterial color={color} transparent opacity={0.12} side={DoubleSide} blending={AdditiveBlending} depthWrite={false} />
    </mesh>
  )
}

function ChallengeSeatActivation({ event }: { event: TeamDemoEvent }) {
  const group = useRef<Group>(null)
  const ring = useRef<Mesh>(null)
  const core = useRef<Mesh>(null)
  const halo = useRef<Mesh>(null)
  const age = useRef(0)
  const [x, y, z] = getChallengeSeatAnchor(event.category, event.challenge)
  const palette = eventPalette(event)
  const currentEventKey = eventKey(event)

  useEffect(() => {
    age.current = 0
  }, [currentEventKey])

  useFrame((state, delta) => {
    age.current += delta
    const pulse = Math.max(0, 1 - age.current / 2.18)
    const charge = Math.sin(Math.min(age.current / 0.7, 1) * Math.PI)
    if (group.current) {
      group.current.visible = pulse > 0
      group.current.position.y = y + Math.sin(state.clock.elapsedTime * 2.3) * 0.012
      group.current.scale.setScalar(1 + charge * 0.1)
    }
    if (ring.current) {
      ring.current.rotation.z += delta * 1.6
      ring.current.scale.setScalar(0.76 + segment(age.current, 0, 1.1) * 1.18)
      const material = ring.current.material as MeshBasicMaterial
      material.opacity = pulse * (0.32 + charge * 0.24)
    }
    if (halo.current) {
      halo.current.scale.setScalar(0.6 + segment(age.current, 0.08, 0.86) * 0.74)
      const material = halo.current.material as MeshBasicMaterial
      material.opacity = pulse * 0.28
    }
    if (core.current) {
      core.current.rotation.y += delta * 1.2
      const material = core.current.material as MeshBasicMaterial
      material.opacity = pulse * 0.82
    }
  })

  return (
    <group ref={group} position={[x, y + 0.02, z]} raycast={() => undefined}>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} renderOrder={39}>
        <ringGeometry args={[0.08, 0.12, 72]} />
        <meshBasicMaterial color={palette.border} transparent opacity={0} side={DoubleSide} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh ref={halo} rotation={[-Math.PI / 2, 0, Math.PI / 7]} renderOrder={40}>
        <torusGeometry args={[0.12, 0.005, 6, 72]} />
        <meshBasicMaterial color={palette.accent} transparent opacity={0} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh ref={core} position={[0, 0.1, 0]} renderOrder={41}>
        <octahedronGeometry args={[0.055, 0]} />
        <meshBasicMaterial color={palette.core} transparent opacity={0} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
      <Billboard follow position={[0, 0.32, 0]} raycast={() => undefined}>
        <Text anchorX="center" anchorY="middle" color={palette.core} fontSize={0.054} fontWeight={900} outlineColor="#05090c" outlineWidth={0.003} renderOrder={47} maxWidth={0.86}>
          {event.challenge}
        </Text>
      </Billboard>
    </group>
  )
}

export function TeamChallengeSources({ events }: { events: TeamDemoEvent[] }) {
  const seatGeometry = useMemo(() => new TorusGeometry(0.052, 0.004, 5, 28), [])

  useEffect(
    () => () => {
      seatGeometry.dispose()
    },
    [seatGeometry],
  )

  return (
    <group raycast={() => undefined}>
      {categoryNodes.map((category) => (
        <CategoryBeam key={category.key} category={category.name} />
      ))}
      {categoryNodes.flatMap((category) =>
        Array.from({ length: challengeSeatCount }, (_, index) => (
          <ChallengeSeat key={`${category.key}:${index}`} category={category.name} geometry={seatGeometry} index={index} />
        )),
      )}
      {events.map((event) => (
        <CategoryBeamPulse key={`beam:${eventKey(event)}`} event={event} />
      ))}
      {events.map((event) => (
        <ChallengeSeatActivation key={`seat:${eventKey(event)}`} event={event} />
      ))}
    </group>
  )
}
