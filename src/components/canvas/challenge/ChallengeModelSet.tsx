import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  DoubleSide,
  type BufferGeometry,
  type Group,
  type Mesh,
  type MeshStandardMaterial,
} from 'three'
import { categoryNodes, terrainHeight } from '../core/coreSceneConfig'
import { useChallengeShardGeometry } from './challengeModelAssets'
import type { ChallengeCategory } from './challengeTypes'
import { challengeVisualConfig } from './challengeVisualConfig'

type GltfScene = {
  scene: Group
}

const landmarkMeshNames: Record<ChallengeCategory, string> = {
  crypto: 'LandmarkCrypto',
  forensics: 'LandmarkForensics',
  misc: 'LandmarkMisc',
  pwn: 'LandmarkPwn',
  rev: 'LandmarkRev',
  web: 'LandmarkWeb',
}

function useGeometryMap(url: string) {
  const gltf = useGLTF(url) as GltfScene

  return useMemo(() => {
    const geometries = new Map<string, BufferGeometry>()
    gltf.scene.traverse((object) => {
      const mesh = object as Mesh
      if (mesh.isMesh && mesh.geometry) geometries.set(mesh.name, mesh.geometry)
    })
    return geometries
  }, [gltf.scene])
}

export function ChallengeCoreShell({ intensity = 1 }: { intensity?: number }) {
  const gltf = useGLTF(challengeVisualConfig.assets.coreShell) as GltfScene
  const shell = useRef<Group>(null)
  const coreScene = useMemo(() => {
    const clone = gltf.scene.clone(true)

    clone.traverse((object) => {
      const mesh = object as Mesh
      if (!mesh.isMesh) return

      mesh.raycast = () => undefined
      mesh.renderOrder = 20
      if (Array.isArray(mesh.material)) {
        mesh.material = mesh.material.map((material) => material.clone())
      } else {
        mesh.material = mesh.material.clone()
      }
    })

    return clone
  }, [gltf.scene])

  useFrame((state) => {
    if (!shell.current) return
    const elapsed = state.clock.elapsedTime
    shell.current.rotation.y = elapsed * -0.08
    shell.current.position.y = Math.sin(elapsed * 0.74) * 0.014
    shell.current.scale.setScalar(
      challengeVisualConfig.core.shellScale +
        Math.sin(elapsed * 0.86) * challengeVisualConfig.core.shellPulse * intensity,
    )
  })

  return (
    <group ref={shell} raycast={() => undefined}>
      <primitive object={coreScene} />
    </group>
  )
}

function ChallengeCategoryLandmark({
  activeCategory,
  category,
}: {
  activeCategory: ChallengeCategory | null
  category: ChallengeCategory
}) {
  const geometries = useGeometryMap(challengeVisualConfig.assets.categoryLandmarks)
  const group = useRef<Group>(null)
  const material = useRef<MeshStandardMaterial>(null)
  const node = categoryNodes.find((item) => item.key === category)
  const geometry = geometries.get(landmarkMeshNames[category])

  useFrame((state) => {
    if (!node || !group.current) return
    const elapsed = state.clock.elapsedTime
    const selected = activeCategory === category
    const dimmed = Boolean(activeCategory && !selected)
    const targetScale = selected ? 0.48 : 0.34
    const targetOpacity = dimmed ? 0.1 : selected ? 0.72 : 0.36

    group.current.position.y = terrainHeight(node.x, node.z) + 0.15 + Math.sin(elapsed * 0.84 + node.phase) * 0.014
    group.current.rotation.y = node.phase * 0.48 + elapsed * (selected ? 0.34 : 0.13)
    group.current.scale.setScalar(group.current.scale.x + (targetScale - group.current.scale.x) * 0.08)
    if (material.current) {
      material.current.opacity += (targetOpacity - material.current.opacity) * 0.12
      material.current.emissiveIntensity = selected ? 0.64 : dimmed ? 0.08 : 0.28
    }
  })

  if (!node || !geometry) return null

  return (
    <group
      ref={group}
      position={[node.x, terrainHeight(node.x, node.z) + 0.15, node.z]}
      scale={0.34}
      raycast={() => undefined}
    >
      <mesh geometry={geometry} renderOrder={18}>
        <meshStandardMaterial
          ref={material}
          color={node.accentColor}
          emissive={node.accentColor}
          emissiveIntensity={0.28}
          metalness={0.58}
          roughness={0.28}
          transparent
          opacity={0.36}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} renderOrder={17}>
        <ringGeometry args={[0.42, 0.47, 56]} />
        <meshBasicMaterial
          color={node.accentColor}
          transparent
          opacity={activeCategory === category ? 0.32 : activeCategory ? 0.04 : 0.14}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

export function ChallengeCategoryLandmarks({ activeCategory }: { activeCategory: ChallengeCategory | null }) {
  return (
    <group raycast={() => undefined}>
      {categoryNodes.map((node) => (
        <ChallengeCategoryLandmark
          key={node.key}
          activeCategory={activeCategory}
          category={node.key as ChallengeCategory}
        />
      ))}
    </group>
  )
}

export function ChallengeDataShards({
  active = false,
  color,
  opacity = 0.34,
  scale = 1,
}: {
  active?: boolean
  color: string
  opacity?: number
  scale?: number
}) {
  const geometry = useChallengeShardGeometry()
  const group = useRef<Group>(null)

  useFrame((state) => {
    if (!group.current) return
    const elapsed = state.clock.elapsedTime
    group.current.rotation.y = elapsed * (active ? 0.9 : 0.34)
    group.current.rotation.x = Math.sin(elapsed * 0.7) * 0.08
    group.current.position.y = Math.sin(elapsed * 1.2) * (active ? 0.028 : 0.012)
  })

  if (!geometry) return null

  return (
    <group ref={group} scale={scale} raycast={() => undefined}>
      <mesh geometry={geometry} renderOrder={24} raycast={() => undefined}>
        <meshBasicMaterial
          color={color}
          transparent
          opacity={opacity}
          blending={AdditiveBlending}
          depthWrite={false}
          side={DoubleSide}
        />
      </mesh>
    </group>
  )
}

useGLTF.preload(challengeVisualConfig.assets.categoryLandmarks)
useGLTF.preload(challengeVisualConfig.assets.coreShell)
useGLTF.preload(challengeVisualConfig.assets.dataShards)
