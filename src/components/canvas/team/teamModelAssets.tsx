import { useGLTF } from '@react-three/drei'
import { useMemo } from 'react'
import type { BufferGeometry, Group, Mesh } from 'three'

export const teamRankKitUrl = '/models/team/team-rank-kit.glb?v=team-crowns'

export type TeamRankKitNode =
  | 'RankPodiumBronze'
  | 'RankPodiumGold'
  | 'RankPodiumSilver'
  | 'ScoreShard'
  | 'TeamCoreCrystal'
  | 'TeamCrownBronze'
  | 'TeamCrownGold'
  | 'TeamCrownSilver'
  | 'TeamMedalBronze'
  | 'TeamMedalGold'
  | 'TeamMedalSilver'

type GltfScene = {
  scene: Group
}

function useGeometryMap() {
  const gltf = useGLTF(teamRankKitUrl) as GltfScene

  return useMemo(() => {
    const geometries = new Map<string, BufferGeometry>()
    gltf.scene.traverse((object) => {
      const mesh = object as Mesh
      if (mesh.isMesh && mesh.geometry) geometries.set(mesh.name, mesh.geometry)
    })
    return geometries
  }, [gltf.scene])
}

export function useTeamRankGeometry(name: TeamRankKitNode) {
  const geometries = useGeometryMap()
  return geometries.get(name) ?? null
}

useGLTF.preload(teamRankKitUrl)
