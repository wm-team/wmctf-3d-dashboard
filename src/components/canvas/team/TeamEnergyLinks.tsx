import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  CatmullRomCurve3,
  Color,
  MeshBasicMaterial,
  ShaderMaterial,
  TubeGeometry,
  Vector3,
  type Mesh,
} from 'three'
import type { TeamDemoEvent } from './teamDemo'
import { clamp01, eventKey, eventPalette, segment, smootherstep } from './teamEventVisuals'
import { getChallengeSeatAnchor, getRankSlot } from './teamRankLayout'

const trailVertexShader = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const trailFragmentShader = `
  varying vec2 vUv;
  uniform float uOpacity;
  uniform float uProgress;
  uniform float uTime;
  uniform vec3 uCore;
  uniform vec3 uEnd;
  uniform vec3 uPulse;
  uniform vec3 uStart;

  void main() {
    float head = 1.0 - smoothstep(0.0, 0.065, abs(vUv.x - uProgress));
    float tailStart = smoothstep(uProgress - 0.54, uProgress - 0.18, vUv.x);
    float tailEnd = 1.0 - smoothstep(uProgress - 0.02, uProgress + 0.08, vUv.x);
    float tail = tailStart * tailEnd;
    float scan = pow(max(0.0, sin((vUv.x * 32.0) - uTime * 10.0)), 7.0) * tail;
    float edge = smoothstep(0.42, 0.02, abs(vUv.y - 0.5));
    float alpha = (head * 0.92 + tail * 0.36 + scan * 0.28) * edge * uOpacity;
    vec3 color = mix(uStart, uEnd, clamp(vUv.x, 0.0, 1.0));
    color = mix(color, uCore, head * 0.72);
    color += uPulse * scan * 0.42;
    gl_FragColor = vec4(color, alpha);
  }
`

function makeEventCurve(event: TeamDemoEvent) {
  const [sx, sy, sz] = getChallengeSeatAnchor(event.category, event.challenge)
  const target = getRankSlot(event.targetRank).position
  const start = new Vector3(sx, sy + 0.16, sz)
  const end = new Vector3(target[0], target[1] + 0.54, target[2])
  const mid = start.clone().lerp(end, 0.52)
  const tangent = new Vector3(-(end.z - start.z), 0, end.x - start.x)
  if (tangent.lengthSq() > 0.0001) tangent.normalize()
  mid.add(tangent.multiplyScalar(event.rankDelta && event.rankDelta > 0 ? 0.34 : 0.18))
  mid.y += event.eventTone === 'firstBlood' ? 1.16 : event.eventTone === 'highValue' ? 0.98 : 0.78
  return new CatmullRomCurve3([start, mid, end])
}

function TeamEnergyLink({
  event,
}: {
  event: TeamDemoEvent
}) {
  const mesh = useRef<Mesh>(null)
  const preview = useRef<Mesh>(null)
  const material = useRef<ShaderMaterial>(null)
  const head = useRef<Mesh>(null)
  const headMaterial = useRef<MeshBasicMaterial>(null)
  const age = useRef(3)
  const currentEventKey = eventKey(event)
  const trail = useMemo(() => {
    const curve = makeEventCurve(event)
    return {
      curve,
      geometry: new TubeGeometry(curve, 128, event.eventTone === 'firstBlood' ? 0.024 : 0.017, 8, false),
      palette: eventPalette(event),
    }
  }, [event])

  useEffect(() => {
    age.current = 0
  }, [currentEventKey, event])

  useEffect(
    () => () => {
      trail?.geometry.dispose()
    },
    [trail],
  )

  useFrame((state, delta) => {
    age.current += delta
    if (!trail || !mesh.current || !material.current) return
    const progress = clamp01(age.current / 1.46)
    const eased = smootherstep(progress)
    const flyIn = Math.sin(progress * Math.PI)
    const fadeOut = 1 - segment(progress, 0.72, 1)
    mesh.current.scale.setScalar(0.98 + flyIn * 0.04)
    material.current.uniforms.uTime.value = state.clock.elapsedTime
    material.current.uniforms.uProgress.value = eased
    material.current.uniforms.uOpacity.value = (event.eventTone === 'firstBlood' ? 0.98 : 0.78) * fadeOut

    if (preview.current) {
      const previewMaterial = preview.current.material as MeshBasicMaterial
      previewMaterial.opacity = Math.max(0, 1 - age.current / 0.34) * (event.eventTone === 'firstBlood' ? 0.48 : 0.3)
    }
    if (head.current && headMaterial.current) {
      head.current.position.copy(trail.curve.getPointAt(eased))
      head.current.scale.setScalar(0.08 + flyIn * (event.eventTone === 'firstBlood' ? 0.08 : 0.052))
      headMaterial.current.opacity = fadeOut
    }
  })

  if (!trail) return null

  const uniforms = {
    uCore: { value: new Color(trail.palette.core) },
    uEnd: { value: new Color(trail.palette.end) },
    uOpacity: { value: 0 },
    uProgress: { value: 0 },
    uPulse: { value: new Color(trail.palette.pulse) },
    uStart: { value: new Color(trail.palette.start) },
    uTime: { value: 0 },
  }

  return (
    <group raycast={() => undefined}>
      <mesh ref={preview} geometry={trail.geometry} renderOrder={33}>
        <meshBasicMaterial color={trail.palette.border} transparent opacity={0} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh ref={mesh} geometry={trail.geometry} renderOrder={34}>
        <shaderMaterial
          ref={material}
          blending={AdditiveBlending}
          depthWrite={false}
          fragmentShader={trailFragmentShader}
          transparent
          uniforms={uniforms}
          vertexShader={trailVertexShader}
        />
      </mesh>
      <mesh ref={head} renderOrder={35}>
        <sphereGeometry args={[1, 18, 10]} />
        <meshBasicMaterial ref={headMaterial} color={trail.palette.core} transparent opacity={0} blending={AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  )
}

export function TeamEnergyLinks({
  events,
}: {
  events: TeamDemoEvent[]
}) {
  return (
    <group raycast={() => undefined}>
      {events.map((event) => (
        <TeamEnergyLink key={eventKey(event)} event={event} />
      ))}
    </group>
  )
}
