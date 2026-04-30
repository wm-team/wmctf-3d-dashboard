import { useMemo, useRef, useState, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { LineBasicMaterial, MathUtils, Mesh, MeshBasicMaterial, ShaderMaterial, Vector3, type Group } from 'three'
import { CategoryBeacons } from '@/components/canvas/core/CategoryBeacons'
import { CategoryHudLabels } from '@/components/canvas/core/CategoryHudLabels'
import { FlowArcs } from '@/components/canvas/core/FlowArcs'
import { FocusTerrainPatch } from '@/components/canvas/core/FocusTerrainPatch'
import { RadarRings } from '@/components/canvas/core/RadarRings'
import { TechTerrain } from '@/components/canvas/core/TechTerrain'
import type { CtfSnapshot } from '@/types/ctf'
import { realtimeVisualConfig } from './core/realtimeVisualConfig'
import {
  categoryNodes,
  getCategoryNode,
  getCategoryNodeByKey,
  terrainHeight,
  type CategoryIntensityMap,
  type CategoryKey,
} from './core/coreSceneConfig'

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
  activeFocusWorldPoint,
  onClearCategory,
  onSelectCategory,
  snapshot,
}: {
  activeCategory: CategoryKey | null
  activeFocusWorldPoint: RefObject<Vector3>
  onClearCategory: () => void
  onSelectCategory: (key: CategoryKey) => void
  snapshot: CtfSnapshot
}) {
  const map = useRef<Group>(null)
  const root = useRef<Group>(null)
  const mapYaw = useRef(0)
  const focusLocalPoint = useMemo(() => new Vector3(), [])
  const [hoverCategory, setHoverCategory] = useState<CategoryKey | null>(null)
  const categoryIntensity = useMemo<CategoryIntensityMap>(() => {
    const intensity = categoryNodes.reduce((result, node) => {
      result[node.key] = 0.35
      return result
    }, {} as CategoryIntensityMap)

    snapshot.categories.forEach((category, index) => {
      const node = getCategoryNode(category.name, index)
      intensity[node.key] = Math.max(0.35, Math.min(1, 0.35 + (category.percent / 100) * 0.65))
    })

    return intensity
  }, [snapshot.categories])

  useFrame((state, delta) => {
    const elapsed = state.clock.elapsedTime
    if (!map.current || !root.current) return
    const focusDampen = activeCategory ? realtimeVisualConfig.motion.focusDampen : 1
    if (!activeCategory) {
      mapYaw.current += delta * ((Math.PI * 2) / realtimeVisualConfig.motion.rotatePeriodSeconds)
    }
    const targetYaw = mapYaw.current + Math.sin(elapsed * 0.18) * realtimeVisualConfig.motion.idleYaw * focusDampen
    map.current.rotation.y = MathUtils.lerp(map.current.rotation.y, targetYaw, activeCategory ? 0.05 : 0.09)
    map.current.rotation.x = Math.sin(elapsed * 0.16) * realtimeVisualConfig.motion.idlePitch * focusDampen
    map.current.position.y = Math.sin(elapsed * 0.72) * realtimeVisualConfig.motion.idleFloat
    if (activeCategory) {
      const node = getCategoryNodeByKey(activeCategory)
      focusLocalPoint.set(node.x, terrainHeight(node.x, node.z), node.z)
      map.current.localToWorld(activeFocusWorldPoint.current.copy(focusLocalPoint))
    }

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
        <RadarRings activeCategory={activeCategory} categoryIntensity={categoryIntensity} />
        <TechTerrain activeCategory={activeCategory} categoryIntensity={categoryIntensity} />
        <CategoryBeacons
          activeCategory={activeCategory}
          categoryIntensity={categoryIntensity}
          hoverCategory={hoverCategory}
          onHoverCategory={setHoverCategory}
          onSelectCategory={onSelectCategory}
        />
        <FlowArcs activeCategory={activeCategory} categoryIntensity={categoryIntensity} />
        <FocusTerrainPatch activeCategory={activeCategory} categoryIntensity={categoryIntensity} />
        <CategoryHudLabels
          activeCategory={activeCategory}
          hoverCategory={hoverCategory}
          onHoverCategory={setHoverCategory}
          onSelectCategory={onSelectCategory}
          snapshot={snapshot}
        />
      </group>
    </group>
  )
}
