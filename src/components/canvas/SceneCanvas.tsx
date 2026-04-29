import { Canvas, useFrame } from '@react-three/fiber'
import { PerspectiveCamera, Stars } from '@react-three/drei'
import { Suspense } from 'react'
import { DataCore } from '@/components/canvas/DataCore'
import { HudPanelMeshes } from '@/components/canvas/HudPanelMeshes'
import type { CtfSnapshot } from '@/types/ctf'

function CameraParallax() {
  useFrame((state) => {
    const { camera, pointer } = state
    const targetX = pointer.x * 0.42
    const targetY = 3.62 + pointer.y * 0.2
    const targetZ = 9.48 - pointer.y * 0.12

    camera.position.x += (targetX - camera.position.x) * 0.055
    camera.position.y += (targetY - camera.position.y) * 0.055
    camera.position.z += (targetZ - camera.position.z) * 0.055
    camera.lookAt(pointer.x * 0.46, 0.08 + pointer.y * 0.16, -0.08)
  })

  return null
}

export function SceneCanvas({ snapshot }: { snapshot: CtfSnapshot }) {
  return (
    <Canvas
      className="scene-canvas"
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      dpr={[1, 2]}
      resize={{ scroll: true, offsetSize: true, debounce: { scroll: 0, resize: 0 } }}
    >
      <fog attach="fog" args={['#05090c', 10, 32]} />
      <PerspectiveCamera makeDefault position={[0, 3.62, 9.48]} fov={41} />
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
        <HudPanelMeshes snapshot={snapshot} />
        <group scale={0.88} position={[0, 0.32, 0.08]} rotation={[0.48, 0, 0]}>
          <DataCore snapshot={snapshot} />
        </group>
      </Suspense>
    </Canvas>
  )
}
