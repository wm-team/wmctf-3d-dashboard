import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { PointLight } from 'three'

export function ChallengeSceneLighting() {
  const cyanSweep = useRef<PointLight>(null)
  const goldSweep = useRef<PointLight>(null)

  useFrame((state) => {
    const elapsed = state.clock.elapsedTime
    if (cyanSweep.current) {
      cyanSweep.current.position.set(Math.sin(elapsed * 0.23) * 4.2, 3.7, 2.8 + Math.cos(elapsed * 0.18) * 1.1)
      cyanSweep.current.intensity = 1.4 + Math.sin(elapsed * 0.7) * 0.18
    }
    if (goldSweep.current) {
      goldSweep.current.position.set(Math.cos(elapsed * 0.19) * -3.8, 2.6, -2.2 + Math.sin(elapsed * 0.21) * 0.9)
      goldSweep.current.intensity = 1.05 + Math.cos(elapsed * 0.62) * 0.16
    }
  })

  return (
    <>
      <hemisphereLight args={['#9bddff', '#05090c', 0.28]} />
      <ambientLight intensity={0.16} />
      <directionalLight position={[2.6, 6.4, 3.2]} intensity={0.78} color="#dff9ff" />
      <pointLight ref={cyanSweep} position={[4.2, 3.7, 2.8]} intensity={1.4} color="#69f6ff" distance={12} decay={1.55} />
      <pointLight ref={goldSweep} position={[-3.8, 2.6, -2.2]} intensity={1.05} color="#ffd21f" distance={10} decay={1.7} />
      <pointLight position={[0, 1.1, 0]} intensity={1.25} color="#fff4a6" distance={6.8} decay={1.45} />
    </>
  )
}
