import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  MeshBasicMaterial,
  PointsMaterial,
  ShaderMaterial,
  type Group,
  type Mesh,
} from 'three'
import { useChallengeShardGeometry } from './challengeModelAssets'
import { challengeVisualConfig } from './challengeVisualConfig'

const particleCount = challengeVisualConfig.solveFx.particleCount
const duration = challengeVisualConfig.solveFx.duration
const lanceCount = 18
const debrisCount = 18

function randomUnit(index: number) {
  const value = Math.sin(index * 12.9898 + 78.233) * 43758.5453
  return value - Math.floor(value)
}

function clamp01(value: number) {
  return Math.min(Math.max(value, 0), 1)
}

function makeExplosionGeometry() {
  const geometry = new BufferGeometry()
  const positions = new Float32Array(particleCount * 3)

  for (let index = 0; index < particleCount; index += 1) {
    const angle = (index / particleCount) * Math.PI * 2 + randomUnit(index) * 0.42
    const radius = 0.14 + randomUnit(index + 11) * 1.24
    const lift = 0.28 + randomUnit(index + 23) * 1.36
    const offset = index * 3
    positions[offset] = Math.cos(angle) * radius
    positions[offset + 1] = lift
    positions[offset + 2] = Math.sin(angle) * radius
  }

  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  return geometry
}

function fadeOut(value: number) {
  return Math.pow(Math.max(0, 1 - value), 2.2)
}

function easeOutExpo(value: number) {
  return value >= 1 ? 1 : 1 - Math.pow(2, -10 * value)
}

const blastLances = Array.from({ length: lanceCount }, (_, index) => {
  const angle = (index / lanceCount) * Math.PI * 2 + randomUnit(index + 61) * 0.22
  return {
    angle,
    lift: 0.3 + randomUnit(index + 91) * 0.92,
    length: 0.62 + randomUnit(index + 121) * 0.6,
    radius: 0.2 + randomUnit(index + 151) * 0.76,
    roll: (randomUnit(index + 181) - 0.5) * 0.8,
  }
})

const debrisPieces = Array.from({ length: debrisCount }, (_, index) => {
  const angle = (index / debrisCount) * Math.PI * 2 + randomUnit(index + 211) * 0.48
  return {
    angle,
    lift: 0.26 + randomUnit(index + 241) * 1.08,
    radius: 0.18 + randomUnit(index + 271) * 1.02,
    rotation: [
      randomUnit(index + 301) * Math.PI,
      randomUnit(index + 331) * Math.PI,
      randomUnit(index + 361) * Math.PI,
    ] as const,
    scale: 0.115 + randomUnit(index + 391) * 0.085,
  }
})

const shockwaveVertex = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const shockwaveFragment = `
varying vec2 vUv;
uniform float uLife;
uniform float uOpacity;
uniform vec3 uColor;

void main() {
  vec2 p = (vUv - 0.5) * 2.0;
  float r = length(p);
  float angle = atan(p.y, p.x);
  float mainRing = 1.0 - smoothstep(0.022, 0.075, abs(r - mix(0.22, 0.82, uLife)));
  float innerRing = 1.0 - smoothstep(0.018, 0.055, abs(r - mix(0.08, 0.46, uLife)));
  float spokes = pow(max(0.0, cos(angle * 10.0 - uLife * 8.0)), 18.0) * smoothstep(0.16, 0.74, r);
  float mask = 1.0 - smoothstep(0.86, 1.0, r);
  float alpha = (mainRing * 0.72 + innerRing * 0.28 + spokes * 0.24) * mask * uOpacity;
  vec3 color = mix(vec3(1.0, 0.96, 0.68), uColor, 0.68);
  gl_FragColor = vec4(color, alpha);
}
`

const blastShellVertex = `
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vLocalPosition;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = mvPosition.xyz;
  vLocalPosition = position;
  gl_Position = projectionMatrix * mvPosition;
}
`

const blastShellFragment = `
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vLocalPosition;
uniform float uLife;
uniform float uOpacity;
uniform vec3 uColor;

void main() {
  vec3 viewDir = normalize(-vViewPosition);
  float fresnel = pow(1.0 - max(0.0, dot(viewDir, normalize(vNormal))), 2.2);
  float latitude = abs(vLocalPosition.y);
  float band = 1.0 - smoothstep(0.03, 0.12, abs(fract(latitude * 4.0 - uLife * 2.2) - 0.5));
  float cap = smoothstep(-0.18, 0.28, vLocalPosition.y);
  float dissolve = 1.0 - smoothstep(0.78, 1.0, uLife);
  float alpha = (fresnel * 0.76 + band * 0.18) * cap * dissolve * uOpacity;
  vec3 color = mix(vec3(1.0, 0.92, 0.58), uColor, 0.62);
  gl_FragColor = vec4(color, alpha);
}
`

const plumeVertex = `
varying vec2 vUv;
varying vec3 vLocalPosition;

void main() {
  vUv = uv;
  vLocalPosition = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const plumeFragment = `
varying vec2 vUv;
varying vec3 vLocalPosition;
uniform float uLife;
uniform float uOpacity;
uniform vec3 uColor;

void main() {
  float verticalMask = smoothstep(-0.5, -0.16, vLocalPosition.y) * (1.0 - smoothstep(0.18, 0.54, vLocalPosition.y));
  float centerGlow = 1.0 - smoothstep(0.05, 0.48, abs(vUv.x - 0.5));
  float scan = pow(max(0.0, sin((vLocalPosition.y + 0.55) * 18.0 - uLife * 18.0)), 5.0);
  float dissolve = 1.0 - smoothstep(0.72, 1.0, uLife);
  float alpha = (verticalMask * 0.48 + centerGlow * 0.26 + scan * 0.22) * dissolve * uOpacity;
  vec3 color = mix(vec3(1.0, 0.98, 0.72), uColor, 0.42);
  gl_FragColor = vec4(color, alpha);
}
`

export function ChallengeSolveFx({
  accent,
  solved,
  triggerKey,
}: {
  accent: string
  solved: boolean
  triggerKey: string
}) {
  const root = useRef<Group>(null)
  const ringA = useRef<Mesh>(null)
  const ringB = useRef<Mesh>(null)
  const flash = useRef<Mesh>(null)
  const beam = useRef<Mesh>(null)
  const blastShell = useRef<Mesh>(null)
  const coreBurst = useRef<Mesh>(null)
  const debrisGroup = useRef<Group>(null)
  const lanceGroup = useRef<Group>(null)
  const plume = useRef<Mesh>(null)
  const shockwave = useRef<Mesh>(null)
  const particleGroup = useRef<Group>(null)
  const shardGroup = useRef<Group>(null)
  const blastShellMaterial = useRef<ShaderMaterial>(null)
  const ringAMaterial = useRef<MeshBasicMaterial>(null)
  const ringBMaterial = useRef<MeshBasicMaterial>(null)
  const flashMaterial = useRef<MeshBasicMaterial>(null)
  const beamMaterial = useRef<MeshBasicMaterial>(null)
  const coreBurstMaterial = useRef<MeshBasicMaterial>(null)
  const debrisMaterials = useRef<Array<MeshBasicMaterial | null>>([])
  const lanceMaterials = useRef<Array<MeshBasicMaterial | null>>([])
  const particleMaterial = useRef<PointsMaterial>(null)
  const plumeMaterial = useRef<ShaderMaterial>(null)
  const shardMaterial = useRef<MeshBasicMaterial>(null)
  const shockwaveMaterial = useRef<ShaderMaterial>(null)
  const age = useRef(duration + 1)
  const lastTrigger = useRef(triggerKey)
  const wasSolved = useRef(solved)
  const particleGeometry = useMemo(() => makeExplosionGeometry(), [])
  const shardGeometry = useChallengeShardGeometry()
  const shockwaveUniforms = useMemo(
    () => ({
      uColor: { value: new Color(accent) },
      uLife: { value: 1 },
      uOpacity: { value: 0 },
    }),
    [accent],
  )
  const blastShellUniforms = useMemo(
    () => ({
      uColor: { value: new Color(accent) },
      uLife: { value: 1 },
      uOpacity: { value: 0 },
    }),
    [accent],
  )
  const plumeUniforms = useMemo(
    () => ({
      uColor: { value: new Color(accent) },
      uLife: { value: 1 },
      uOpacity: { value: 0 },
    }),
    [accent],
  )

  useEffect(() => () => particleGeometry.dispose(), [particleGeometry])

  useFrame((_, delta) => {
    const hasExplicitTrigger = triggerKey.includes('solve-') || triggerKey.includes('debug-')
    if (hasExplicitTrigger && triggerKey !== lastTrigger.current) {
      lastTrigger.current = triggerKey
      age.current = 0
      if (root.current) root.current.visible = true
    }

    if (!wasSolved.current && solved) {
      age.current = 0
      if (root.current) root.current.visible = true
    }
    wasSolved.current = solved

    if (age.current > duration) {
      if (root.current) root.current.visible = false
      if (ringAMaterial.current) ringAMaterial.current.opacity = 0
      if (ringBMaterial.current) ringBMaterial.current.opacity = 0
      if (blastShellMaterial.current) blastShellMaterial.current.uniforms.uOpacity.value = 0
      if (flashMaterial.current) flashMaterial.current.opacity = 0
      if (beamMaterial.current) beamMaterial.current.opacity = 0
      if (coreBurstMaterial.current) coreBurstMaterial.current.opacity = 0
      debrisMaterials.current.forEach((material) => {
        if (material) material.opacity = 0
      })
      lanceMaterials.current.forEach((material) => {
        if (material) material.opacity = 0
      })
      if (particleMaterial.current) particleMaterial.current.opacity = 0
      if (plumeMaterial.current) plumeMaterial.current.uniforms.uOpacity.value = 0
      if (shardMaterial.current) shardMaterial.current.opacity = 0
      if (shockwaveMaterial.current) shockwaveMaterial.current.uniforms.uOpacity.value = 0
      return
    }

    age.current += delta
    const life = Math.min(age.current / duration, 1)
    const burst = easeOutExpo(life)
    const opacity = fadeOut(life)
    const hotFlash = Math.max(0, 1 - life * 5.4)
    const liftPulse = Math.sin(life * Math.PI)
    const shellLife = clamp01((life - 0.04) / 0.72)
    const shellBurst = easeOutExpo(shellLife)

    if (root.current) root.current.visible = true
    if (blastShell.current) {
      blastShell.current.position.y = 0.48 + shellBurst * 0.22
      blastShell.current.rotation.y = life * 0.54
      blastShell.current.scale.set(0.16 + shellBurst * 1.42, 0.12 + shellBurst * 1.12, 0.16 + shellBurst * 1.42)
    }
    if (coreBurst.current) {
      coreBurst.current.position.y = 0.24 + liftPulse * 0.2
      coreBurst.current.scale.setScalar(0.08 + hotFlash * 1.08 + liftPulse * 0.32)
    }
    if (plume.current) {
      plume.current.position.y = 0.62 + shellBurst * 0.34
      plume.current.scale.set(0.78 + hotFlash * 1.55, 0.96 + liftPulse * 3.05, 0.78 + hotFlash * 1.55)
    }
    if (lanceGroup.current) {
      lanceGroup.current.position.y = 0.12 + liftPulse * 0.38 + life * 0.2
      lanceGroup.current.rotation.y = life * 1.14
      lanceGroup.current.scale.setScalar(0.16 + shellBurst * 1.48)
    }
    if (debrisGroup.current) {
      debrisGroup.current.position.y = 0.34 + liftPulse * 0.72 + life * 0.42
      debrisGroup.current.rotation.y = life * 3.8
      debrisGroup.current.rotation.x = liftPulse * 0.42
      debrisGroup.current.scale.setScalar(0.26 + shellBurst * 2.15)
    }
    if (shockwave.current) {
      shockwave.current.rotation.z = life * 0.7
      shockwave.current.scale.setScalar(0.34 + burst * 2.36)
    }
    if (ringA.current) ringA.current.scale.setScalar(0.28 + burst * 3.25)
    if (ringB.current) ringB.current.scale.setScalar(0.14 + Math.max(0, burst - 0.08) * 4.35)
    if (flash.current) {
      flash.current.position.y = 0.16 + liftPulse * 0.14
      flash.current.scale.setScalar(0.1 + hotFlash * 0.78 + liftPulse * 0.2)
    }
    if (particleGroup.current) {
      particleGroup.current.scale.setScalar(0.12 + burst * 1.58)
      particleGroup.current.position.y = 0.12 + liftPulse * 0.52 + life * 0.76
      particleGroup.current.rotation.y = life * 1.35
    }
    if (shardGroup.current) {
      shardGroup.current.scale.setScalar(0.38 + burst * 1.86)
      shardGroup.current.position.y = 0.28 + liftPulse * 0.68 + life * 0.82
      shardGroup.current.rotation.y = life * 3.6
      shardGroup.current.rotation.x = liftPulse * 0.46
    }
    if (beam.current) {
      beam.current.position.y = 0.64 + life * 0.42
      beam.current.scale.set(1.12 + hotFlash * 2.6, 1.28 + liftPulse * 2.35, 1.12 + hotFlash * 2.6)
    }

    if (shockwaveMaterial.current) {
      shockwaveMaterial.current.uniforms.uLife.value = life
      shockwaveMaterial.current.uniforms.uOpacity.value = opacity * 0.34 + hotFlash * 0.12
      shockwaveMaterial.current.uniforms.uColor.value.set(accent)
    }
    if (blastShellMaterial.current) {
      blastShellMaterial.current.uniforms.uLife.value = life
      blastShellMaterial.current.uniforms.uOpacity.value = opacity * 0.38 + hotFlash * 0.12
      blastShellMaterial.current.uniforms.uColor.value.set(accent)
    }
    if (ringAMaterial.current) ringAMaterial.current.opacity = opacity * 0.92
    if (ringBMaterial.current) ringBMaterial.current.opacity = Math.max(0, 1 - Math.max(0, life - 0.08) / 0.92) * 0.54
    if (flashMaterial.current) flashMaterial.current.opacity = hotFlash * 0.86
    if (beamMaterial.current) beamMaterial.current.opacity = Math.max(0, 1 - life * 1.18) * 0.78 + hotFlash * 0.42
    if (coreBurstMaterial.current) coreBurstMaterial.current.opacity = hotFlash * 0.82 + liftPulse * opacity * 0.28
    debrisMaterials.current.forEach((material, index) => {
      if (!material) return
      const stagger = 0.78 + (index % 4) * 0.07
      material.opacity = Math.min(0.95, opacity * 0.96 * stagger + hotFlash * 0.38)
    })
    lanceMaterials.current.forEach((material, index) => {
      if (!material) return
      const stagger = 0.84 + (index % 5) * 0.05
      material.opacity = (opacity * 0.95 + hotFlash * 0.34) * stagger
    })
    if (particleMaterial.current) {
      particleMaterial.current.opacity = opacity * 1.18
      particleMaterial.current.size = 0.045 + liftPulse * 0.05 + life * 0.035
    }
    if (plumeMaterial.current) {
      plumeMaterial.current.uniforms.uLife.value = life
      plumeMaterial.current.uniforms.uOpacity.value = Math.max(0, 1 - life * 1.18) * 1.25 + hotFlash * 0.46
      plumeMaterial.current.uniforms.uColor.value.set(accent)
    }
    if (shardMaterial.current) shardMaterial.current.opacity = opacity * 1.02 + hotFlash * 0.42
  })

  return (
    <group ref={root} visible={false} raycast={() => undefined}>
      <mesh ref={blastShell} position={[0, 0.46, 0]} renderOrder={33}>
        <sphereGeometry args={[1, 32, 18]} />
        <shaderMaterial
          ref={blastShellMaterial}
          vertexShader={blastShellVertex}
          fragmentShader={blastShellFragment}
          uniforms={blastShellUniforms}
          transparent
          depthWrite={false}
          depthTest={false}
          blending={AdditiveBlending}
          toneMapped={false}
          side={DoubleSide}
        />
      </mesh>
      <mesh ref={shockwave} position={[0, 0.014, 0]} rotation={[Math.PI / 2, 0, 0]} renderOrder={33}>
        <planeGeometry args={[1.15, 1.15, 1, 1]} />
        <shaderMaterial
          ref={shockwaveMaterial}
          vertexShader={shockwaveVertex}
          fragmentShader={shockwaveFragment}
          uniforms={shockwaveUniforms}
          transparent
          depthWrite={false}
          depthTest={false}
          blending={AdditiveBlending}
          toneMapped={false}
          side={DoubleSide}
        />
      </mesh>
      <mesh ref={ringA} position={[0, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]} renderOrder={34}>
        <ringGeometry args={[0.12, 0.158, 96]} />
        <meshBasicMaterial ref={ringAMaterial} color={accent} transparent opacity={0} blending={AdditiveBlending} depthWrite={false} depthTest={false} toneMapped={false} />
      </mesh>
      <mesh ref={ringB} position={[0, 0.022, 0]} rotation={[Math.PI / 2, 0, 0]} renderOrder={35}>
        <ringGeometry args={[0.19, 0.232, 96]} />
        <meshBasicMaterial ref={ringBMaterial} color="#fff1a8" transparent opacity={0} blending={AdditiveBlending} depthWrite={false} depthTest={false} toneMapped={false} />
      </mesh>
      <group ref={lanceGroup}>
        {blastLances.map((lance, index) => (
          <group
            key={`blast-lance-${index}`}
            position={[Math.cos(lance.angle) * lance.radius, lance.lift, Math.sin(lance.angle) * lance.radius]}
            rotation={[0.78 + lance.roll, 0, -lance.angle + Math.PI / 2]}
          >
            <mesh position={[0, lance.length * 0.5, 0]} scale={[0.045, lance.length, 0.045]} renderOrder={42}>
              <coneGeometry args={[1, 1, 5, 1, true]} />
              <meshBasicMaterial
                ref={(material) => {
                  lanceMaterials.current[index] = material
                }}
                color={index % 3 === 0 ? '#fff4b8' : accent}
                transparent
                opacity={0}
                blending={AdditiveBlending}
                depthWrite={false}
                depthTest={false}
                toneMapped={false}
                side={DoubleSide}
              />
            </mesh>
          </group>
        ))}
      </group>
      <mesh ref={beam} position={[0, 0.5, 0]} renderOrder={36}>
        <cylinderGeometry args={[0.018, 0.13, 1.42, 24, 1, true]} />
        <meshBasicMaterial ref={beamMaterial} color="#f8fcff" transparent opacity={0} blending={AdditiveBlending} depthWrite={false} depthTest={false} toneMapped={false} side={DoubleSide} />
      </mesh>
      <mesh ref={plume} position={[0, 0.58, 0]} renderOrder={43}>
        <coneGeometry args={[0.32, 1.5, 28, 1, true]} />
        <shaderMaterial
          ref={plumeMaterial}
          vertexShader={plumeVertex}
          fragmentShader={plumeFragment}
          uniforms={plumeUniforms}
          transparent
          depthWrite={false}
          depthTest={false}
          blending={AdditiveBlending}
          toneMapped={false}
          side={DoubleSide}
        />
      </mesh>
      <mesh ref={coreBurst} position={[0, 0.24, 0]} renderOrder={37}>
        <sphereGeometry args={[0.28, 22, 14]} />
        <meshBasicMaterial ref={coreBurstMaterial} color="#fff9d6" transparent opacity={0} blending={AdditiveBlending} depthWrite={false} depthTest={false} toneMapped={false} />
      </mesh>
      <mesh ref={flash} position={[0, 0.18, 0]} renderOrder={37}>
        <sphereGeometry args={[0.18, 18, 10]} />
        <meshBasicMaterial ref={flashMaterial} color={accent} transparent opacity={0} blending={AdditiveBlending} depthWrite={false} depthTest={false} toneMapped={false} />
      </mesh>
      <group ref={debrisGroup}>
        {debrisPieces.map((piece, index) => (
          <mesh
            key={`blast-debris-${index}`}
            position={[Math.cos(piece.angle) * piece.radius, piece.lift, Math.sin(piece.angle) * piece.radius]}
            rotation={piece.rotation}
            scale={piece.scale}
            renderOrder={44}
          >
            <octahedronGeometry args={[1, 0]} />
            <meshBasicMaterial
              ref={(material) => {
                debrisMaterials.current[index] = material
              }}
              color={index % 3 === 0 ? '#ffffff' : index % 3 === 1 ? '#fff1a8' : accent}
              transparent
              opacity={0}
              depthWrite={false}
              depthTest={false}
              toneMapped={false}
            />
          </mesh>
        ))}
      </group>
      <group ref={particleGroup}>
        <points geometry={particleGeometry} renderOrder={38}>
          <pointsMaterial ref={particleMaterial} color="#fff1a8" transparent opacity={0} size={0.036} blending={AdditiveBlending} depthWrite={false} depthTest={false} toneMapped={false} />
        </points>
      </group>
      {shardGeometry && (
        <group ref={shardGroup}>
          <mesh geometry={shardGeometry} renderOrder={39}>
            <meshBasicMaterial
              ref={shardMaterial}
              color="#fff1a8"
              transparent
              opacity={0}
              blending={AdditiveBlending}
              depthWrite={false}
              depthTest={false}
              toneMapped={false}
              side={DoubleSide}
            />
          </mesh>
        </group>
      )}
    </group>
  )
}
