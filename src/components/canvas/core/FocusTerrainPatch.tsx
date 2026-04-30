import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  ShaderMaterial,
  type Group,
} from 'three'
import { FocusTerrainDetails } from './FocusTerrainDetails'
import {
  COLORS,
  getCategoryNodeByKey,
  terrainHeight,
  type CategoryIntensityMap,
  type CategoryKey,
  type FocusTheme,
} from './coreSceneConfig'

const radius = 1.72

function smoothstep(edge0: number, edge1: number, value: number) {
  const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)))
  return t * t * (3 - 2 * t)
}

function themeDetail(theme: FocusTheme, x: number, z: number) {
  if (theme === 'gateway') {
    const slab = Math.max(0, 0.56 - Math.abs(x)) * 0.08 + Math.max(0, 0.42 - Math.abs(z)) * 0.06
    const lanes = Math.max(0, 0.06 - Math.abs(Math.sin((x + 0.18) * 7))) * 0.5
    return slab + lanes
  }
  if (theme === 'exploit') {
    const crack = Math.max(0, 0.08 - Math.abs(z + x * 0.26)) * 0.8
    const crater = -Math.exp(-(x * x + z * z) / 0.18) * 0.14
    return crack + crater + Math.sin((x - z) * 11) * 0.025
  }
  if (theme === 'reverse') {
    const angle = Math.atan2(z, x)
    return Math.sin(angle * 5 + Math.hypot(x, z) * 7.5) * 0.045 + Math.max(0, 0.05 - Math.abs(z - x * 0.32)) * 0.5
  }
  if (theme === 'cipher') {
    const r = Math.hypot(x, z)
    return Math.sin(r * 18) * 0.04 + Math.cos(Math.atan2(z, x) * 12) * 0.015
  }
  if (theme === 'chaos') {
    return (
      Math.sin(x * 11.3 + z * 2.2) * 0.032 +
      Math.cos(z * 12.1 - x * 2.9) * 0.028 +
      Math.sin((Math.floor((x + 2) * 3) + Math.floor((z + 2) * 3)) * 1.4) * 0.025
    )
  }
  return Math.max(0, 0.08 - Math.abs(x * 0.25 + z)) * 0.55 + Math.sin(z * 14) * 0.032
}

function makePatchGeometry(activeCategory: CategoryKey) {
  const node = getCategoryNodeByKey(activeCategory)
  const segments = 56
  const positions: number[] = []
  const falloffs: number[] = []
  const indices: number[] = []
  const baseY = terrainHeight(node.x, node.z)

  for (let row = 0; row <= segments; row += 1) {
    const z = -radius + (row / segments) * radius * 2
    for (let col = 0; col <= segments; col += 1) {
      const x = -radius + (col / segments) * radius * 2
      const distance = Math.hypot(x, z)
      const falloff = 1 - smoothstep(radius * 0.72, radius, distance)
      const worldX = node.x + x
      const worldZ = node.z + z
      const baseTerrain = terrainHeight(worldX, worldZ) - baseY
      const detail = themeDetail(node.focusTheme, x, z) * falloff
      positions.push(x, baseTerrain + detail + 0.024 * falloff, z)
      falloffs.push(falloff)
    }
  }

  for (let row = 0; row < segments; row += 1) {
    for (let col = 0; col < segments; col += 1) {
      const a = row * (segments + 1) + col
      const b = a + 1
      const c = a + segments + 1
      const d = c + 1
      indices.push(a, c, b, b, c, d)
    }
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('aFalloff', new Float32BufferAttribute(falloffs, 1))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

const vertexShader = `
  attribute float aFalloff;
  uniform float uProgress;
  varying float vFalloff;
  varying vec3 vPos;

  void main() {
    vFalloff = aFalloff;
    vec3 transformed = position;
    transformed.y *= uProgress;
    vPos = transformed;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
  }
`

const fragmentShader = `
  uniform vec3 uBase;
  uniform vec3 uAccent;
  uniform float uProgress;
  uniform float uTime;
  uniform float uIntensity;
  varying float vFalloff;
  varying vec3 vPos;

  void main() {
    float grid = (sin(vPos.x * 23.0) * sin(vPos.z * 23.0) + 1.0) * 0.5;
    float micro = (sin(vPos.x * 42.0 + vPos.z * 4.0) * sin(vPos.z * 38.0 - vPos.x * 2.0) + 1.0) * 0.5;
    float contourBand = abs(fract((vPos.y + 0.012 * sin(vPos.x * 2.0 + uTime * 0.24)) / 0.046) - 0.5);
    float contourAa = fwidth(contourBand) * 1.8;
    float contour = 1.0 - smoothstep(0.075, 0.075 + contourAa, contourBand);
    float majorBand = abs(fract((vPos.y + 0.018) / 0.184) - 0.5);
    float majorAa = fwidth(majorBand) * 1.8;
    float majorContour = 1.0 - smoothstep(0.082, 0.082 + majorAa, majorBand);
    float radial = length(vPos.xz);
    float reveal = smoothstep(1.7, 0.12, radial - uProgress * 1.9);
    float scan = 1.0 - smoothstep(0.02, 0.16, abs(fract(radial * 0.68 - uTime * (0.22 + uIntensity * 0.12)) - 0.5));
    float diagonal = smoothstep(0.82, 0.99, sin((vPos.x + vPos.z) * 18.0 - uTime * 2.1) * 0.5 + 0.5);
    float line = smoothstep(0.58, 0.96, grid) * 0.12 + smoothstep(0.76, 0.98, micro) * 0.045;
    vec3 color = mix(vec3(0.018, 0.055, 0.062), uBase, 0.28 + vFalloff * 0.2);
    color += uAccent * (line + contour * (0.42 + uIntensity * 0.12) + majorContour * 0.7 + scan * 0.14 + diagonal * 0.045);
    color += vec3(1.0, 0.86, 0.28) * majorContour * (0.16 + uIntensity * 0.12);
    float alpha = vFalloff * uProgress * reveal * (0.48 + contour * 0.2 + majorContour * 0.18 + scan * 0.06);
    gl_FragColor = vec4(color, alpha);
  }
`

export function FocusTerrainPatch({
  activeCategory,
  categoryIntensity,
}: {
  activeCategory: CategoryKey | null
  categoryIntensity?: CategoryIntensityMap
}) {
  const group = useRef<Group>(null)
  const material = useRef<ShaderMaterial>(null)
  const uniforms = useMemo(
    () => ({
      uProgress: { value: 0 },
      uTime: { value: 0 },
      uIntensity: { value: 0.5 },
      uBase: { value: new Color(COLORS.terrainBase) },
      uAccent: { value: new Color(COLORS.cyan) },
    }),
    [],
  )
  const progress = useRef(0)
  const geometry = useMemo(() => (activeCategory ? makePatchGeometry(activeCategory) : null), [activeCategory])
  const node = activeCategory ? getCategoryNodeByKey(activeCategory) : null
  const intensity = activeCategory ? categoryIntensity?.[activeCategory] ?? 0.5 : 0.5

  useEffect(() => () => geometry?.dispose(), [geometry])

  useFrame((state) => {
    progress.current += ((activeCategory ? 1 : 0) - progress.current) * 0.08
    if (material.current) {
      material.current.uniforms.uProgress.value = progress.current
      material.current.uniforms.uTime.value = state.clock.elapsedTime
      material.current.uniforms.uIntensity.value += (intensity - material.current.uniforms.uIntensity.value) * 0.08
      if (node) material.current.uniforms.uAccent.value.set(node.accentColor)
    }
    if (!group.current || !node) return
    group.current.position.set(node.x, terrainHeight(node.x, node.z) + 0.018, node.z)
  })

  if (!geometry || !node || !activeCategory) return null

  return (
    <>
      <group ref={group} position={[node.x, terrainHeight(node.x, node.z) + 0.018, node.z]}>
        <mesh geometry={geometry}>
          <shaderMaterial
            ref={material}
            vertexShader={vertexShader}
            fragmentShader={fragmentShader}
            transparent
            side={DoubleSide}
            blending={AdditiveBlending}
            depthWrite={false}
            uniforms={uniforms}
          />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
          <ringGeometry args={[radius * 0.72, radius * 0.73, 128]} />
          <meshBasicMaterial
            color={node.accentColor}
            transparent
            opacity={0.16 + intensity * 0.12}
            side={DoubleSide}
            blending={AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      </group>
      <FocusTerrainDetails activeCategory={activeCategory} categoryIntensity={categoryIntensity} />
    </>
  )
}
