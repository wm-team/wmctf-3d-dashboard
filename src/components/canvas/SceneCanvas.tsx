import { Canvas } from '@react-three/fiber'
import { PerspectiveCamera, Stars } from '@react-three/drei'
import { Suspense, useEffect, useRef, useState } from 'react'
import { DataCore } from '@/components/canvas/DataCore'
import { CameraRig } from '@/components/canvas/core/CameraRig'
import { CategoryDetailPanel } from '@/components/canvas/core/CategoryDetailPanel'
import { HudPanelMeshes } from '@/components/canvas/HudPanelMeshes'
import type { CtfSnapshot } from '@/types/ctf'
import type { CategoryKey } from '@/components/canvas/core/coreSceneConfig'
import type { Group } from 'three'

export function SceneCanvas({ snapshot }: { snapshot: CtfSnapshot }) {
  const [activeCategory, setActiveCategory] = useState<CategoryKey | null>(null)
  const dataCoreGroup = useRef<Group>(null)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActiveCategory(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <Canvas
      className="scene-canvas"
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      dpr={[1, 2]}
      resize={{ scroll: true, offsetSize: true, debounce: { scroll: 0, resize: 0 } }}
      onPointerMissed={() => setActiveCategory(null)}
    >
      <fog attach="fog" args={['#05090c', 10, 32]} />
      <PerspectiveCamera makeDefault position={[0, 3.62, 9.48]} fov={41} />
      <ambientLight intensity={0.3} />
      <pointLight position={[7, 7, 4]} intensity={1.7} color="#aee9ff" />
      <pointLight position={[-6, 4, 5]} intensity={1.15} color="#f6d252" />
      <pointLight position={[0, 2, 0]} intensity={1.45} color="#fff4a6" />
      <CameraRig activeCategory={activeCategory} dataCoreGroup={dataCoreGroup} />
      <Suspense fallback={null}>
        <Stars
          radius={90}
          depth={45}
          count={2200}
          factor={2.4}
          fade
          speed={0.22}
        />
        <HudPanelMeshes snapshot={snapshot} dimmed={Boolean(activeCategory)} />
        <group ref={dataCoreGroup} scale={0.96} position={[0, 0.28, 0.02]} rotation={[0.53, 0, 0]}>
          <DataCore
            activeCategory={activeCategory}
            onClearCategory={() => setActiveCategory(null)}
            onSelectCategory={setActiveCategory}
            snapshot={snapshot}
          />
        </group>
        <CategoryDetailPanel
          activeCategory={activeCategory}
          onClearCategory={() => setActiveCategory(null)}
        />
      </Suspense>
    </Canvas>
  )
}
