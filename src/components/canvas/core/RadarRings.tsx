import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, DoubleSide, type Group, type Mesh, MeshBasicMaterial } from 'three'
import { COLORS, getCategoryNodeByKey, terrainHeight, type CategoryIntensityMap, type CategoryKey } from './coreSceneConfig'

export function RadarRings({
  activeCategory,
  categoryIntensity,
}: {
  activeCategory: CategoryKey | null
  categoryIntensity: CategoryIntensityMap
}) {
  const scanRings = useRef<Mesh[]>([])
  const localScanRings = useRef<Mesh[]>([])
  const outerA = useRef<Group>(null)
  const outerB = useRef<Group>(null)
  const outerC = useRef<Group>(null)
  const centerY = terrainHeight(0, 0) + 0.13

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime
    const values = Object.values(categoryIntensity)
    const averageIntensity = values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1)
    const activeIntensity = activeCategory ? categoryIntensity[activeCategory] ?? averageIntensity : averageIntensity
    scanRings.current.forEach((mesh, index) => {
      const u = ((t * (0.28 + averageIntensity * 0.16) + index / 3) % 1) || 0
      mesh.scale.setScalar(0.38 + u * 3.9)
      const material = mesh.material as MeshBasicMaterial
      material.opacity =
        (1 - u) ** 1.4 *
        (activeCategory
          ? 0.06 + activeIntensity * 0.07
          : index === 0
            ? 0.22 + averageIntensity * 0.18
            : 0.16 + averageIntensity * 0.12)
    })

    localScanRings.current.forEach((mesh, index) => {
      const u = ((t * (0.48 + activeIntensity * 0.3) + index / 3) % 1) || 0
      mesh.scale.setScalar(0.28 + u * 1.45)
      const material = mesh.material as MeshBasicMaterial
      material.opacity = activeCategory ? (1 - u) ** 1.25 * (0.28 + activeIntensity * 0.26) : 0
    })

    if (outerA.current) outerA.current.rotation.y += delta * 0.12
    if (outerB.current) outerB.current.rotation.y -= delta * 0.08
    if (outerC.current) outerC.current.rotation.y += delta * 0.05
  })

  const activeNode = activeCategory ? getCategoryNodeByKey(activeCategory) : null

  return (
    <group>
      <group position={[0, centerY, 0]}>
        {[COLORS.cyan, COLORS.yellow, COLORS.cyanSoft].map((color, index) => (
          <mesh
            key={`scan-${color}-${index}`}
            ref={(element) => {
              if (element) scanRings.current[index] = element
            }}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <ringGeometry args={[0.28, 0.32, 160]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={0}
              side={DoubleSide}
              blending={AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        ))}

        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.42, 0.46, 128, 1, 0.1, Math.PI * 1.62]} />
          <meshBasicMaterial
            color={COLORS.yellow}
            transparent
            opacity={0.62}
            side={DoubleSide}
            blending={AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.07, 16, 16]} />
          <meshBasicMaterial
            color={COLORS.yellow}
            transparent
            opacity={0.88}
            blending={AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      </group>

      <group ref={outerA} position={[0, 0.1, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[4.98, 0.01, 8, 256, Math.PI * 1.55]} />
          <meshBasicMaterial
            color={COLORS.cyan}
            transparent
            opacity={0.32}
            blending={AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
        {[0, 1, 2, 3].map((index) => {
          const angle = index * 1.52 + 0.2
          return (
            <mesh key={`outer-a-dot-${index}`} position={[Math.cos(angle) * 4.98, 0, Math.sin(angle) * 4.98]}>
              <sphereGeometry args={[0.035, 10, 10]} />
              <meshBasicMaterial
                color={COLORS.cyanSoft}
                transparent
                opacity={0.72}
                blending={AdditiveBlending}
                depthWrite={false}
              />
            </mesh>
          )
        })}
      </group>

      <group ref={outerB} position={[0, 0.15, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[5.28, 0.008, 8, 256, Math.PI * 1.18]} />
          <meshBasicMaterial
            color={COLORS.yellow}
            transparent
            opacity={0.22}
            blending={AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      </group>

      <group ref={outerC} position={[0, 0.2, 0]}>
        <mesh rotation={[Math.PI / 2, 0, Math.PI * 0.4]}>
          <torusGeometry args={[5.52, 0.007, 8, 256, Math.PI * 0.92]} />
          <meshBasicMaterial
            color={COLORS.cyanSoft}
            transparent
            opacity={0.18}
            blending={AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      </group>
      {activeNode && (
        <group position={[activeNode.x, terrainHeight(activeNode.x, activeNode.z) + 0.08, activeNode.z]}>
          {[activeNode.color, activeNode.accentColor, COLORS.cyanSoft].map((color, index) => (
            <mesh
              key={`local-scan-${activeNode.key}-${index}`}
              ref={(element) => {
                if (element) localScanRings.current[index] = element
              }}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <ringGeometry args={[0.26, 0.29, 128]} />
              <meshBasicMaterial
                color={color}
                transparent
                opacity={0}
                side={DoubleSide}
                blending={AdditiveBlending}
                depthWrite={false}
              />
            </mesh>
          ))}
        </group>
      )}
    </group>
  )
}
