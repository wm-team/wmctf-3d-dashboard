import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  CatmullRomCurve3,
  Color,
  ShaderMaterial,
  TubeGeometry,
  Vector3,
} from 'three'
import {
  COLORS,
  flowRoutes,
  getCategoryNode,
  getCategoryNodeByKey,
  terrainHeight,
  type CategoryIntensityMap,
  type CategoryKey,
} from './coreSceneConfig'

type FlowArc = {
  color: string
  from: CategoryKey
  geometry: TubeGeometry
  key: string
  speed: number
  to: CategoryKey
}

type LocalArc = {
  geometry: TubeGeometry
  key: string
}

const flowVertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const flowFragmentShader = `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uPhase;
  uniform float uPulse;
  uniform float uSpeed;
  uniform float uTime;
  varying vec2 vUv;

  void main() {
    float packet = fract(vUv.x * 2.6 - uTime * uSpeed + uPhase);
    float packetCore = 1.0 - smoothstep(0.0, 0.28, packet);
    float dash = sin((vUv.x * 18.0 - uTime * uSpeed * 4.2 + uPhase * 6.28318) * 3.14159) * 0.5 + 0.5;
    float dashCore = smoothstep(0.58, 0.98, dash);
    float sideFade = 1.0 - smoothstep(0.18, 0.5, abs(vUv.y - 0.5));
    float pulse = 0.82 + 0.18 * sin(uTime * 2.2 + uPhase * 6.28318);
    float energy = 0.34 + packetCore * 0.72 + dashCore * 0.2;
    float alpha = uOpacity * sideFade * energy * mix(0.88, pulse, uPulse);
    vec3 color = uColor * (0.58 + energy * 0.5 + uPulse * 0.2);

    gl_FragColor = vec4(color, alpha);
  }
`

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
    from: fromName,
    geometry: new TubeGeometry(curve, 96, isPriority ? 0.014 : 0.01, 7, false),
    key: `${fromName}-${toName}`,
    speed: 0.18 + index * 0.018,
    to: toName,
  }
}

function makeLocalArcs(activeCategory: CategoryKey | null) {
  if (!activeCategory) return []
  const node = getCategoryNodeByKey(activeCategory)
  return Array.from({ length: 3 }, (_, index): LocalArc => {
    const angle = index * 1.62 + node.phase
    const start = new Vector3(
      node.x + Math.cos(angle) * 0.78,
      terrainHeight(node.x, node.z) + 0.22,
      node.z + Math.sin(angle) * 0.78,
    )
    const end = new Vector3(
      node.x + Math.cos(angle + 1.2) * 0.68,
      terrainHeight(node.x, node.z) + 0.27,
      node.z + Math.sin(angle + 1.2) * 0.68,
    )
    const curve = new CatmullRomCurve3([
      start,
      new Vector3(
        node.x + Math.cos(angle + 0.48) * 0.34,
        terrainHeight(node.x, node.z) + 0.58,
        node.z + Math.sin(angle + 0.48) * 0.34,
      ),
      end,
    ])

    return {
      geometry: new TubeGeometry(curve, 58, 0.008, 6, false),
      key: `${activeCategory}-${index}`,
    }
  })
}

export function FlowArcs({
  activeCategory,
  categoryIntensity,
}: {
  activeCategory: CategoryKey | null
  categoryIntensity: CategoryIntensityMap
}) {
  const arcMaterials = useRef<Array<ShaderMaterial | null>>([])
  const localMaterials = useRef<Array<ShaderMaterial | null>>([])
  const arcs = useMemo(() => flowRoutes.map(makeFlowArc), [])
  const localArcs = useMemo(() => makeLocalArcs(activeCategory), [activeCategory])
  const arcUniforms = useMemo(
    () =>
      arcs.map((arc, index) => ({
        uColor: { value: new Color(arc.color) },
        uOpacity: { value: 0.26 },
        uPhase: { value: index * 0.17 },
        uPulse: { value: 0 },
        uSpeed: { value: arc.speed },
        uTime: { value: 0 },
      })),
    [arcs],
  )
  const localUniforms = useMemo(
    () =>
      localArcs.map((_, index) => ({
        uColor: { value: new Color(activeCategory ? getCategoryNodeByKey(activeCategory).accentColor : COLORS.cyan) },
        uOpacity: { value: 0 },
        uPhase: { value: index * 0.23 },
        uPulse: { value: 1 },
        uSpeed: { value: 0.32 + index * 0.04 },
        uTime: { value: 0 },
      })),
    [activeCategory, localArcs],
  )

  useFrame((state) => {
    const t = state.clock.elapsedTime
    arcs.forEach((arc, arcIndex) => {
      const material = arcMaterials.current[arcIndex]
      if (!material) return
      const related = !activeCategory || arc.from === activeCategory || arc.to === activeCategory
      const intensity = Math.max(categoryIntensity[arc.from] ?? 0.35, categoryIntensity[arc.to] ?? 0.35)
      material.uniforms.uTime.value = t
      material.uniforms.uOpacity.value = activeCategory && !related ? 0.018 : activeCategory ? 0.18 + intensity * 0.2 : 0.18 + intensity * 0.16
      material.uniforms.uPulse.value += ((activeCategory && related ? 1 : 0) - material.uniforms.uPulse.value) * 0.08
      material.uniforms.uSpeed.value = arc.speed * (activeCategory && related ? 1.35 : 1 + intensity * 0.24)
    })

    const activeIntensity = activeCategory ? categoryIntensity[activeCategory] ?? 0.5 : 0
    localMaterials.current.forEach((material, index) => {
      if (!material) return
      material.uniforms.uTime.value = t
      material.uniforms.uOpacity.value += ((activeCategory ? 0.16 + activeIntensity * 0.22 : 0) - material.uniforms.uOpacity.value) * 0.1
      material.uniforms.uSpeed.value = 0.32 + index * 0.04 + activeIntensity * 0.18
    })
  })

  useEffect(
    () => () => {
      arcs.forEach((arc) => arc.geometry.dispose())
      localArcs.forEach((arc) => arc.geometry.dispose())
    },
    [arcs, localArcs],
  )

  return (
    <group>
      {arcs.map((arc, arcIndex) => (
        <mesh key={arc.key} geometry={arc.geometry}>
          <shaderMaterial
            ref={(material) => {
              arcMaterials.current[arcIndex] = material
            }}
            blending={AdditiveBlending}
            depthWrite={false}
            fragmentShader={flowFragmentShader}
            transparent
            uniforms={arcUniforms[arcIndex]}
            vertexShader={flowVertexShader}
          />
        </mesh>
      ))}
      {localArcs.map((arc, index) => (
        <mesh key={`local-flow-${arc.key}`} geometry={arc.geometry}>
          <shaderMaterial
            ref={(material) => {
              localMaterials.current[index] = material
            }}
            blending={AdditiveBlending}
            depthWrite={false}
            fragmentShader={flowFragmentShader}
            transparent
            uniforms={localUniforms[index]}
            vertexShader={flowVertexShader}
          />
        </mesh>
      ))}
    </group>
  )
}
