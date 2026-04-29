import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { CategoryBeacons } from '@/components/canvas/core/CategoryBeacons'
import { CategoryHudLabels } from '@/components/canvas/core/CategoryHudLabels'
import { FlowArcs } from '@/components/canvas/core/FlowArcs'
import { FocusTerrainDetails } from '@/components/canvas/core/FocusTerrainDetails'
import { RadarRings } from '@/components/canvas/core/RadarRings'
import { TechTerrain } from '@/components/canvas/core/TechTerrain'
import type { CtfSnapshot } from '@/types/ctf'
import { useState } from 'react'
import type { CategoryKey } from './core/coreSceneConfig'

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
  const [hoverCategory, setHoverCategory] = useState<CategoryKey | null>(null)

  useFrame((state) => {
    const elapsed = state.clock.elapsedTime
    if (!map.current) return
    const focusDampen = activeCategory ? 0.35 : 1
    map.current.rotation.y = Math.sin(elapsed * 0.18) * 0.018 * focusDampen
    map.current.rotation.x = Math.sin(elapsed * 0.16) * 0.007 * focusDampen
    map.current.position.y = Math.sin(elapsed * 0.72) * 0.018
  })

  return (
    <group
      onClick={() => {
        if (activeCategory) onClearCategory()
      }}
    >
      <group ref={map}>
        <RadarRings activeCategory={activeCategory} />
        <TechTerrain activeCategory={activeCategory} />
        <FocusTerrainDetails activeCategory={activeCategory} />
        <CategoryBeacons
          activeCategory={activeCategory}
          hoverCategory={hoverCategory}
          onHoverCategory={setHoverCategory}
          onSelectCategory={onSelectCategory}
        />
        <FlowArcs activeCategory={activeCategory} />
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
