import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { LineBasicMaterial, Mesh, MeshBasicMaterial, ShaderMaterial, type Group } from 'three'
import { CategoryBeacons } from '@/components/canvas/core/CategoryBeacons'
import { CategoryHudLabels } from '@/components/canvas/core/CategoryHudLabels'
import { FlowArcs } from '@/components/canvas/core/FlowArcs'
import { FocusTerrainPatch } from '@/components/canvas/core/FocusTerrainPatch'
import { RadarRings } from '@/components/canvas/core/RadarRings'
import { TechTerrain } from '@/components/canvas/core/TechTerrain'
import type { CtfSnapshot } from '@/types/ctf'
import { useState } from 'react'
import type { CategoryKey } from './core/coreSceneConfig'

function setGroupOpacity(group: Group, opacity: number) {
  group.traverse((object) => {
    if (!(object instanceof Mesh) && object.type !== 'Line') return
    const materialValue = (object as Mesh).material
    const materials = Array.isArray(materialValue) ? materialValue : [materialValue]
    materials.forEach((material) => {
      if (
        !(material instanceof MeshBasicMaterial) &&
        !(material instanceof LineBasicMaterial) &&
        !(material instanceof ShaderMaterial)
      ) {
        return
      }
      const stored = material.userData.baseOpacity
      const baseOpacity = typeof stored === 'number' ? stored : material.opacity
      material.userData.baseOpacity = baseOpacity
      material.transparent = true
      material.opacity = baseOpacity * opacity
    })
  })
}

export function DataCore({
  activeCategory,
  onClearCategory,
  onSelectCategory,
  snapshot,
}: {
  activeCategory: CategoryKey | null
  onClearCategory: () => void
  onSelectCategory: (key: CategoryKey) => void
  snapshot: CtfSnapshot
}) {
  const map = useRef<Group>(null)
  const root = useRef<Group>(null)
  const [hoverCategory, setHoverCategory] = useState<CategoryKey | null>(null)

  useFrame((state) => {
    const elapsed = state.clock.elapsedTime
    if (!map.current || !root.current) return
    const focusDampen = activeCategory ? 0.35 : 1
    map.current.rotation.y = Math.sin(elapsed * 0.18) * 0.018 * focusDampen
    map.current.rotation.x = Math.sin(elapsed * 0.16) * 0.007 * focusDampen
    map.current.position.y = Math.sin(elapsed * 0.72) * 0.018

    const targetScale = 1
    const targetOpacity = 1
    root.current.scale.setScalar(root.current.scale.x + (targetScale - root.current.scale.x) * 0.08)
    root.current.position.z += (0 - root.current.position.z) * 0.08
    root.current.position.y += (0 - root.current.position.y) * 0.08
    setGroupOpacity(root.current, targetOpacity)
  })

  return (
    <group
      ref={root}
      onClick={() => {
        if (activeCategory) onClearCategory()
      }}
    >
      <group ref={map}>
        <RadarRings activeCategory={activeCategory} />
        <TechTerrain activeCategory={activeCategory} />
        <CategoryBeacons
          activeCategory={activeCategory}
          hoverCategory={hoverCategory}
          onHoverCategory={setHoverCategory}
          onSelectCategory={onSelectCategory}
        />
        <FlowArcs activeCategory={activeCategory} />
        <FocusTerrainPatch activeCategory={activeCategory} />
      </group>
      <CategoryHudLabels
        activeCategory={activeCategory}
        hoverCategory={hoverCategory}
        onHoverCategory={setHoverCategory}
        onSelectCategory={onSelectCategory}
        snapshot={snapshot}
      />
    </group>
  )
}
