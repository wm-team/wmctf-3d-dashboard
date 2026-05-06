import { Billboard, Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  PointsMaterial,
  ShaderMaterial,
  type Group,
  type Points,
} from 'three'
import { COLORS } from '@/components/canvas/core/coreSceneConfig'
import { getRankSlot, rankTone } from './teamRankLayout'

const floorVertexShader = `
  varying vec2 vUv;
  varying vec3 vLocalPosition;

  void main() {
    vUv = uv;
    vLocalPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const floorFragmentShader = `
  varying vec2 vUv;
  varying vec3 vLocalPosition;
  uniform float uTime;
  uniform vec3 uCyan;
  uniform vec3 uGold;

  void main() {
    vec2 p = (vUv - 0.5) * 2.0;
    float r = length(p);
    float angle = atan(p.y, p.x);
    float disc = 1.0 - smoothstep(0.94, 1.0, r);
    float center = 1.0 - smoothstep(0.0, 0.28, r);
    float inner = 1.0 - smoothstep(0.01, 0.032, abs(r - 0.24));
    float middle = 1.0 - smoothstep(0.008, 0.025, abs(r - 0.52));
    float outer = 1.0 - smoothstep(0.008, 0.024, abs(r - 0.78));
    float rankBand = inner * 0.42 + middle * 0.34 + outer * 0.26;
    float lane = pow(max(0.0, cos(angle * 12.0)), 26.0) * smoothstep(0.14, 0.86, r);
    float sweep = pow(max(0.0, cos(angle - uTime * 0.34)), 20.0) * smoothstep(0.18, 0.88, r);
    float cellGrid =
      smoothstep(0.965, 1.0, sin((p.x + 1.0) * 36.0 + uTime * 0.12) * 0.5 + 0.5) *
      smoothstep(0.945, 1.0, sin((p.y + 1.0) * 30.0 - uTime * 0.1) * 0.5 + 0.5);
    float vignette = 1.0 - smoothstep(0.58, 1.0, r);

    vec3 base = vec3(0.012, 0.03, 0.035);
    vec3 color = base;
    color += uCyan * (0.055 + lane * 0.12 + cellGrid * 0.045) * disc;
    color += uGold * (center * 0.22 + rankBand * 0.46 + sweep * 0.16) * disc;
    color += uCyan * vignette * 0.045;

    float alpha = (0.52 + rankBand * 0.18 + lane * 0.05 + sweep * 0.06 + center * 0.08) * disc;
    gl_FragColor = vec4(color, alpha);
  }
`

function TeamRankingFloor() {
  const material = useRef<ShaderMaterial>(null)
  const uniforms = useMemo(
    () => ({
      uCyan: { value: new Color(COLORS.cyan) },
      uGold: { value: new Color(COLORS.yellow) },
      uTime: { value: 0 },
    }),
    [],
  )

  useFrame((state) => {
    if (material.current) material.current.uniforms.uTime.value = state.clock.elapsedTime
  })

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} renderOrder={4} raycast={() => undefined}>
      <circleGeometry args={[4.86, 192]} />
      <shaderMaterial
        ref={material}
        blending={AdditiveBlending}
        depthWrite={false}
        fragmentShader={floorFragmentShader}
        transparent
        uniforms={uniforms}
        vertexShader={floorVertexShader}
        side={DoubleSide}
      />
    </mesh>
  )
}

function OrbitRings() {
  const rings = useRef<Group>(null)
  const configs = [
    { label: 'TOP 1', radius: 0.72, color: COLORS.yellow, opacity: 0.38, speed: 0.28 },
    { label: 'TOP 2-3', radius: 1.28, color: '#fff1a8', opacity: 0.32, speed: -0.2 },
    { label: 'TOP 4-10', radius: 2.46, color: COLORS.cyan, opacity: 0.28, speed: 0.12 },
    { label: 'TOP 11-30', radius: 3.64, color: COLORS.cyanSoft, opacity: 0.16, speed: -0.08 },
    { label: 'FIELD', radius: 4.36, color: '#455d66', opacity: 0.18, speed: 0.04 },
  ] as const

  useFrame((_, delta) => {
    if (!rings.current) return
    configs.forEach((config, index) => {
      const child = rings.current?.children[index]
      if (child) child.rotation.z += delta * config.speed
    })
  })

  return (
    <group ref={rings} position={[0, 0.02, 0]} raycast={() => undefined}>
      {configs.map((config, index) => (
        <mesh key={config.label} rotation={[Math.PI / 2, 0, index * 0.18]} renderOrder={12}>
          <torusGeometry args={[config.radius, index === 0 ? 0.012 : 0.008, 7, 220, Math.PI * (index < 3 ? 1.74 : 1.18)]} />
          <meshBasicMaterial color={config.color} transparent opacity={config.opacity} blending={AdditiveBlending} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}

function SeatMarkers() {
  const seats = Array.from({ length: 10 }, (_, index) => {
    const rank = index + 1
    return {
      rank,
      slot: getRankSlot(rank),
      tone: rankTone(rank),
    }
  })

  return (
    <group raycast={() => undefined}>
      {seats.map(({ rank, slot, tone }) => (
        <group key={rank} position={slot.position}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.09, 0]} renderOrder={14}>
            <ringGeometry args={[rank === 1 ? 0.42 : 0.28, rank === 1 ? 0.46 : 0.31, 48]} />
            <meshBasicMaterial color={tone} transparent opacity={rank <= 3 ? 0.3 : 0.16} side={DoubleSide} blending={AdditiveBlending} depthWrite={false} />
          </mesh>
          <mesh position={[0, -0.04, 0]} renderOrder={13}>
            <cylinderGeometry args={[rank === 1 ? 0.22 : 0.13, rank === 1 ? 0.28 : 0.18, rank === 1 ? 0.08 : 0.045, 6, 1, false]} />
            <meshBasicMaterial color={tone} transparent opacity={rank <= 3 ? 0.24 : 0.11} blending={AdditiveBlending} depthWrite={false} />
          </mesh>
          {rank <= 10 && (
            <Billboard follow position={[0, -0.01, 0]} raycast={() => undefined}>
              <Text anchorX="center" anchorY="middle" color={tone} fontSize={rank <= 3 ? 0.055 : 0.038} fontWeight={900} outlineColor="#020608" outlineWidth={0.003} renderOrder={41}>
                {`TOP ${rank}`}
              </Text>
            </Billboard>
          )}
        </group>
      ))}
    </group>
  )
}

function RadialLanes() {
  const lanes = useMemo(
    () =>
      Array.from({ length: 18 }, (_, index) => {
        const angle = (index / 18) * Math.PI * 2
        const major = index % 6 === 0
        const inner = major ? 0.78 : 1.34
        const outer = major ? 4.36 : 3.68
        return {
          angle,
          color: major ? COLORS.cyanSoft : '#4d626b',
          inner,
          outer,
          opacity: major ? 0.13 : 0.045,
        }
      }),
    [],
  )

  return (
    <group position={[0, 0.0, 0]} raycast={() => undefined}>
      {lanes.map((lane) => (
        <line key={lane.angle}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[
                new Float32Array([
                  Math.cos(lane.angle) * lane.inner,
                  -0.045,
                  Math.sin(lane.angle) * lane.inner,
                  Math.cos(lane.angle) * lane.outer,
                  -0.045,
                  Math.sin(lane.angle) * lane.outer,
                ]),
                3,
              ]}
            />
          </bufferGeometry>
          <lineBasicMaterial color={lane.color} transparent opacity={lane.opacity} blending={AdditiveBlending} depthWrite={false} />
        </line>
      ))}
    </group>
  )
}

function BackgroundPointMatrix() {
  const points = useRef<Points>(null)
  const material = useRef<PointsMaterial>(null)
  const geometry = useMemo(() => {
    const positions: number[] = []
    for (let index = 0; index < 180; index += 1) {
      const angle = index * 2.399963229728653
      const radius = 3.2 + ((index * 29) % 112) / 100
      positions.push(Math.cos(angle) * radius, -0.02 + ((index % 5) - 2) * 0.003, Math.sin(angle) * radius)
    }
    const nextGeometry = new BufferGeometry()
    nextGeometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
    return nextGeometry
  }, [])

  useEffect(
    () => () => {
      geometry.dispose()
    },
    [geometry],
  )

  useFrame((state) => {
    if (!points.current) return
    points.current.rotation.y = state.clock.elapsedTime * 0.018
    if (material.current) material.current.opacity = 0.16 + Math.sin(state.clock.elapsedTime * 0.62) * 0.035
  })

  return (
    <points ref={points} geometry={geometry} raycast={() => undefined}>
      <pointsMaterial
        ref={material}
        blending={AdditiveBlending}
        color={COLORS.cyanSoft}
        depthWrite={false}
        opacity={0.22}
        size={0.022}
        transparent
      />
    </points>
  )
}

export function TeamOrbitField() {
  return (
    <group raycast={() => undefined}>
      <TeamRankingFloor />
      <OrbitRings />
      <RadialLanes />
      <SeatMarkers />
      <BackgroundPointMatrix />
    </group>
  )
}
