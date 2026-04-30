import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { DirectionalLight, PointLight } from 'three'
import { realtimeVisualConfig } from './realtimeVisualConfig'

export function RealtimeSceneLighting() {
  const cyanSweep = useRef<PointLight>(null)
  const goldSweep = useRef<PointLight>(null)
  const keyLight = useRef<DirectionalLight>(null)

  useFrame((state) => {
    const elapsed = state.clock.elapsedTime
    const { lighting } = realtimeVisualConfig

    if (cyanSweep.current) {
      cyanSweep.current.position.set(
        Math.sin(elapsed * 0.19) * 5.2,
        4.1 + Math.sin(elapsed * 0.37) * 0.18,
        2.45 + Math.cos(elapsed * 0.16) * 1.25,
      )
      cyanSweep.current.intensity = lighting.cyanSweepIntensity + Math.sin(elapsed * 0.74) * 0.16
    }

    if (goldSweep.current) {
      goldSweep.current.position.set(
        Math.cos(elapsed * 0.17) * -4.7,
        2.8 + Math.cos(elapsed * 0.31) * 0.16,
        -2.35 + Math.sin(elapsed * 0.2) * 1.05,
      )
      goldSweep.current.intensity = lighting.goldSweepIntensity + Math.cos(elapsed * 0.68) * 0.14
    }

    if (keyLight.current) {
      keyLight.current.position.x = 2.2 + Math.sin(elapsed * 0.11) * 0.32
      keyLight.current.position.z = 3.2 + Math.cos(elapsed * 0.1) * 0.24
    }
  })

  return (
    <>
      <hemisphereLight args={['#9bddff', '#05090c', realtimeVisualConfig.lighting.hemisphereIntensity]} />
      <ambientLight intensity={realtimeVisualConfig.lighting.ambientIntensity} />
      <directionalLight
        ref={keyLight}
        color="#dff9ff"
        intensity={realtimeVisualConfig.lighting.keyLightIntensity}
        position={[2.4, 6.1, 3.2]}
      />
      <pointLight
        ref={cyanSweep}
        color="#69f6ff"
        decay={1.55}
        distance={13}
        intensity={realtimeVisualConfig.lighting.cyanSweepIntensity}
        position={[5.2, 4.1, 2.45]}
      />
      <pointLight
        ref={goldSweep}
        color="#ffd21f"
        decay={1.7}
        distance={11}
        intensity={realtimeVisualConfig.lighting.goldSweepIntensity}
        position={[-4.7, 2.8, -2.35]}
      />
      <pointLight
        color="#fff4a6"
        decay={1.42}
        distance={7.2}
        intensity={realtimeVisualConfig.lighting.centerGlowIntensity}
        position={[0, 1.08, 0]}
      />
    </>
  )
}
