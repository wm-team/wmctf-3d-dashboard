import { Canvas, useFrame } from '@react-three/fiber'
import { PerspectiveCamera, Stars } from '@react-three/drei'
import { Suspense } from 'react'
import { DataCore } from '@/components/canvas/DataCore'

function CameraParallax() {
  useFrame((state) => {
    const { camera, pointer } = state
    const targetX = pointer.x * 0.72
    const targetY = 4.15 + pointer.y * 0.22
    const targetZ = 8.85 - pointer.y * 0.16

    camera.position.x += (targetX - camera.position.x) * 0.055
    camera.position.y += (targetY - camera.position.y) * 0.055
    camera.position.z += (targetZ - camera.position.z) * 0.055
    camera.lookAt(0, 0, 0)
  })

  return null
}

export function SceneCanvas() {
  return (
    <Canvas
      className="scene-canvas"
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      dpr={[1, 2]}
      resize={{ scroll: true, offsetSize: true, debounce: { scroll: 0, resize: 0 } }}
    >
      <fog attach="fog" args={['#05090c', 12, 34]} />
      <PerspectiveCamera makeDefault position={[0, 4.15, 8.85]} fov={42} />
      <ambientLight intensity={0.3} />
      <pointLight position={[7, 7, 4]} intensity={1.7} color="#aee9ff" />
      <pointLight position={[-6, 4, 5]} intensity={1.15} color="#f6d252" />
      <pointLight position={[0, 2, 0]} intensity={1.45} color="#fff4a6" />
      <CameraParallax />
      <Suspense fallback={null}>
        <Stars
          radius={90}
          depth={45}
          count={2200}
          factor={2.4}
          fade
          speed={0.22}
        />
        <DataCore />
      </Suspense>
    </Canvas>
  )
}
