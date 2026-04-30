import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  Color,
  DoubleSide,
  Mesh,
  type Group,
  type Mesh as ThreeMesh,
  MeshBasicMaterial,
  ShaderMaterial,
  Vector3,
} from 'three'
import { categoryNodes, terrainHeight, type CategoryIntensityMap, type CategoryKey } from './coreSceneConfig'

function applyBeaconOpacity(group: Group, opacity: number) {
  group.traverse((object) => {
    if (!(object instanceof Mesh)) return
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    materials.forEach((material) => {
      if (!(material instanceof MeshBasicMaterial) && !(material instanceof ShaderMaterial)) return
      const dynamicOpacity = material.userData.dynamicOpacity
      const stored = material.userData.baseOpacity
      const shaderOpacity =
        material instanceof ShaderMaterial && typeof material.uniforms.uOpacity?.value === 'number'
          ? material.uniforms.uOpacity.value
          : undefined
      const baseOpacity =
        typeof dynamicOpacity === 'number'
          ? dynamicOpacity
          : typeof stored === 'number'
            ? stored
            : shaderOpacity ?? material.opacity

      if (typeof dynamicOpacity !== 'number') material.userData.baseOpacity = baseOpacity
      if (material instanceof ShaderMaterial && material.uniforms.uOpacity) {
        material.uniforms.uOpacity.value = Math.min(1, baseOpacity * opacity)
      } else {
        material.opacity = Math.min(1, baseOpacity * opacity)
      }
    })
  })
}

function setDynamicOpacity(mesh: ThreeMesh | null, opacity: number) {
  if (!mesh) return
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
  materials.forEach((material) => {
    if (material instanceof MeshBasicMaterial || material instanceof ShaderMaterial) {
      material.userData.dynamicOpacity = opacity
    }
  })
}

const auraVertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const beamFragmentShader = `
varying vec2 vUv;
uniform float uTime;
uniform float uOpacity;
uniform float uIntensity;
uniform vec3 uColor;
uniform vec3 uAccent;

void main() {
  float circumference = abs(sin(vUv.x * 6.2831853));
  float verticalFade = smoothstep(0.02, 0.18, vUv.y) * (1.0 - smoothstep(0.78, 1.0, vUv.y));
  float centerBlade = pow(circumference, 7.0);
  float sideBlade = pow(abs(sin(vUv.x * 18.849556)), 11.0) * 0.34;
  float scan = smoothstep(0.46, 0.98, sin(vUv.y * 34.0 - uTime * (5.2 + uIntensity * 2.1)) * 0.5 + 0.5);
  float packet = 1.0 - smoothstep(0.02, 0.13, abs(fract(vUv.y * 2.4 - uTime * (0.35 + uIntensity * 0.2)) - 0.5));
  float shimmer = 0.78 + 0.22 * sin(uTime * 2.7 + vUv.y * 12.0 + vUv.x * 6.2831853);
  float energy = centerBlade * 0.72 + sideBlade + scan * 0.22 + packet * 0.28;
  float alpha = energy * verticalFade * shimmer * uOpacity;
  vec3 color = mix(uColor, uAccent, packet * 0.46 + scan * 0.18) * (0.72 + energy * 0.5 + uIntensity * 0.24);

  gl_FragColor = vec4(color, alpha);
}
`

const auraFragmentShader = `
varying vec2 vUv;
uniform float uTime;
uniform float uOpacity;
uniform float uIntensity;
uniform vec3 uColor;

void main() {
  float x = abs(vUv.x - 0.5) * 2.0;
  float center = pow(max(0.0, 1.0 - x), 1.72);
  float bottomFade = smoothstep(0.0, 0.18, vUv.y);
  float topFade = 1.0 - smoothstep(0.72, 1.0, vUv.y);
  float vertical = bottomFade * topFade;
  float scan = 0.66 + 0.34 * sin((vUv.y * (18.0 + uIntensity * 6.0)) - uTime * (3.2 + uIntensity * 1.4));
  float lattice = smoothstep(0.82, 0.99, sin(vUv.y * 52.0 - uTime * 2.4) * 0.5 + 0.5) * 0.16;
  float alpha = center * vertical * (scan + lattice) * uOpacity;

  gl_FragColor = vec4(uColor, alpha);
}
`

const baseGlowFragmentShader = `
varying vec2 vUv;
uniform float uTime;
uniform float uOpacity;
uniform float uIntensity;
uniform vec3 uColor;

void main() {
  vec2 p = (vUv - 0.5) * 2.0;
  float r = length(p);
  float angle = atan(p.y, p.x);
  float edgeFade = 1.0 - smoothstep(0.82, 1.0, r);
  float core = pow(max(0.0, 1.0 - r), 2.2);
  float ringA = 1.0 - smoothstep(0.025, 0.055, abs(r - 0.38));
  float ringB = 1.0 - smoothstep(0.02, 0.06, abs(r - 0.62));
  float ringC = 1.0 - smoothstep(0.015, 0.052, abs(r - (0.72 + sin(uTime * 0.55) * 0.035)));
  float spokes = pow(max(0.0, cos(angle * 6.0 + uTime * (0.45 + uIntensity * 0.2))), 18.0) * smoothstep(0.18, 0.72, r);
  float scan = 0.78 + 0.22 * sin(r * (20.0 + uIntensity * 5.0) - uTime * 2.4);
  float alpha = (core * 0.28 + ringA * 0.44 + ringB * 0.34 + ringC * 0.2 + spokes * 0.32) * edgeFade * scan * uOpacity;

  gl_FragColor = vec4(uColor, alpha);
}
`

const challengeBeamPalette: Record<CategoryKey, { accent: string; core: string; highlight: string }> = {
  web: { accent: '#ffb000', core: '#ffb000', highlight: '#fff1a8' },
  pwn: { accent: '#ff4d6d', core: '#ff4d6d', highlight: '#ffd1dc' },
  rev: { accent: '#b8ff3d', core: '#b8ff3d', highlight: '#efffba' },
  crypto: { accent: '#20e0ff', core: '#20e0ff', highlight: '#c9faff' },
  misc: { accent: '#a66cff', core: '#a66cff', highlight: '#ead9ff' },
  forensics: { accent: '#4ea3ff', core: '#4ea3ff', highlight: '#d9ecff' },
}

function beaconPalette(node: (typeof categoryNodes)[number]) {
  return challengeBeamPalette[node.key]
}

function Beacon({
  activeCategory,
  categoryIntensity,
  hoverCategory,
  index,
  node,
  onHoverCategory,
  onSelectCategory,
}: {
  activeCategory: CategoryKey | null
  categoryIntensity: CategoryIntensityMap
  hoverCategory: CategoryKey | null
  index: number
  node: (typeof categoryNodes)[number]
  onHoverCategory: (key: CategoryKey | null) => void
  onSelectCategory: (key: CategoryKey) => void
}) {
  const group = useRef<Group>(null)
  const beam = useRef<Group>(null)
  const coreLine = useRef<ThreeMesh>(null)
  const baseGlow = useRef<ThreeMesh>(null)
  const baseGlowMaterial = useRef<ShaderMaterial>(null)
  const coreBeamMaterial = useRef<ShaderMaterial>(null)
  const liftedGlyph = useRef<Group>(null)
  const pulseRing = useRef<ThreeMesh>(null)
  const scanArc = useRef<ThreeMesh>(null)
  const topSparkle = useRef<ThreeMesh>(null)
  const auraMaterials = useRef<Array<ShaderMaterial | null>>([])
  const particleRefs = useRef<Array<ThreeMesh | null>>([])
  const cameraLocalPosition = useMemo(() => new Vector3(), [])
  const isPriority = node.name === 'Web' || node.name === 'Pwn'
  const palette = beaconPalette(node)
  const color = palette.core
  const accent = palette.accent
  const highlight = palette.highlight
  const dataIntensity = categoryIntensity[node.key] ?? 0.5
  const height = (isPriority ? 1.18 : 0.96 + (index % 3) * 0.08) + dataIntensity * 0.1
  const baseY = terrainHeight(node.x, node.z) + 0.045
  const auraUniforms = useMemo(
    () =>
      Array.from({ length: 3 }, () => ({
        uTime: { value: 0 },
        uOpacity: { value: 0.1 },
        uIntensity: { value: dataIntensity },
        uColor: { value: new Color(color) },
      })),
    [color, dataIntensity],
  )
  const coreBeamUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uOpacity: { value: 0.48 },
      uIntensity: { value: dataIntensity },
      uColor: { value: new Color(color) },
      uAccent: { value: new Color(highlight) },
    }),
    [color, dataIntensity, highlight],
  )
  const baseGlowUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uOpacity: { value: 0.18 },
      uIntensity: { value: dataIntensity },
      uColor: { value: new Color(accent) },
    }),
    [accent, dataIntensity],
  )
  const auraPlanes = useMemo(
    () =>
      Array.from({ length: 3 }, (_, auraIndex) => ({
        height: height + 0.06 + auraIndex * 0.06,
        rotation: (Math.PI / 3) * auraIndex,
        width: 0.26 + auraIndex * 0.05,
      })),
    [height],
  )
  const glyphTicks = useMemo(
    () =>
      Array.from({ length: 6 }, (_, tickIndex) => {
        const angle = (tickIndex / 6) * Math.PI * 2
        return {
          angle,
          x: Math.cos(angle) * 0.275,
          z: Math.sin(angle) * 0.275,
        }
      }),
    [],
  )
  const hexSegments = useMemo(
    () =>
      Array.from({ length: 6 }, (_, segmentIndex) => {
        const angle = (segmentIndex / 6) * Math.PI * 2 + Math.PI / 6
        return {
          angle,
          x: Math.cos(angle) * 0.22,
          z: Math.sin(angle) * 0.22,
        }
      }),
    [],
  )
  const particles = useMemo(
    () =>
      Array.from({ length: isPriority ? 8 : 6 }, (_, particleIndex) => {
        const seed = (index + 1) * (particleIndex + 3)
        const angle = seed * 1.93
        return {
          angle,
          phase: (seed * 0.137) % 1,
          radius: 0.055 + ((seed * 17) % 9) * 0.0075,
          size: 0.012 + (particleIndex % 4) * 0.0035,
          speed: 0.13 + (particleIndex % 3) * 0.025,
        }
      }),
    [index, isPriority],
  )

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const pulse = Math.sin(t * (1.35 + dataIntensity * 0.62) + index * 0.72) * 0.5 + 0.5
    const selected = activeCategory === node.key
    const hovered = hoverCategory === node.key
    const hasFocus = Boolean(activeCategory)
    const dim = hasFocus && !selected ? 0.16 : 1
    const boost = selected ? 1.35 : hovered ? 1.16 : 1
    const visibility = dim * boost
    const activity = selected ? 1 : hovered ? 0.58 : dataIntensity * 0.22

    if (beam.current) {
      beam.current.scale.y = 0.96 + pulse * (0.06 + dataIntensity * 0.035) + activity * 0.06
      beam.current.position.y = baseY + (height * beam.current.scale.y) / 2
      if (group.current) {
        cameraLocalPosition.copy(state.camera.position)
        group.current.worldToLocal(cameraLocalPosition)
        beam.current.rotation.y = Math.atan2(cameraLocalPosition.x, cameraLocalPosition.z)
      }
    }

    if (coreBeamMaterial.current) {
      coreBeamMaterial.current.uniforms.uTime.value = t + index * 0.19
      coreBeamMaterial.current.uniforms.uIntensity.value += (dataIntensity - coreBeamMaterial.current.uniforms.uIntensity.value) * 0.08
    }
    setDynamicOpacity(coreLine.current, 0.34 + dataIntensity * 0.2 + pulse * 0.06 + activity * 0.1)

    if (baseGlowMaterial.current) {
      baseGlowMaterial.current.uniforms.uTime.value = t + index * 0.33
      baseGlowMaterial.current.uniforms.uIntensity.value += (dataIntensity - baseGlowMaterial.current.uniforms.uIntensity.value) * 0.08
    }

    if (baseGlow.current) {
      baseGlow.current.scale.setScalar(1 + pulse * 0.035 + activity * 0.045)
      setDynamicOpacity(baseGlow.current, 0.16 + dataIntensity * 0.08 + pulse * 0.03 + activity * 0.12)
    }

    if (liftedGlyph.current) {
      liftedGlyph.current.rotation.y = t * (0.08 + activity * 0.08) + index * 0.2
      liftedGlyph.current.position.y = baseY + 0.052 + pulse * 0.004
    }

    auraMaterials.current.forEach((material, auraIndex) => {
      if (!material) return
      material.uniforms.uTime.value = t + index * 0.47 + auraIndex * 0.2
      material.uniforms.uIntensity.value += (dataIntensity - material.uniforms.uIntensity.value) * 0.08
      material.userData.dynamicOpacity = 0.085 + dataIntensity * 0.035 + pulse * 0.016 + activity * 0.03 - auraIndex * 0.007
    })

    if (scanArc.current) {
      scanArc.current.rotation.z = t * (0.52 + dataIntensity * 0.32 + activity * 0.65) + index
      setDynamicOpacity(scanArc.current, 0.34 + dataIntensity * 0.16 + activity * 0.18)
    }

    if (pulseRing.current) {
      const u = (t * (0.34 + dataIntensity * 0.18 + activity * 0.3) + index * 0.18) % 1
      pulseRing.current.scale.setScalar(0.9 + u * 1.55)
      setDynamicOpacity(pulseRing.current, (1 - u) * (0.2 + dataIntensity * 0.14 + activity * 0.07))
    }

    if (topSparkle.current) {
      topSparkle.current.position.y = baseY + height + 0.055 + pulse * (0.022 + activity * 0.018)
      topSparkle.current.rotation.y = t * (0.85 + activity * 0.3) + index
      topSparkle.current.rotation.z = t * 0.42
      topSparkle.current.scale.setScalar(0.95 + pulse * 0.08 + activity * 0.06)
      setDynamicOpacity(topSparkle.current, 0.52 + pulse * 0.08 + activity * 0.08)
    }

    const particleSpeed = selected ? 1.55 : hovered ? 1.25 : 0.86 + dataIntensity * 0.28
    particles.forEach((particle, particleIndex) => {
      const mesh = particleRefs.current[particleIndex]
      if (!mesh) return
      const progress = (particle.phase + t * particle.speed * particleSpeed) % 1
      const drift = Math.sin(t * 0.7 + particleIndex) * 0.012
      mesh.position.set(
        Math.cos(particle.angle) * (particle.radius + drift),
        baseY + 0.045 + progress * (height * 0.88),
        Math.sin(particle.angle) * (particle.radius - drift),
      )
      const fade = Math.sin(progress * Math.PI)
      setDynamicOpacity(mesh, 0.16 + dataIntensity * 0.08 + fade * (0.24 + activity * 0.08))
    })

    if (group.current) applyBeaconOpacity(group.current, visibility)
  })

  return (
    <group
      ref={group}
      position={[node.x, 0, node.z]}
      onClick={(event) => {
        event.stopPropagation()
        onSelectCategory(node.key)
      }}
      onPointerOver={(event) => {
        event.stopPropagation()
        onHoverCategory(node.key)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={(event) => {
        event.stopPropagation()
        onHoverCategory(null)
        document.body.style.cursor = ''
      }}
    >
      <group ref={beam} position={[0, baseY + height / 2, 0]}>
        <mesh ref={coreLine} raycast={() => undefined}>
          <cylinderGeometry args={[0.022, 0.034, height, 28, 1, true]} />
          <shaderMaterial
            ref={coreBeamMaterial}
            vertexShader={auraVertexShader}
            fragmentShader={beamFragmentShader}
            transparent
            side={DoubleSide}
            blending={AdditiveBlending}
            depthTest={false}
            depthWrite={false}
            uniforms={coreBeamUniforms}
          />
        </mesh>
        {auraPlanes.map((plane, auraIndex) => (
          <mesh key={plane.rotation} rotation={[0, plane.rotation, 0]} raycast={() => undefined}>
            <planeGeometry args={[plane.width, plane.height]} />
            <shaderMaterial
              ref={(material) => {
                auraMaterials.current[auraIndex] = material
              }}
              vertexShader={auraVertexShader}
              fragmentShader={auraFragmentShader}
              transparent
              side={DoubleSide}
              blending={AdditiveBlending}
              depthTest={false}
              depthWrite={false}
              uniforms={auraUniforms[auraIndex]}
            />
          </mesh>
        ))}
      </group>

      <mesh ref={baseGlow} rotation={[-Math.PI / 2, 0, 0]} position={[0, baseY + 0.022, 0]} raycast={() => undefined}>
        <circleGeometry args={[0.43, 96]} />
        <shaderMaterial
          ref={baseGlowMaterial}
          vertexShader={auraVertexShader}
          fragmentShader={baseGlowFragmentShader}
          transparent
          side={DoubleSide}
          blending={AdditiveBlending}
          depthWrite={false}
          uniforms={baseGlowUniforms}
        />
      </mesh>

      <group ref={liftedGlyph} position={[0, baseY + 0.052, 0]}>
        {hexSegments.map((segment) => (
          <group key={segment.angle} position={[segment.x, 0, segment.z]} rotation={[0, -segment.angle + Math.PI / 2, 0]}>
            <mesh raycast={() => undefined}>
              <boxGeometry args={[0.13, 0.018, 0.022]} />
              <meshBasicMaterial
                color={color}
                transparent
                opacity={0.52}
                blending={AdditiveBlending}
                depthWrite={false}
              />
            </mesh>
            <mesh position={[0, -0.002, 0]} scale={[1.18, 1.2, 1.45]} raycast={() => undefined}>
              <boxGeometry args={[0.13, 0.018, 0.022]} />
              <meshBasicMaterial
                color={accent}
                transparent
                opacity={0.18}
                blending={AdditiveBlending}
                depthWrite={false}
              />
            </mesh>
          </group>
        ))}
        <mesh rotation={[Math.PI / 2, 0, Math.PI / 6]} position={[0, 0.012, 0]} raycast={() => undefined}>
          <ringGeometry args={[0.18, 0.194, 6, 1]} />
          <meshBasicMaterial
            color={accent}
            transparent
            opacity={0.42}
            side={DoubleSide}
            blending={AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.016, 0]} raycast={() => undefined}>
          <ringGeometry args={[0.092, 0.104, 6, 1]} />
          <meshBasicMaterial
            color={accent}
            transparent
            opacity={0.34}
            side={DoubleSide}
            blending={AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      </group>

      <mesh ref={scanArc} rotation={[Math.PI / 2, 0, 0]} position={[0, baseY + 0.082, 0]} raycast={() => undefined}>
        <torusGeometry args={[0.255, 0.009, 6, 52, Math.PI * 0.76]} />
        <meshBasicMaterial
          color={accent}
          transparent
          opacity={0.34}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <mesh ref={pulseRing} rotation={[Math.PI / 2, 0, 0]} position={[0, baseY + 0.036, 0]} raycast={() => undefined}>
        <torusGeometry args={[0.245, 0.007, 6, 96]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.18}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {glyphTicks.map((tick) => (
        <mesh
          key={tick.angle}
          position={[tick.x, baseY + 0.036, tick.z]}
          rotation={[0, -tick.angle, 0]}
          raycast={() => undefined}
        >
          <boxGeometry args={[0.05, 0.004, 0.008]} />
          <meshBasicMaterial
            color={accent}
            transparent
            opacity={0.5}
            blending={AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}

      {[
        [0.17, 0, 0.04, 0.005],
        [-0.17, 0, 0.04, 0.005],
        [0, 0.17, 0.005, 0.04],
        [0, -0.17, 0.005, 0.04],
      ].map(([x, z, sx, sz]) => (
        <mesh key={`${x}-${z}`} position={[x, baseY + 0.04, z]} raycast={() => undefined}>
          <boxGeometry args={[sx, 0.006, sz]} />
          <meshBasicMaterial
            color={accent}
            transparent
            opacity={0.42}
            blending={AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}

      {particles.map((particle, particleIndex) => (
        <mesh
          key={particleIndex}
          ref={(mesh) => {
            particleRefs.current[particleIndex] = mesh
          }}
          position={[Math.cos(particle.angle) * particle.radius, baseY + 0.05, Math.sin(particle.angle) * particle.radius]}
          raycast={() => undefined}
        >
          <sphereGeometry args={[particle.size, 8, 8]} />
          <meshBasicMaterial
            color={particleIndex % 3 === 0 ? accent : color}
            transparent
            opacity={0.34}
            blending={AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}

      <mesh ref={topSparkle} position={[0, baseY + height + 0.055, 0]} raycast={() => undefined}>
        <octahedronGeometry args={[isPriority ? 0.056 : 0.048, 0]} />
        <meshBasicMaterial
          color={accent}
          transparent
          opacity={0.62}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, baseY + height * 0.45, 0]}>
        <cylinderGeometry args={[0.42, 0.42, height + 0.25, 24, 1, true]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  )
}

export function CategoryBeacons({
  activeCategory,
  categoryIntensity,
  hoverCategory,
  onHoverCategory,
  onSelectCategory,
}: {
  activeCategory: CategoryKey | null
  categoryIntensity: CategoryIntensityMap
  hoverCategory: CategoryKey | null
  onHoverCategory: (key: CategoryKey | null) => void
  onSelectCategory: (key: CategoryKey) => void
}) {
  return (
    <group>
      {categoryNodes.map((node, index) => (
        <Beacon
          key={node.name}
          activeCategory={activeCategory}
          categoryIntensity={categoryIntensity}
          hoverCategory={hoverCategory}
          index={index}
          node={node}
          onHoverCategory={onHoverCategory}
          onSelectCategory={onSelectCategory}
        />
      ))}
    </group>
  )
}
