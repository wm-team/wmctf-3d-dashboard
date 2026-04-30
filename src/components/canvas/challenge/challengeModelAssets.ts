import { useGLTF } from '@react-three/drei'
import { useMemo } from 'react'
import type { BufferGeometry, Group, Mesh } from 'three'
import { challengeVisualConfig } from './challengeVisualConfig'

type GltfScene = {
  scene: Group
}

function useNamedGeometry(url: string, name: string) {
  const gltf = useGLTF(url) as GltfScene

  return useMemo<BufferGeometry | null>(() => {
    let geometry: BufferGeometry | null = null
    gltf.scene.traverse((object) => {
      const mesh = object as Mesh
      if (!geometry && mesh.isMesh && mesh.name === name) geometry = mesh.geometry
    })
    return geometry
  }, [gltf.scene, name])
}

export function useChallengeShardGeometry() {
  return useNamedGeometry(challengeVisualConfig.assets.dataShards, 'DataShardCluster')
}
