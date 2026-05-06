import { useEffect, useMemo, useRef, useState } from 'react'
import { Billboard, Text, useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  Box3,
  BoxGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  MathUtils,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  PointsMaterial,
  RingGeometry,
  ShaderMaterial,
  TorusGeometry,
  Vector3,
  type Group,
  type Mesh,
  type Object3D,
} from 'three'
import { COLORS } from '../core/coreSceneConfig'
import { getCategoryMeta, getChallengePosition } from './challengeData'
import { ChallengeDataShards } from './ChallengeModelSet'
import { ChallengeNodeBillboard } from './ChallengeNodeBillboard'
import { ChallengeSolveFx } from './ChallengeSolveFx'
import type { Challenge, ChallengeCategory, ChallengeStatus } from './challengeTypes'
import { challengeVisualConfig } from './challengeVisualConfig'

function statusColor(status: ChallengeStatus, accent: string) {
  if (status === 'locked') return '#42525a'
  return accent
}

function setDynamicOpacity(mesh: Mesh | null, opacity: number) {
  if (!mesh) return
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
  materials.forEach((material) => {
    if (material instanceof MeshBasicMaterial || material instanceof MeshStandardMaterial || material instanceof ShaderMaterial) {
      material.userData.dynamicOpacity = opacity
    }
  })
}

function applyOpacity(group: Group, opacity: number) {
  group.traverse((object) => {
    const mesh = object as Mesh
    if (!mesh.material) return
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    materials.forEach((material) => {
      if (
        !(material instanceof MeshBasicMaterial) &&
        !(material instanceof MeshStandardMaterial) &&
        !(material instanceof ShaderMaterial) &&
        !(material instanceof PointsMaterial)
      ) return
      const base =
        typeof material.userData.dynamicOpacity === 'number'
          ? material.userData.dynamicOpacity
          : typeof material.userData.baseOpacity === 'number'
            ? material.userData.baseOpacity
            : material.opacity
      if (typeof material.userData.dynamicOpacity !== 'number') material.userData.baseOpacity = base
      if (material instanceof ShaderMaterial && material.uniforms.uOpacity) {
        material.uniforms.uOpacity.value = Math.min(1, base * opacity)
      } else {
        material.opacity = Math.min(1, base * opacity)
      }
    })
  })
}

type ChallengeNodeGeometrySet = {
  baseDisc: CylinderGeometry
  baseTick: BoxGeometry
  beamPlane: PlaneGeometry
  beamShell: CylinderGeometry
  categoryRim: TorusGeometry
  coreLine: CylinderGeometry
  difficultyHalo: TorusGeometry
  floorHalo: RingGeometry
  hitTarget: CylinderGeometry
  pedestalDisc: CylinderGeometry
  scanBand: TorusGeometry
  statusArc: TorusGeometry
  statusRing: TorusGeometry
  lockedSeal: TorusGeometry
  pulseRing: RingGeometry
}

type GltfScene = {
  scene: Group
}

type StatusCrownVariant = ChallengeStatus | 'firstBlood'

const statusVisual = {
  hot: { color: COLORS.yellow, glyph: 'HOT' },
  locked: { color: '#8b9aa2', glyph: 'LOCK' },
  solved: { color: '#36ff8c', glyph: 'OK' },
  unsolved: { color: '#ff7a45', glyph: 'OPEN' },
} as const

const statusShaderIndex: Record<ChallengeStatus, number> = {
  hot: 1,
  locked: 3,
  solved: 0,
  unsolved: 2,
}

const difficultyBaseSegmentCount = [1, 2, 4, 8]

const statusCrownNodeNames: Record<StatusCrownVariant, string> = {
  firstBlood: 'StatusCrownFirstBlood',
  hot: 'StatusCrownHot',
  locked: 'StatusCrownLocked',
  solved: 'StatusCrownSolved',
  unsolved: 'StatusCrownUnsolved',
}

const baseGlowVertex = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const baseGlowFragment = `
varying vec2 vUv;
uniform float uTime;
uniform float uDifficulty;
uniform float uOpacity;
uniform vec3 uColor;

void main() {
  vec2 p = (vUv - 0.5) * 2.0;
  float r = length(p);
  float a = atan(p.y, p.x);
  float core = pow(max(0.0, 1.0 - r), 2.0);
  float ring = 1.0 - smoothstep(0.025, 0.06, abs(r - (0.42 + uDifficulty * 0.045)));
  float ticks = pow(max(0.0, cos(a * (6.0 + uDifficulty * 2.0) + uTime * (0.55 + uDifficulty * 0.11))), 18.0) * smoothstep(0.24, 0.82, r);
  float alpha = (core * 0.28 + ring * 0.54 + ticks * 0.34) * (1.0 - smoothstep(0.84, 1.0, r)) * uOpacity;
  gl_FragColor = vec4(uColor, alpha);
}
`

const dataBeamVertex = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const dataBeamFragment = `
varying vec2 vUv;
uniform float uDifficulty;
uniform float uOpacity;
uniform float uStatus;
uniform float uTime;
uniform vec3 uColor;

void main() {
  float vertical = clamp(vUv.y, 0.0, 1.0);
  float radial = abs(vUv.x - 0.5) * 2.0;
  float edgeFade = 1.0 - smoothstep(0.74, 1.0, radial);
  float liftSpeed = mix(0.38, 1.18, step(0.5, uStatus)) + uDifficulty * 0.09;
  float packet = smoothstep(0.92, 1.0, fract(vertical * (4.0 + uDifficulty) - uTime * liftSpeed + uStatus * 0.17));
  float lane = pow(max(0.0, cos((vUv.x - 0.5) * 18.0 + uTime * 0.7)), 10.0);
  float scan = smoothstep(0.0, 0.09, 1.0 - abs(fract(vertical * 2.6 - uTime * 0.16) - 0.5) * 2.0);
  float hotSpark = step(0.5, uStatus) * (1.0 - step(1.5, uStatus)) * pow(max(0.0, sin(vertical * 46.0 - uTime * 9.5)), 16.0);
  float lockedGrid = step(2.5, uStatus) * (step(0.83, abs(sin(vertical * 32.0))) + step(0.9, abs(cos(vUv.x * 28.0))));
  float solvedStability = 1.0 - step(0.5, uStatus);
  float unsolvedScan = step(1.5, uStatus) * (1.0 - step(2.5, uStatus)) * scan;
  float body = 0.18 + lane * 0.18 + packet * (0.42 + uDifficulty * 0.08) + hotSpark * 0.42 + solvedStability * 0.16 + unsolvedScan * 0.28;
  body *= 1.0 - lockedGrid * 0.52;
  float alpha = body * edgeFade * smoothstep(0.0, 0.13, vertical) * (1.0 - smoothstep(0.92, 1.0, vertical)) * uOpacity;
  vec3 color = mix(uColor * 0.45, uColor, packet + hotSpark + solvedStability * 0.28);
  color = mix(color, vec3(0.48, 0.58, 0.62), lockedGrid * 0.42);
  gl_FragColor = vec4(color, alpha);
}
`

function ChallengeStatusCrownModel({
  position = [0, 0, 0],
  scale = 1,
  variant,
}: {
  position?: [number, number, number]
  scale?: number
  variant: StatusCrownVariant
}) {
  const wrapper = useRef<Group>(null)
  const gltf = useGLTF(challengeVisualConfig.assets.statusCrowns) as GltfScene
  const rotationSpeed = variant === 'hot' ? 1.05 : variant === 'locked' ? 0.14 : variant === 'firstBlood' ? 0.9 : 0.42
  const model = useMemo<Object3D | null>(() => {
    const source = gltf.scene.getObjectByName(statusCrownNodeNames[variant])
    if (!source) return null

    const clone = source.clone(true)
    clone.traverse((object) => {
      const mesh = object as Mesh
      if (!mesh.isMesh || !mesh.material) return

      mesh.raycast = () => undefined
      mesh.renderOrder = variant === 'firstBlood' ? 26 : 24
      const materials = Array.isArray(mesh.material) ? mesh.material.map((material) => material.clone()) : [mesh.material.clone()]
      materials.forEach((material) => {
        if (
          material instanceof MeshBasicMaterial ||
          material instanceof MeshStandardMaterial ||
          material instanceof ShaderMaterial
        ) {
          material.transparent = true
          material.depthWrite = false
          material.blending = AdditiveBlending
        }
      })
      mesh.material = Array.isArray(mesh.material) ? materials : materials[0]
    })

    const bounds = new Box3().setFromObject(clone)
    if (!bounds.isEmpty()) {
      const center = bounds.getCenter(new Vector3())
      clone.position.x -= center.x
      clone.position.y -= bounds.min.y
      clone.position.z -= center.z
    }

    return clone
  }, [gltf.scene, variant])

  useFrame((state) => {
    if (!wrapper.current) return
    wrapper.current.rotation.y = state.clock.elapsedTime * rotationSpeed
  })

  if (!model) return null

  return (
    <group ref={wrapper} position={position} scale={scale} raycast={() => undefined}>
      <primitive object={model} />
    </group>
  )
}

function ChallengeBeaconLabel({
  categoryAccent,
  categoryLabel,
  challenge,
  dimmed,
  focused,
  height,
  statusColor,
  statusGlyph,
}: {
  categoryAccent: string
  categoryLabel: string
  challenge: Challenge
  dimmed: boolean
  focused: boolean
  height: number
  statusColor: string
  statusGlyph: string
}) {
  const titleColor = dimmed ? '#7f929a' : '#f4fbff'
  const infoColor = dimmed ? '#5e737c' : categoryAccent
  const titleSize = focused ? 0.084 : 0.062
  const infoSize = focused ? 0.046 : 0.038
  const statusSize = focused ? 0.04 : 0.032
  const labelY = height + (focused ? 0.38 : 0.3)

  return (
    <Billboard follow position={[0, labelY, 0]} raycast={() => undefined}>
      <Text
        anchorX="center"
        anchorY="middle"
        color={titleColor}
        fontSize={titleSize}
        fontWeight={900}
        maxWidth={0.78}
        outlineColor="#05090c"
        outlineWidth={0.0045}
        renderOrder={44}
        textAlign="center"
        raycast={() => undefined}
      >
        {challenge.title}
      </Text>
      <Text
        anchorX="center"
        anchorY="middle"
        color={infoColor}
        fontSize={infoSize}
        fontWeight={900}
        maxWidth={0.86}
        outlineColor="#05090c"
        outlineWidth={0.0035}
        position={[0, -0.078, 0]}
        renderOrder={44}
        textAlign="center"
        raycast={() => undefined}
      >
        {`${categoryLabel.toUpperCase()} / ${challenge.difficulty.toUpperCase()} / ${challenge.solvedCount} SOLVES`}
      </Text>
      <Text
        anchorX="center"
        anchorY="middle"
        color={dimmed ? '#7f929a' : statusColor}
        fontSize={statusSize}
        fontWeight={900}
        outlineColor="#05090c"
        outlineWidth={0.003}
        position={[0, -0.136, 0]}
        renderOrder={44}
        textAlign="center"
        raycast={() => undefined}
      >
        {statusGlyph}
      </Text>
    </Billboard>
  )
}

function ChallengeBeaconNode({
  activeCategory,
  challenge,
  cinematicFocused,
  focusDimmed,
  forceSolveFxChallengeId,
  forceSolveFxNonce,
  focused,
  geometries,
  onHover,
  onSelectChallenge,
  position,
  selected,
}: {
  activeCategory: ChallengeCategory | null
  challenge: Challenge
  cinematicFocused: boolean
  focusDimmed: boolean
  forceSolveFxChallengeId: string | null
  forceSolveFxNonce: number
  focused: boolean
  geometries: ChallengeNodeGeometrySet
  onHover: (challenge: Challenge | null) => void
  onSelectChallenge: (challenge: Challenge) => void
  position: readonly [number, number, number]
  selected: boolean
}) {
  const group = useRef<Group>(null)
  const beam = useRef<Group>(null)
  const baseDisc = useRef<Mesh>(null)
  const beamShell = useRef<Mesh>(null)
  const beamShellMaterial = useRef<ShaderMaterial>(null)
  const beamPlaneMaterials = useRef<Array<ShaderMaterial | null>>([])
  const categoryRim = useRef<Mesh>(null)
  const coreLine = useRef<Mesh>(null)
  const difficultyBands = useRef<Array<Mesh | null>>([])
  const difficultyHalo = useRef<Mesh>(null)
  const floorHalo = useRef<Mesh>(null)
  const pedestalDisc = useRef<Mesh>(null)
  const baseGlow = useRef<Mesh>(null)
  const baseGlowMaterial = useRef<ShaderMaterial>(null)
  const baseTicks = useRef<Array<Mesh | null>>([])
  const statusCrown = useRef<Group>(null)
  const pulseRing = useRef<Mesh>(null)
  const scanBand = useRef<Mesh>(null)
  const meta = getCategoryMeta(challenge.category)
  const locked = challenge.status === 'locked'
  const hot = challenge.status === 'hot'
  const firstBlood = Boolean(challenge.bloods?.first || challenge.firstBloodTeam)
  const color = statusColor(challenge.status, meta.accent)
  const beamColor = locked ? '#73848c' : meta.accent
  const statusMeta = statusVisual[challenge.status]
  const dimmed = Boolean(activeCategory && activeCategory !== challenge.category)
  const height = challenge.difficulty === 'expert' ? 1.08 : challenge.difficulty === 'hard' ? 0.94 : challenge.difficulty === 'medium' ? 0.8 : 0.68
  const difficultyRank = challenge.difficulty === 'expert' ? 3 : challenge.difficulty === 'hard' ? 2 : challenge.difficulty === 'medium' ? 1 : 0
  const beamProfile = challengeVisualConfig.beam.status[challenge.status]
  const baseRadius = challengeVisualConfig.beam.baseRadiusByDifficulty[difficultyRank] ?? 0.86
  const baseSegmentCount = difficultyBaseSegmentCount[difficultyRank] ?? 1
  const debugTriggerKey = forceSolveFxChallengeId === challenge.id && forceSolveFxNonce > 0 ? `debug-${forceSolveFxNonce}` : 'none'
  const solvedTriggerKey = challenge.recentSolvedAt ? `solve-${challenge.recentSolvedAt}` : 'idle'
  const baseGlowUniforms = useMemo(
    () => ({
      uDifficulty: { value: difficultyRank },
      uTime: { value: 0 },
      uOpacity: { value: 0.16 },
      uColor: { value: new Color(color) },
    }),
    [color, difficultyRank],
  )
  const dataBeamUniforms = useMemo(
    () => ({
      uDifficulty: { value: difficultyRank },
      uOpacity: { value: Number(beamProfile.shellOpacity) },
      uStatus: { value: statusShaderIndex[challenge.status] },
      uTime: { value: 0 },
      uColor: { value: new Color(beamColor) },
    }),
    [beamColor, beamProfile.shellOpacity, challenge.status, difficultyRank],
  )

  useFrame((state) => {
    if (!group.current) return
    const t = state.clock.elapsedTime
    const pulse = Math.sin(t * (hot ? challengeVisualConfig.node.hotPulseSpeed : 1.7) + position[0]) * 0.5 + 0.5
    const focusBoost = selected || focused ? 1 : 0
    const cinematicBoost = cinematicFocused ? 1 : 0
    const statusBoost = challenge.status === 'solved' ? 0.22 : hot ? 0.48 + pulse * 0.32 : locked ? -0.08 : 0
    const opacity = locked ? 0.34 : focusDimmed ? challengeVisualConfig.focus.nodeDimOpacity : dimmed ? 0.16 : 1
    const targetY = position[1] + cinematicBoost * challengeVisualConfig.focus.nodeLift + (selected || focused ? 0.035 : 0)
    const targetScale =
      (cinematicFocused ? challengeVisualConfig.focus.nodeScale : selected || focused ? challengeVisualConfig.node.focusedScale : 1) *
      (locked ? challengeVisualConfig.node.lockedScale : 1)
    group.current.position.y = MathUtils.lerp(group.current.position.y, targetY, 0.12)
    group.current.scale.setScalar(MathUtils.lerp(group.current.scale.x, targetScale, 0.12))
    applyOpacity(group.current, opacity)

    const dataBeamOpacity =
      Math.max(0.035, beamProfile.shellOpacity + focusBoost * 0.08 + (hot ? pulse * 0.14 : 0)) * opacity
    const dataBeamMaterials = [beamShellMaterial.current, ...beamPlaneMaterials.current]
    dataBeamMaterials.forEach((material) => {
      if (!material) return
      material.uniforms.uTime.value = t
      material.uniforms.uOpacity.value = dataBeamOpacity
      material.uniforms.uDifficulty.value = difficultyRank
      material.uniforms.uStatus.value = statusShaderIndex[challenge.status]
      material.uniforms.uColor.value.set(beamColor)
    })
    setDynamicOpacity(baseDisc.current, beamProfile.baseOpacity + focusBoost * 0.08 + (hot ? pulse * 0.08 : 0))
    setDynamicOpacity(pedestalDisc.current, locked ? 0.12 : 0.24 + focusBoost * 0.08)
    if (floorHalo.current) {
      const wave = 1.08 + pulse * (hot ? 0.34 : 0.12) + focusBoost * 0.18
      floorHalo.current.scale.setScalar(baseRadius * wave)
      setDynamicOpacity(floorHalo.current, challengeVisualConfig.beam.floorHaloOpacity + beamProfile.floorWave * (hot ? pulse : 0.36))
    }
    if (categoryRim.current) {
      categoryRim.current.rotation.z = t * (0.12 + difficultyRank * 0.035)
      categoryRim.current.scale.setScalar(baseRadius * (1.02 + focusBoost * 0.08))
      setDynamicOpacity(categoryRim.current, locked ? 0.08 : 0.28 + focusBoost * 0.14 + difficultyRank * 0.025)
    }
    if (difficultyHalo.current) {
      difficultyHalo.current.rotation.z = t * (0.3 + difficultyRank * 0.08)
      difficultyHalo.current.scale.setScalar(baseRadius * (0.88 + focusBoost * 0.08 + pulse * (hot ? 0.08 : 0.025)))
      setDynamicOpacity(difficultyHalo.current, locked ? 0.035 : 0.14 + difficultyRank * 0.045 + focusBoost * 0.1 + (hot ? pulse * 0.12 : 0))
    }
    if (beam.current) {
      beam.current.position.y = height * 0.5
      beam.current.scale.x = 1 + cinematicBoost * 0.12
      beam.current.scale.y =
        0.82 +
        pulse * (hot ? 0.11 : 0.035) +
        focusBoost * 0.08 +
        cinematicBoost * (challengeVisualConfig.focus.nodeBeamStretch - 1)
      beam.current.scale.z = 1 + cinematicBoost * 0.12
      beam.current.rotation.y = t * (0.18 + focusBoost * 0.1)
    }
    if (beamShell.current) {
      beamShell.current.scale.set(challengeVisualConfig.beam.shellRadius, height, challengeVisualConfig.beam.shellRadius)
      setDynamicOpacity(beamShell.current, beamProfile.shellOpacity + focusBoost * 0.08 + (hot ? pulse * 0.1 : 0))
    }
    setDynamicOpacity(coreLine.current, Math.max(0.035, beamProfile.coreOpacity + statusBoost * 0.18 + focusBoost * 0.18))
    if (coreLine.current) {
      const lineStretch = 1 + cinematicBoost * 0.22
      coreLine.current.position.y = height * lineStretch * 0.5
      coreLine.current.scale.y = height * lineStretch
    }
    if (scanBand.current) {
      const scanTravel = (t * beamProfile.scanSpeed + position[0] * 0.07) % 1
      scanBand.current.position.y = height * (0.18 + scanTravel * 0.74)
      scanBand.current.scale.setScalar((0.15 + scanTravel * 0.025) * (1 + focusBoost * 0.1))
      setDynamicOpacity(scanBand.current, locked ? 0.02 : beamProfile.scanOpacity * (1 - scanTravel * 0.42) + focusBoost * 0.08)
    }
    difficultyBands.current.forEach((band, index) => {
      if (!band) return
      const activeBand = index <= difficultyRank
      band.position.y = height * (0.24 + index * 0.17)
      band.rotation.z = t * (0.14 + index * 0.03)
      band.scale.setScalar((0.12 + index * 0.018) * (1 + focusBoost * 0.1))
      setDynamicOpacity(
        band,
        activeBand && !locked
          ? challengeVisualConfig.beam.difficultyBandOpacity + focusBoost * 0.08 + (hot ? pulse * 0.05 : 0)
          : 0.018,
      )
    })
    if (baseGlowMaterial.current) {
      baseGlowMaterial.current.uniforms.uTime.value = t
      baseGlowMaterial.current.uniforms.uDifficulty.value = difficultyRank
      baseGlowMaterial.current.uniforms.uOpacity.value = Math.max(0.04, beamProfile.floorWave * 0.26 + statusBoost * 0.1 + focusBoost * 0.12)
    }
    if (baseGlow.current) baseGlow.current.scale.setScalar(baseRadius * (1.0 + pulse * (hot ? 0.12 : 0.035) + focusBoost * 0.16))
    baseTicks.current.forEach((tick, index) => {
      if (!tick) return
      const phase = index / Math.max(baseSegmentCount, 1)
      const activeTick = index < baseSegmentCount
      tick.position.y = 0.162 + Math.sin(t * 1.25 + phase * Math.PI * 2) * (hot ? 0.006 : 0.002)
      tick.rotation.y = (typeof tick.userData.baseAngle === 'number' ? tick.userData.baseAngle : 0) + t * (0.12 + difficultyRank * 0.035)
      setDynamicOpacity(tick, activeTick && !locked ? 0.46 + difficultyRank * 0.055 + focusBoost * 0.12 + (hot ? pulse * 0.16 : 0) : 0.045)
    })
    if (pulseRing.current) {
      const u = (t * (hot ? 0.95 : 0.42) + position[2]) % 1
      pulseRing.current.scale.setScalar(baseRadius * (0.86 + u * (hot ? 1.32 : 0.62)))
      setDynamicOpacity(pulseRing.current, (1 - u) * beamProfile.floorWave + focusBoost * 0.07)
    }
    if (statusCrown.current) {
      statusCrown.current.position.y = height + 0.12 + pulse * (hot ? 0.034 : 0.012) + cinematicBoost * 0.12
      statusCrown.current.scale.setScalar(1 + focusBoost * 0.14 + (hot ? pulse * 0.1 : 0))
    }
  })

  return (
    <group ref={group} position={position}>
      {!locked && (
        <mesh
          geometry={geometries.hitTarget}
          position={[0, (height + 0.16) * 0.5, 0]}
          scale={[baseRadius * 0.82, height + 0.16, baseRadius * 0.82]}
          renderOrder={60}
          onClick={(event) => {
            event.stopPropagation()
            onSelectChallenge(challenge)
          }}
          onPointerEnter={(event) => {
            event.stopPropagation()
            onHover(challenge)
            document.body.style.cursor = 'pointer'
          }}
          onPointerLeave={() => {
            onHover(null)
            document.body.style.cursor = 'default'
          }}
        >
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      )}
      <mesh ref={floorHalo} geometry={geometries.floorHalo} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.018, 0]} renderOrder={9} raycast={() => undefined}>
        <meshBasicMaterial color={meta.accent} transparent opacity={0.16} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh ref={pulseRing} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.024, 0]} renderOrder={10} raycast={() => undefined}>
        <primitive attach="geometry" object={geometries.pulseRing} />
        <meshBasicMaterial color={beamColor} transparent opacity={0.22} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh ref={baseDisc} geometry={geometries.baseDisc} position={[0, 0.038, 0]} scale={[baseRadius, 1, baseRadius]} renderOrder={11} raycast={() => undefined}>
        <meshStandardMaterial
          color="#071217"
          emissive={meta.accent}
          emissiveIntensity={locked ? 0.04 : hot ? 0.18 : 0.1}
          metalness={0.66}
          roughness={0.28}
          transparent
          opacity={challengeVisualConfig.node.baseOpacity}
          depthWrite={false}
        />
      </mesh>
      <mesh
        ref={pedestalDisc}
        geometry={geometries.pedestalDisc}
        position={[0, 0.078, 0]}
        scale={[baseRadius * 0.72, 1, baseRadius * 0.72]}
        renderOrder={12}
        raycast={() => undefined}
      >
        <meshStandardMaterial
          color="#08171d"
          emissive={beamColor}
          emissiveIntensity={locked ? 0.025 : 0.12}
          metalness={0.74}
          roughness={0.22}
          transparent
          opacity={0.24}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={categoryRim} geometry={geometries.categoryRim} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.083, 0]} renderOrder={13} raycast={() => undefined}>
        <meshBasicMaterial color={meta.accent} transparent opacity={0.26} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh ref={difficultyHalo} geometry={geometries.difficultyHalo} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.106, 0]} renderOrder={14} raycast={() => undefined}>
        <meshBasicMaterial color={beamColor} transparent opacity={0.16} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
      {Array.from({ length: 8 }).map((_, index) => {
        const angle = index * (Math.PI / 4) + difficultyRank * 0.08
        const radius = baseRadius * 0.34
        return (
          <mesh
            key={`difficulty-base-${index}`}
            ref={(mesh) => {
              baseTicks.current[index] = mesh
            }}
            geometry={geometries.baseTick}
            position={[Math.cos(angle) * radius, 0.162, Math.sin(angle) * radius]}
            rotation={[0, -angle + Math.PI / 2, 0]}
            scale={[0.088 + difficultyRank * 0.014, 0.018, 0.024]}
            renderOrder={15}
            raycast={() => undefined}
            userData={{ baseAngle: -angle + Math.PI / 2 }}
          >
            <meshBasicMaterial
              color={index < baseSegmentCount ? statusMeta.color : beamColor}
              transparent
              opacity={index < baseSegmentCount && !locked ? 0.42 : 0.045}
              blending={AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        )
      })}
      {challenge.status === 'solved' && (
        <mesh geometry={geometries.statusRing} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.148, 0]} scale={baseRadius * 1.02} renderOrder={15} raycast={() => undefined}>
          <meshBasicMaterial color={statusMeta.color} transparent opacity={0.72} blending={AdditiveBlending} depthWrite={false} />
        </mesh>
      )}
      {challenge.status === 'hot' && (
        <mesh geometry={geometries.statusRing} rotation={[Math.PI / 2, 0, Math.PI * 0.08]} position={[0, 0.148, 0]} scale={baseRadius * 1.08} renderOrder={15} raycast={() => undefined}>
          <meshBasicMaterial color={statusMeta.color} transparent opacity={0.86} blending={AdditiveBlending} depthWrite={false} />
        </mesh>
      )}
      {challenge.status === 'unsolved' && (
        <>
          <mesh geometry={geometries.statusArc} rotation={[Math.PI / 2, 0, Math.PI * 0.16]} position={[0, 0.148, 0]} scale={baseRadius * 1.04} renderOrder={15} raycast={() => undefined}>
            <meshBasicMaterial color={statusMeta.color} transparent opacity={0.78} blending={AdditiveBlending} depthWrite={false} />
          </mesh>
          <mesh geometry={geometries.statusArc} rotation={[Math.PI / 2, 0, Math.PI * 1.18]} position={[0, 0.154, 0]} scale={baseRadius * 0.86} renderOrder={15} raycast={() => undefined}>
            <meshBasicMaterial color={statusMeta.color} transparent opacity={0.56} blending={AdditiveBlending} depthWrite={false} />
          </mesh>
        </>
      )}
      <mesh ref={baseGlow} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} renderOrder={15} raycast={() => undefined}>
        <planeGeometry args={[0.52, 0.52]} />
        <shaderMaterial
          ref={baseGlowMaterial}
          vertexShader={baseGlowVertex}
          fragmentShader={baseGlowFragment}
          uniforms={baseGlowUniforms}
          transparent
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>
      <group ref={beam} position={[0, height * 0.5, 0]}>
        <mesh ref={beamShell} geometry={geometries.beamShell} renderOrder={16} raycast={() => undefined}>
          <shaderMaterial
            ref={beamShellMaterial}
            vertexShader={dataBeamVertex}
            fragmentShader={dataBeamFragment}
            uniforms={dataBeamUniforms}
            transparent
            blending={AdditiveBlending}
            depthWrite={false}
            side={DoubleSide}
          />
        </mesh>
        {[0, Math.PI / 2].map((rotation, index) => (
          <mesh key={rotation} rotation={[0, rotation, 0]} scale={[1, height, 1]} renderOrder={17} raycast={() => undefined}>
            <primitive attach="geometry" object={geometries.beamPlane} />
            <shaderMaterial
              ref={(material) => {
                beamPlaneMaterials.current[index] = material
              }}
              vertexShader={dataBeamVertex}
              fragmentShader={dataBeamFragment}
              uniforms={dataBeamUniforms}
              transparent
              blending={AdditiveBlending}
              depthWrite={false}
              side={DoubleSide}
            />
          </mesh>
        ))}
      </group>
      <mesh ref={coreLine} geometry={geometries.coreLine} position={[0, height * 0.5, 0]} scale={[1, height, 1]} renderOrder={18} raycast={() => undefined}>
        <meshBasicMaterial color={beamColor} transparent opacity={beamProfile.coreOpacity} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
      {[0, 1, 2, 3].map((bandIndex) => (
        <mesh
          key={`difficulty-band-${bandIndex}`}
          ref={(mesh) => {
            difficultyBands.current[bandIndex] = mesh
          }}
          geometry={geometries.scanBand}
          rotation={[Math.PI / 2, 0, 0]}
          renderOrder={19}
          raycast={() => undefined}
        >
          <meshBasicMaterial color={meta.accent} transparent opacity={0.16} blending={AdditiveBlending} depthWrite={false} />
        </mesh>
      ))}
      <mesh ref={scanBand} geometry={geometries.scanBand} rotation={[Math.PI / 2, 0, 0]} renderOrder={20} raycast={() => undefined}>
        <meshBasicMaterial color={hot ? COLORS.yellow : beamColor} transparent opacity={beamProfile.scanOpacity} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
      <group ref={statusCrown} position={[0, height + 0.12, 0]} renderOrder={24} raycast={() => undefined}>
        <ChallengeStatusCrownModel variant={challenge.status} scale={0.92} />
        {firstBlood && !locked && (
          <ChallengeStatusCrownModel
            position={[0.105, 0.18, 0.018]}
            scale={0.55}
            variant="firstBlood"
          />
        )}
      </group>
      {locked && (
        <>
          <mesh geometry={geometries.lockedSeal} rotation={[Math.PI / 2, 0, Math.PI / 4]} position={[0, height * 0.58, 0]} renderOrder={22} raycast={() => undefined}>
            <meshBasicMaterial color="#6f7d83" transparent opacity={0.14} blending={AdditiveBlending} depthWrite={false} />
          </mesh>
          <mesh geometry={geometries.lockedSeal} rotation={[Math.PI / 2, 0, -Math.PI / 4]} position={[0, height * 0.72, 0]} renderOrder={22} raycast={() => undefined}>
            <meshBasicMaterial color="#6f7d83" transparent opacity={0.1} blending={AdditiveBlending} depthWrite={false} />
          </mesh>
        </>
      )}
      <ChallengeBeaconLabel
        challenge={challenge}
        categoryAccent={meta.accent}
        categoryLabel={meta.label}
        dimmed={focusDimmed || dimmed}
        focused={focused || selected}
        height={height}
        statusColor={statusMeta.color}
        statusGlyph={statusMeta.glyph}
      />
      <group position={[0, height * 0.44 + 0.18, 0]}>
        <ChallengeDataShards
          active={hot || focused || selected || challenge.status === 'solved'}
          color={firstBlood || hot ? COLORS.yellow : meta.accent}
          opacity={locked ? 0.035 : hot ? 0.32 : focused || selected ? 0.26 : 0.14}
          scale={challengeVisualConfig.beam.midShardScale * (1 + difficultyRank * 0.08 + (cinematicFocused ? 0.16 : 0))}
        />
      </group>
      <ChallengeSolveFx
        accent={meta.accent}
        solved={challenge.status === 'solved'}
        triggerKey={`${solvedTriggerKey}:${debugTriggerKey}`}
      />
    </group>
  )
}

export function ChallengeNodes({
  activeCategory,
  challenges,
  forceSolveFxChallengeId,
  forceSolveFxNonce,
  focusedChallenge,
  onSelectChallenge,
  selectedChallenge,
}: {
  activeCategory: ChallengeCategory | null
  challenges: Challenge[]
  forceSolveFxChallengeId: string | null
  forceSolveFxNonce: number
  focusedChallenge: Challenge | null
  onSelectChallenge: (challenge: Challenge) => void
  selectedChallenge: Challenge | null
}) {
  const [hoverChallenge, setHoverChallenge] = useState<Challenge | null>(null)
  const positions = useMemo(
    () => new Map(challenges.map((challenge) => [challenge.id, getChallengePosition(challenge, challenges)])),
    [challenges],
  )
  const cinematicChallenge = selectedChallenge ?? focusedChallenge
  const detailChallenge = cinematicChallenge ?? hoverChallenge
  const detailPosition = detailChallenge ? positions.get(detailChallenge.id) : null
  const nodeGeometries = useMemo<ChallengeNodeGeometrySet>(
    () => ({
      baseDisc: new CylinderGeometry(0.24, 0.3, 0.056, 6, 1),
      baseTick: new BoxGeometry(1, 1, 1),
      beamShell: new CylinderGeometry(0.38, 0.92, 1, 14, 1, true),
      beamPlane: new PlaneGeometry(0.07, 1),
      categoryRim: new TorusGeometry(0.3, 0.007, 6, 54),
      coreLine: new CylinderGeometry(0.01, 0.014, 1, 10),
      difficultyHalo: new TorusGeometry(0.28, 0.008, 6, 52),
      floorHalo: new RingGeometry(0.18, 0.31, 72),
      hitTarget: new CylinderGeometry(0.18, 0.34, 1, 10, 1),
      lockedSeal: new TorusGeometry(0.17, 0.006, 5, 36),
      pedestalDisc: new CylinderGeometry(0.22, 0.27, 0.05, 6, 1),
      pulseRing: new RingGeometry(0.2, 0.226, 64),
      scanBand: new TorusGeometry(1, 0.018, 5, 36),
      statusArc: new TorusGeometry(0.34, 0.012, 5, 42, Math.PI * 1.28),
      statusRing: new TorusGeometry(0.34, 0.012, 5, 58),
    }),
    [],
  )
  useEffect(
    () => () => {
      Object.values(nodeGeometries).forEach((geometry) => geometry.dispose())
    },
    [nodeGeometries],
  )

  return (
    <group>
      {challenges.map((challenge) => {
        const position = positions.get(challenge.id) ?? [0, 0.18, 0]
        return (
          <ChallengeBeaconNode
            key={challenge.id}
            activeCategory={activeCategory}
            challenge={challenge}
            cinematicFocused={cinematicChallenge?.id === challenge.id}
            focusDimmed={Boolean(cinematicChallenge && cinematicChallenge.id !== challenge.id)}
            forceSolveFxChallengeId={forceSolveFxChallengeId}
            forceSolveFxNonce={forceSolveFxNonce}
            focused={cinematicChallenge?.id === challenge.id || hoverChallenge?.id === challenge.id}
            geometries={nodeGeometries}
            onHover={setHoverChallenge}
            onSelectChallenge={onSelectChallenge}
            position={position}
            selected={selectedChallenge?.id === challenge.id}
          />
        )
      })}
      {detailChallenge && detailPosition && (
        <ChallengeNodeBillboard
          key={detailChallenge.id}
          challenge={detailChallenge}
          lift={cinematicChallenge?.id === detailChallenge.id ? challengeVisualConfig.focus.nodeLift : 0}
          nodePosition={detailPosition}
          scale={
            cinematicChallenge?.id === detailChallenge.id
              ? challengeVisualConfig.focus.billboardScale * challengeVisualConfig.focus.billboardFocusedScaleMultiplier
              : challengeVisualConfig.focus.billboardScale
          }
          visible={Boolean(detailChallenge)}
        />
      )}
    </group>
  )
}

useGLTF.preload(challengeVisualConfig.assets.statusCrowns)
