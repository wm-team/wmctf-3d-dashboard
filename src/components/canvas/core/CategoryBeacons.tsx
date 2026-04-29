import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, DoubleSide, Mesh, type Group, type Mesh as ThreeMesh, MeshBasicMaterial } from 'three'
import { COLORS, categoryNodes, terrainHeight, type CategoryKey } from './coreSceneConfig'

function applyBeaconOpacity(group: Group, opacity: number) {
  group.traverse((object) => {
    if (!(object instanceof Mesh)) return
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    materials.forEach((material) => {
      if (!(material instanceof MeshBasicMaterial)) return
      const stored = material.userData.baseOpacity
      const baseOpacity = typeof stored === 'number' ? stored : material.opacity
      material.userData.baseOpacity = baseOpacity
      material.opacity = Math.min(1, baseOpacity * opacity)
    })
  })
}

function Beacon({
  activeCategory,
  hoverCategory,
  index,
  node,
  onHoverCategory,
  onSelectCategory,
}: {
  activeCategory: CategoryKey | null
  hoverCategory: CategoryKey | null
  index: number
  node: (typeof categoryNodes)[number]
  onHoverCategory: (key: CategoryKey | null) => void
  onSelectCategory: (key: CategoryKey) => void
}) {
  const group = useRef<Group>(null)
  const beam = useRef<Group>(null)
  const pulseRing = useRef<ThreeMesh>(null)
  const topDot = useRef<ThreeMesh>(null)
  const isPriority = node.name === 'Web' || node.name === 'Pwn'
  const color = isPriority ? COLORS.yellow : node.color
  const height = isPriority ? 1.18 : 0.92 + (index % 3) * 0.08
  const baseY = terrainHeight(node.x, node.z) + 0.045

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const pulse = Math.sin(t * 1.6 + index * 0.72) * 0.5 + 0.5
    const selected = activeCategory === node.key
    const hovered = hoverCategory === node.key
    const hasFocus = Boolean(activeCategory)
    const dim = hasFocus && !selected ? 0.28 : 1
    const boost = selected ? 1.85 : hovered ? 1.34 : 1
    const visibility = dim * boost

    if (beam.current) {
      beam.current.scale.y = 0.92 + pulse * 0.18 + (selected ? 0.32 : 0)
      beam.current.position.y = baseY + (height * beam.current.scale.y) / 2
      beam.current.rotation.y = t * 0.18 + index
    }

    if (pulseRing.current) {
      const u = ((t * 0.55 + index * 0.18) % 1) || 0
      pulseRing.current.scale.setScalar(0.72 + u * 1.35)
      const material = pulseRing.current.material as MeshBasicMaterial
      material.opacity = (1 - u) * 0.34
    }

    if (topDot.current) {
      topDot.current.position.y = baseY + height + 0.05 + pulse * 0.045
      const material = topDot.current.material as MeshBasicMaterial
      material.opacity = (0.72 + pulse * 0.22) * visibility
    }

    if (group.current) applyBeaconOpacity(group.current, visibility)
  })

  return (
    <group
      ref={group}
      position={[node.x, 0, node.z]}
      onClick={(event) => {
        event.stopPropagation()
        onSelectCategory(node.key)
      }}
      onPointerOver={(event) => {
        event.stopPropagation()
        onHoverCategory(node.key)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={(event) => {
        event.stopPropagation()
        onHoverCategory(null)
        document.body.style.cursor = ''
      }}
    >
      <group ref={beam} position={[0, baseY + height / 2, 0]}>
        <mesh>
          <cylinderGeometry args={[0.018, 0.082, height, 28, 1, true]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.28}
            side={DoubleSide}
            blending={AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[0.1, height]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.18}
            side={DoubleSide}
            blending={AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
        <mesh>
          <planeGeometry args={[0.1, height]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.18}
            side={DoubleSide}
            blending={AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      </group>

      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, baseY + 0.016, 0]}>
        <torusGeometry args={[0.25 + index * 0.012, 0.011, 8, 96]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.74}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <mesh ref={pulseRing} rotation={[Math.PI / 2, 0, 0]} position={[0, baseY + 0.026, 0]}>
        <torusGeometry args={[0.26, 0.009, 8, 96]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.24}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, baseY + 0.034, 0]}>
        <ringGeometry args={[0.34, 0.36, 4, 1]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.28}
          side={DoubleSide}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {[
        [0.18, 0, 0.018, 0.006],
        [-0.18, 0, 0.018, 0.006],
        [0, 0.18, 0.006, 0.018],
        [0, -0.18, 0.006, 0.018],
      ].map(([x, z, sx, sz]) => (
        <mesh key={`${x}-${z}`} position={[x, baseY + 0.04, z]}>
          <boxGeometry args={[sx, 0.006, sz]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.62}
            blending={AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}

      <mesh ref={topDot} position={[0, baseY + height + 0.05, 0]}>
        <sphereGeometry args={[isPriority ? 0.064 : 0.052, 18, 18]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.86}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, baseY + height * 0.45, 0]}>
        <cylinderGeometry args={[0.42, 0.42, height + 0.25, 24, 1, true]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  )
}

export function CategoryBeacons({
  activeCategory,
  hoverCategory,
  onHoverCategory,
  onSelectCategory,
}: {
  activeCategory: CategoryKey | null
  hoverCategory: CategoryKey | null
  onHoverCategory: (key: CategoryKey | null) => void
  onSelectCategory: (key: CategoryKey) => void
}) {
  return (
    <group>
      {categoryNodes.map((node, index) => (
        <Beacon
          key={node.name}
          activeCategory={activeCategory}
          hoverCategory={hoverCategory}
          index={index}
          node={node}
          onHoverCategory={onHoverCategory}
          onSelectCategory={onSelectCategory}
        />
      ))}
    </group>
  )
}
