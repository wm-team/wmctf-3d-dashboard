import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  CatmullRomCurve3,
  MeshBasicMaterial,
  TubeGeometry,
  Vector3,
  type Mesh,
} from 'three'
import { getChallengePosition } from './challengeData'
import type { Challenge } from './challengeTypes'
import { challengeVisualConfig } from './challengeVisualConfig'

export function ChallengeFocusTrace({
  challenge,
  challenges,
}: {
  challenge: Challenge | null
  challenges: Challenge[]
}) {
  const trace = useRef<Mesh>(null)
  const material = useRef<MeshBasicMaterial>(null)
  const geometry = useMemo(() => {
    if (!challenge) return null
    const [x, y, z] = getChallengePosition(challenge, challenges)
    const lift = challengeVisualConfig.focus.nodeLift
    const curve = new CatmullRomCurve3([
      new Vector3(0, 0.18, 0),
      new Vector3(x * 0.42, Math.max(0.3, y + lift + 0.34), z * 0.42),
      new Vector3(x, y + lift + 0.1, z),
    ])
    return new TubeGeometry(curve, 64, 0.01, 5, false)
  }, [challenge, challenges])

  useEffect(
    () => () => {
      geometry?.dispose()
    },
    [geometry],
  )

  useFrame((state) => {
    if (!trace.current || !material.current) return
    const elapsed = state.clock.elapsedTime
    trace.current.scale.setScalar(1 + Math.sin(elapsed * 2.1) * 0.018)
    material.current.opacity = 0.18 + (Math.sin(elapsed * 3.4) * 0.5 + 0.5) * 0.34
  })

  if (!geometry) return null

  return (
    <mesh ref={trace} geometry={geometry} renderOrder={31} raycast={() => undefined}>
      <meshBasicMaterial
        ref={material}
        color="#fff1a8"
        transparent
        opacity={0.26}
        blending={AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  )
}
