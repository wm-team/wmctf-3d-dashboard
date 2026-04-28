import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  BufferGeometry,
  DoubleSide,
  Float32BufferAttribute,
  type Group,
  type Mesh,
  MeshBasicMaterial,
} from 'three'

const ripplePalette = ['#ffe566', '#7cfbff', '#fff1b8', '#62d4ff', '#ffd230']

function ExpandingDiscRipples() {
  const meshes = useRef<Mesh[]>([])

  useFrame((state) => {
    const cycle = 2.35
    const t = state.clock.elapsedTime
    const n = ripplePalette.length

    for (let i = 0; i < n; i += 1) {
      const mesh = meshes.current[i]
      if (!mesh) continue
      const u = ((t + (i * cycle) / n) % cycle) / cycle
      const scale = 0.16 + u * 5.1
      mesh.scale.setScalar(scale)
      const material = mesh.material as MeshBasicMaterial
      material.opacity = (1 - u) ** 1.05 * 0.78
    }
  })

  return (
    <group rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.042, 0]}>
      {ripplePalette.map((color, index) => (
        <mesh
          key={`${color}-${index}`}
          ref={(element) => {
            if (element) meshes.current[index] = element
          }}
        >
          <ringGeometry args={[0.9, 0.972, 128]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0}
            side={DoubleSide}
            blending={AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  )
}

const contourSeeds = [
  { x: -2.25, z: 1.15, color: '#ffd21f', phase: 0.2, amp: 1.65, spread: 0.92 },
  { x: 1.9, z: 1.05, color: '#bfefff', phase: 1.4, amp: 1.34, spread: 0.84 },
  { x: -1.1, z: -1.05, color: '#5fe8ff', phase: 2.5, amp: 1.78, spread: 0.86 },
  { x: 1.65, z: -0.85, color: '#ffd21f', phase: 3.1, amp: 1.48, spread: 0.8 },
  { x: 0.05, z: 0.1, color: '#f6f0d2', phase: 4.2, amp: 2.12, spread: 1.02 },
]

const pylons = [
  { x: -2.25, z: 1.15, height: 0.56, color: '#ffd21f' },
  { x: 1.9, z: 1.05, height: 0.48, color: '#bfefff' },
  { x: -1.1, z: -1.05, height: 0.68, color: '#5fe8ff' },
  { x: 1.65, z: -0.85, height: 0.54, color: '#ffd21f' },
  { x: 0.05, z: 0.1, height: 0.84, color: '#fff4a6' },
]

const terrainRadius = 4.48

function terrainHeight(x: number, z: number) {
  const radius = Math.hypot(x, z)
  const edgeFalloff = Math.max(0, 1 - (radius / terrainRadius) ** 2.5)
  const ridges =
    Math.sin(x * 2.15 + z * 0.7) * 0.06 +
    Math.cos(z * 2.65 - x * 0.35) * 0.05 +
    Math.sin((x - z) * 3.2) * 0.028

  const peakHeight = contourSeeds.reduce((height, seed) => {
    const distanceSquared = (x - seed.x) ** 2 + (z - seed.z) ** 2
    return height + seed.amp * Math.exp(-distanceSquared / (seed.spread ** 2))
  }, 0)

  return Math.max(0, (peakHeight + ridges * 1.25) * edgeFalloff * 1.18)
}

function makeTerrainGeometry() {
  const ringCount = 38
  const segments = 168
  const positions: number[] = [0, terrainHeight(0, 0), 0]
  const indices: number[] = []

  for (let ring = 1; ring <= ringCount; ring += 1) {
    const radius = (ring / ringCount) * terrainRadius
    for (let segment = 0; segment < segments; segment += 1) {
      const angle = (segment / segments) * Math.PI * 2
      const x = Math.cos(angle) * radius
      const z = Math.sin(angle) * radius
      positions.push(x, terrainHeight(x, z), z)
    }
  }

  for (let segment = 0; segment < segments; segment += 1) {
    indices.push(0, 1 + ((segment + 1) % segments), 1 + segment)
  }

  for (let ring = 2; ring <= ringCount; ring += 1) {
    const previousStart = 1 + (ring - 2) * segments
    const currentStart = 1 + (ring - 1) * segments

    for (let segment = 0; segment < segments; segment += 1) {
      const next = (segment + 1) % segments
      const previousA = previousStart + segment
      const previousB = previousStart + next
      const currentA = currentStart + segment
      const currentB = currentStart + next
      indices.push(previousA, previousB, currentA, currentA, previousB, currentB)
    }
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function makeContourPoints(seed: (typeof contourSeeds)[number], level: number) {
  const points: number[] = []
  const radius = 0.36 + level * 0.18

  for (let index = 0; index <= 168; index += 1) {
    const angle = (index / 168) * Math.PI * 2
    const warp =
      Math.sin(angle * 3 + seed.phase) * 0.11 +
      Math.cos(angle * 5 - seed.phase * 0.8) * 0.06 +
      Math.sin(angle * 9 + level) * 0.025
    const r = radius + warp
    const x = seed.x + Math.cos(angle) * r
    const z = seed.z + Math.sin(angle) * r
    const y = terrainHeight(x, z) + 0.035 + level * 0.006
    points.push(x, y, z)
  }

  return points
}

function makeRadialGrid() {
  const lines: number[][] = []

  for (let index = 0; index < 32; index += 1) {
    const angle = (index / 32) * Math.PI * 2
    const points: number[] = []

    for (let step = 0; step <= 34; step += 1) {
      const radius = 0.55 + (step / 34) * 4
      const x = Math.cos(angle) * radius
      const z = Math.sin(angle) * radius
      points.push(x, terrainHeight(x, z) + 0.018, z)
    }

    lines.push(points)
  }

  return lines
}

function OrbitRing({
  color,
  opacity,
  radius,
  tube = 0.012,
}: {
  color: string
  opacity: number
  radius: number
  tube?: number
}) {
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[radius, tube, 8, 220]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        blending={AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  )
}

export function DataCore() {
  const map = useRef<Group>(null)
  const scanner = useRef<Group>(null)
  const terrainGeometry = useMemo(() => makeTerrainGeometry(), [])

  const contourGeometries = useMemo(
    () =>
      contourSeeds.flatMap((seed) =>
        Array.from({ length: 8 }, (_, level) => {
          const geometry = new BufferGeometry()
          geometry.setAttribute(
            'position',
            new Float32BufferAttribute(makeContourPoints(seed, level), 3),
          )
          return {
            color: seed.color,
            geometry,
            opacity: 0.28 + level * 0.055,
          }
        }),
      ),
    [],
  )

  const radialGeometries = useMemo(
    () =>
      makeRadialGrid().map((points) => {
        const geometry = new BufferGeometry()
        geometry.setAttribute('position', new Float32BufferAttribute(points, 3))
        return geometry
      }),
    [],
  )

  useEffect(
    () => () => {
      contourGeometries.forEach((item) => item.geometry.dispose())
      radialGeometries.forEach((geometry) => geometry.dispose())
      terrainGeometry.dispose()
    },
    [contourGeometries, radialGeometries, terrainGeometry],
  )

  useFrame((state, delta) => {
    const elapsed = state.clock.elapsedTime

    if (map.current) {
      map.current.rotation.y += delta * 0.015
      map.current.position.y = Math.sin(elapsed * 0.8) * 0.025
    }
    if (scanner.current) scanner.current.rotation.y -= delta * 0.28
  })

  return (
    <group ref={map} rotation={[0, 0, 0]} scale={1.05}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.075, 0]}>
        <circleGeometry args={[4.7, 192]} />
        <meshBasicMaterial
          color="#05090a"
          transparent
          opacity={0.58}
          side={DoubleSide}
        />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.065, 0]}>
        <ringGeometry args={[0.62, 4.72, 192]} />
        <meshBasicMaterial
          color="#18313a"
          transparent
          opacity={0.24}
          side={DoubleSide}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <mesh position={[0, -0.018, 0]}>
        <primitive attach="geometry" object={terrainGeometry} />
        <meshStandardMaterial
          color="#0d2229"
          emissive="#12333b"
          emissiveIntensity={0.55}
          metalness={0.42}
          roughness={0.36}
          transparent
          opacity={0.82}
          side={DoubleSide}
        />
      </mesh>

      <mesh position={[0, 0.004, 0]}>
        <primitive attach="geometry" object={terrainGeometry} />
        <meshBasicMaterial
          color="#d8f6f4"
          wireframe
          transparent
          opacity={0.18}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {radialGeometries.map((geometry, index) => (
        <line key={`radial-${index}`}>
          <primitive attach="geometry" object={geometry} />
          <lineBasicMaterial
            color={index % 4 === 0 ? '#ffd21f' : '#7bcfe8'}
            transparent
            opacity={index % 4 === 0 ? 0.16 : 0.07}
            blending={AdditiveBlending}
            depthWrite={false}
          />
        </line>
      ))}

      <ExpandingDiscRipples />

      {[1.15, 1.85, 2.55, 3.25, 4.1, 4.65].map((radius, index) => (
        <OrbitRing
          key={radius}
          color={index % 2 === 0 ? '#f6d252' : '#aee9ff'}
          opacity={index % 2 === 0 ? 0.28 : 0.2}
          radius={radius}
          tube={index === 5 ? 0.025 : 0.01}
        />
      ))}

      {contourGeometries.map((item, index) => (
        <line key={`contour-${index}`}>
          <primitive attach="geometry" object={item.geometry} />
          <lineBasicMaterial
            color={item.color}
            transparent
            opacity={item.opacity}
            blending={AdditiveBlending}
            depthWrite={false}
          />
        </line>
      ))}

      {pylons.map((pylon, index) => (
        <group
          key={`${pylon.x}-${pylon.z}`}
          position={[pylon.x, terrainHeight(pylon.x, pylon.z) + 0.05, pylon.z]}
        >
          <mesh position={[0, pylon.height / 2, 0]}>
            <cylinderGeometry args={[0.012, 0.03, pylon.height, 16]} />
            <meshBasicMaterial
              color={pylon.color}
              transparent
              opacity={0.62}
              blending={AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
            <torusGeometry args={[0.24 + index * 0.025, 0.012, 8, 96]} />
            <meshBasicMaterial
              color={pylon.color}
              transparent
              opacity={0.82}
              blending={AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
          <mesh position={[0, pylon.height + 0.035, 0]}>
            <sphereGeometry args={[0.052, 16, 16]} />
            <meshBasicMaterial
              color={pylon.color}
              transparent
              opacity={0.95}
              blending={AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        </group>
      ))}

      <group ref={scanner}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.045, 0]}>
          <ringGeometry args={[4.48, 4.57, 192, 1, 0.24, Math.PI * 0.32]} />
          <meshBasicMaterial
            color="#ffd21f"
            transparent
            opacity={0.86}
            side={DoubleSide}
            blending={AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
          <ringGeometry args={[3.78, 3.82, 192, 1, 3.24, Math.PI * 0.24]} />
          <meshBasicMaterial
            color="#7be6ff"
            transparent
            opacity={0.72}
            side={DoubleSide}
            blending={AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      </group>
    </group>
  )
}
