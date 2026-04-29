import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, DoubleSide, Mesh, MeshBasicMaterial, type Group } from 'three'
import { getCategoryNodeByKey, terrainHeight, type CategoryKey } from './coreSceneConfig'

function applyGroupOpacity(group: Group, opacity: number) {
  group.traverse((object) => {
    if (!(object instanceof Mesh)) return
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    materials.forEach((material) => {
      if (!(material instanceof MeshBasicMaterial)) return
      const stored = material.userData.baseOpacity
      const baseOpacity = typeof stored === 'number' ? stored : material.opacity
      material.userData.baseOpacity = baseOpacity
      material.opacity = baseOpacity * opacity
    })
  })
}

export function FocusTerrainDetails({ activeCategory }: { activeCategory: CategoryKey | null }) {
  const group = useRef<Group>(null)
  const opacity = useRef(0)
  const node = activeCategory ? getCategoryNodeByKey(activeCategory) : null

  useFrame((_, delta) => {
    opacity.current += ((node ? 1 : 0) - opacity.current) * 0.08
    if (!group.current || !node) return
    group.current.position.set(node.x, terrainHeight(node.x, node.z) + 0.08, node.z)
    group.current.rotation.y += delta * 0.08
    applyGroupOpacity(group.current, opacity.current)
  })

  if (!node) return null

  const color = node.accentColor

  return (
    <group ref={group} position={[node.x, terrainHeight(node.x, node.z) + 0.08, node.z]}>
      {node.focusTheme === 'gateway' && (
        <>
          {[-0.48, 0, 0.48].map((offset) => (
            <mesh key={`gate-lane-${offset}`} position={[offset, 0.035, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.12, 1.35]} />
              <meshBasicMaterial
                color={color}
                transparent
                opacity={0.22}
                side={DoubleSide}
                blending={AdditiveBlending}
                depthWrite={false}
              />
            </mesh>
          ))}
          {[0.42, 0.72, 1.02].map((radius) => (
            <mesh key={`gate-ring-${radius}`} rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry args={[radius, radius + 0.018, 4, 1]} />
              <meshBasicMaterial
                color={color}
                transparent
                opacity={0.24}
                side={DoubleSide}
                blending={AdditiveBlending}
                depthWrite={false}
              />
            </mesh>
          ))}
        </>
      )}

      {node.focusTheme === 'exploit' && (
        <>
          {Array.from({ length: 7 }, (_, index) => {
            const angle = -0.9 + index * 0.3
            return (
              <mesh key={`crack-${index}`} position={[Math.cos(angle) * 0.34, 0.04, Math.sin(angle) * 0.34]} rotation={[0, angle, 0]}>
                <boxGeometry args={[0.72 - index * 0.045, 0.018, 0.032]} />
                <meshBasicMaterial
                  color={color}
                  transparent
                  opacity={0.34}
                  blending={AdditiveBlending}
                  depthWrite={false}
                />
              </mesh>
            )
          })}
          {[0.34, 0.72, 1.08].map((radius) => (
            <mesh key={`blast-${radius}`} rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry args={[radius, radius + 0.02, 96]} />
              <meshBasicMaterial
                color={color}
                transparent
                opacity={0.22}
                side={DoubleSide}
                blending={AdditiveBlending}
                depthWrite={false}
              />
            </mesh>
          ))}
        </>
      )}

      {node.focusTheme === 'reverse' && (
        <>
          {Array.from({ length: 9 }, (_, index) => {
            const angle = index * 0.7
            const radius = 0.2 + index * 0.085
            return (
              <mesh key={`cfg-${index}`} position={[Math.cos(angle) * radius, 0.06 + index * 0.005, Math.sin(angle) * radius]}>
                <sphereGeometry args={[0.04, 10, 10]} />
                <meshBasicMaterial
                  color={index % 3 === 0 ? '#ffd21f' : color}
                  transparent
                  opacity={0.58}
                  blending={AdditiveBlending}
                  depthWrite={false}
                />
              </mesh>
            )
          })}
          {[0.36, 0.62, 0.88].map((radius) => (
            <mesh key={`reverse-loop-${radius}`} rotation={[Math.PI / 2, 0, radius]}>
              <torusGeometry args={[radius, 0.008, 8, 96, Math.PI * 1.35]} />
              <meshBasicMaterial
                color={color}
                transparent
                opacity={0.26}
                blending={AdditiveBlending}
                depthWrite={false}
              />
            </mesh>
          ))}
        </>
      )}

      {node.focusTheme === 'cipher' && (
        <>
          {[0.34, 0.52, 0.7, 0.88, 1.06].map((radius, index) => (
            <mesh key={`cipher-ring-${radius}`} rotation={[Math.PI / 2, 0, index * 0.2]}>
              <ringGeometry args={[radius, radius + 0.012, 128, 1, index * 0.24, Math.PI * (index % 2 ? 1.55 : 1.86)]} />
              <meshBasicMaterial
                color={index % 2 === 0 ? color : '#f4f8ff'}
                transparent
                opacity={0.24}
                side={DoubleSide}
                blending={AdditiveBlending}
                depthWrite={false}
              />
            </mesh>
          ))}
          {Array.from({ length: 16 }, (_, index) => {
            const angle = (index / 16) * Math.PI * 2
            return (
              <mesh key={`cipher-tick-${index}`} position={[Math.cos(angle) * 0.96, 0.055, Math.sin(angle) * 0.96]} rotation={[0, -angle, 0]}>
                <boxGeometry args={[0.12, 0.012, 0.018]} />
                <meshBasicMaterial color={color} transparent opacity={0.26} blending={AdditiveBlending} depthWrite={false} />
              </mesh>
            )
          })}
        </>
      )}

      {node.focusTheme === 'chaos' && (
        <>
          {Array.from({ length: 14 }, (_, index) => {
            const angle = index * 1.7
            const radius = 0.22 + (index % 5) * 0.18
            return (
              <mesh
                key={`fragment-${index}`}
                position={[Math.cos(angle) * radius, 0.12 + (index % 4) * 0.045, Math.sin(angle) * radius]}
                rotation={[index * 0.2, angle, index * 0.13]}
              >
                <boxGeometry args={[0.12 + (index % 3) * 0.035, 0.04, 0.1]} />
                <meshBasicMaterial
                  color={index % 2 === 0 ? color : '#69f6ff'}
                  transparent
                  opacity={0.32}
                  blending={AdditiveBlending}
                  depthWrite={false}
                />
              </mesh>
            )
          })}
        </>
      )}

      {node.focusTheme === 'forensic' && (
        <>
          {[-0.5, -0.25, 0, 0.25, 0.5].map((offset) => (
            <mesh key={`slice-${offset}`} position={[0, 0.06, offset]} rotation={[Math.PI / 2, 0, 0]}>
              <planeGeometry args={[1.42, 0.035]} />
              <meshBasicMaterial
                color={color}
                transparent
                opacity={0.25}
                side={DoubleSide}
                blending={AdditiveBlending}
                depthWrite={false}
              />
            </mesh>
          ))}
          {[0.42, 0.76, 1.08].map((radius, index) => (
            <mesh key={`forensic-scan-${radius}`} rotation={[Math.PI / 2, 0, index * 0.35]}>
              <ringGeometry args={[radius, radius + 0.012, 128, 1, 0.1, Math.PI * 0.62]} />
              <meshBasicMaterial
                color={color}
                transparent
                opacity={0.3}
                side={DoubleSide}
                blending={AdditiveBlending}
                depthWrite={false}
              />
            </mesh>
          ))}
        </>
      )}
    </group>
  )
}
