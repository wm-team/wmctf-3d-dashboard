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

function DetailMaterial({
  color,
  opacity,
}: {
  color: string
  opacity: number
}) {
  return (
    <meshBasicMaterial
      color={color}
      transparent
      opacity={opacity}
      blending={AdditiveBlending}
      depthWrite={false}
    />
  )
}

export function FocusTerrainDetails({ activeCategory }: { activeCategory: CategoryKey | null }) {
  const group = useRef<Group>(null)
  const opacity = useRef(0)
  const node = activeCategory ? getCategoryNodeByKey(activeCategory) : null

  useFrame(() => {
    opacity.current += ((node ? 1 : 0) - opacity.current) * 0.075
    if (!group.current || !node) return
    group.current.position.set(node.x, terrainHeight(node.x, node.z) + 0.07, node.z)
    group.current.scale.setScalar(0.9 + opacity.current * 0.1)
    applyGroupOpacity(group.current, opacity.current)
  })

  if (!node) return null

  const color = node.accentColor

  return (
    <group ref={group} position={[node.x, terrainHeight(node.x, node.z) + 0.07, node.z]}>
      {node.focusTheme === 'gateway' && (
        <>
          {[
            [-0.52, 0, 0.88, 0.06, 0.44],
            [0.02, 0.03, 1.08, 0.07, 0.52],
            [0.56, -0.02, 0.78, 0.055, 0.36],
          ].map(([x, z, w, h, d], index) => (
            <mesh key={`web-slab-${index}`} position={[x, h / 2, z]}>
              <boxGeometry args={[w, h, d]} />
              <DetailMaterial color={index === 1 ? '#ffd21f' : color} opacity={0.3} />
            </mesh>
          ))}
          {[
            [-0.82, 0.06, 0, 0.58],
            [-0.5, 0.06, Math.PI / 2, 0.36],
            [-0.5, 0.38, 0, 0.68],
            [0.08, 0.38, Math.PI / 2, 0.44],
            [0.08, 0.82, 0, 0.72],
          ].map(([x, z, rotation, length], index) => (
            <mesh key={`web-route-${index}`} position={[x, 0.095, z]} rotation={[0, rotation, 0]}>
              <boxGeometry args={[length, 0.024, 0.048]} />
              <DetailMaterial color={index > 2 ? '#ffd21f' : color} opacity={0.42} />
            </mesh>
          ))}
          {[-0.28, 0.28].map((x) => (
            <mesh key={`web-gate-post-${x}`} position={[x, 0.28, 0.92]}>
              <boxGeometry args={[0.08, 0.56, 0.08]} />
              <DetailMaterial color="#ffd21f" opacity={0.48} />
            </mesh>
          ))}
          <mesh position={[0, 0.58, 0.92]}>
            <boxGeometry args={[0.7, 0.08, 0.08]} />
            <DetailMaterial color="#ffd21f" opacity={0.5} />
          </mesh>
          <mesh position={[0.42, 0.24, 1.1]} rotation={[0, 0.18, 0]}>
            <planeGeometry args={[0.12, 0.72]} />
            <meshBasicMaterial color={color} transparent opacity={0.18} side={DoubleSide} blending={AdditiveBlending} depthWrite={false} />
          </mesh>
          {Array.from({ length: 7 }, (_, index) => (
            <mesh key={`web-packet-${index}`} position={[-1.06 + index * 0.24, 0.13, 0.06 + index * 0.12]}>
              <boxGeometry args={[0.055, 0.055, 0.055]} />
              <DetailMaterial color={index % 3 === 0 ? '#ffd21f' : color} opacity={0.52} />
            </mesh>
          ))}
        </>
      )}

      {node.focusTheme === 'exploit' && (
        <>
          {[
            [-0.56, -0.12, -0.62, 0.05, 0.045],
            [-0.22, 0.02, -0.48, 0.045, -0.34],
            [0.12, 0.14, -0.58, 0.04, -0.7],
            [0.44, 0.02, -0.42, 0.038, -0.28],
            [0.76, -0.1, -0.34, 0.036, -0.58],
          ].map(([x, z, length, width, rotation], index) => (
            <mesh key={`pwn-crack-${index}`} position={[x, 0.06, z]} rotation={[0, rotation, 0]}>
              <boxGeometry args={[Math.abs(length), 0.026, width]} />
              <DetailMaterial color="#ffd21f" opacity={0.56} />
            </mesh>
          ))}
          <mesh position={[0.02, 0.018, -0.02]}>
            <cylinderGeometry args={[0.42, 0.58, 0.035, 7]} />
            <DetailMaterial color="#2b1408" opacity={0.64} />
          </mesh>
          <mesh position={[0.02, 0.055, -0.02]} rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.34, 0.38, 7]} />
            <meshBasicMaterial color="#ffd21f" transparent opacity={0.28} side={DoubleSide} blending={AdditiveBlending} depthWrite={false} />
          </mesh>
          {Array.from({ length: 6 }, (_, index) => {
            const angle = -0.6 + index * 0.28
            return (
              <mesh key={`pwn-shard-${index}`} position={[Math.cos(angle) * 0.52, 0.15, Math.sin(angle) * 0.44]} rotation={[0.22, angle, -0.18]}>
                <boxGeometry args={[0.07, 0.24, 0.04]} />
                <DetailMaterial color={index % 2 ? color : '#ffd21f'} opacity={0.38} />
              </mesh>
            )
          })}
          {Array.from({ length: 5 }, (_, index) => (
            <mesh key={`pwn-memory-${index}`} position={[-0.72 + index * 0.18, 0.08 + index * 0.012, 0.62]}>
              <boxGeometry args={[0.14, 0.1, 0.24]} />
              <DetailMaterial color={index === 2 ? '#ffd21f' : color} opacity={0.34} />
            </mesh>
          ))}
        </>
      )}

      {node.focusTheme === 'reverse' && (
        <>
          {[
            [-0.62, 0.42],
            [-0.22, 0.62],
            [0.28, 0.46],
            [0.62, 0.12],
            [0.22, -0.16],
            [-0.28, -0.38],
            [-0.7, -0.18],
          ].map(([x, z], index) => (
            <mesh key={`rev-node-${index}`} position={[x, 0.1, z]}>
              <cylinderGeometry args={[0.075, 0.075, 0.06, index % 3 === 0 ? 4 : 8]} />
              <DetailMaterial color={index % 3 === 0 ? '#ffd21f' : color} opacity={0.54} />
            </mesh>
          ))}
          {[
            [-0.42, 0.52, 0.44, 0.46],
            [0.04, 0.54, 0.52, -0.32],
            [0.45, 0.28, 0.5, -0.82],
            [0, -0.27, 0.56, 0.42],
            [-0.5, -0.28, 0.5, -0.62],
          ].map(([x, z, length, rotation], index) => (
            <mesh key={`rev-edge-${index}`} position={[x, 0.09, z]} rotation={[0, rotation, 0]}>
              <boxGeometry args={[length, 0.025, 0.032]} />
              <DetailMaterial color={color} opacity={0.36} />
            </mesh>
          ))}
          {[-0.48, 0.36].map((x, index) => (
            <mesh key={`rev-breakpoint-${index}`} position={[x, 0.17, index ? -0.36 : 0.56]}>
              <boxGeometry args={[0.12, 0.12, 0.035]} />
              <DetailMaterial color="#ffd21f" opacity={0.58} />
            </mesh>
          ))}
          <mesh position={[0.08, 0.08, 0]} rotation={[Math.PI / 2, 0, -0.5]}>
            <torusGeometry args={[0.56, 0.008, 6, 80, Math.PI * 1.2]} />
            <DetailMaterial color={color} opacity={0.28} />
          </mesh>
        </>
      )}

      {node.focusTheme === 'cipher' && (
        <>
          <mesh position={[0, 0.16, 0]} rotation={[0.5, 0.2, 0.7]}>
            <octahedronGeometry args={[0.16, 0]} />
            <DetailMaterial color={color} opacity={0.64} />
          </mesh>
          {[0.34, 0.56, 0.8].map((radius, index) => (
            <mesh key={`cipher-fine-ring-${radius}`} rotation={[Math.PI / 2, 0, index * 0.35]}>
              <ringGeometry args={[radius, radius + 0.01, 96, 1, index * 0.35, Math.PI * (index === 1 ? 1.32 : 1.72)]} />
              <meshBasicMaterial color={index === 1 ? '#f4f8ff' : color} transparent opacity={0.24} side={DoubleSide} blending={AdditiveBlending} depthWrite={false} />
            </mesh>
          ))}
          {Array.from({ length: 18 }, (_, index) => {
            const angle = (index / 18) * Math.PI * 2
            return (
              <mesh key={`cipher-tick-${index}`} position={[Math.cos(angle) * 0.92, 0.08, Math.sin(angle) * 0.92]} rotation={[0, -angle, 0]}>
                <boxGeometry args={[0.12, 0.016, 0.022]} />
                <DetailMaterial color={index % 3 === 0 ? '#f4f8ff' : color} opacity={0.36} />
              </mesh>
            )
          })}
          {Array.from({ length: 5 }, (_, row) =>
            Array.from({ length: 5 }, (_, col) => (
              <mesh key={`cipher-lattice-${row}-${col}`} position={[-0.48 + col * 0.12, 0.055, 0.42 + row * 0.1]}>
                <boxGeometry args={[0.055, 0.025, 0.055]} />
                <DetailMaterial color={(row + col) % 2 ? color : '#f4f8ff'} opacity={0.28} />
              </mesh>
            )),
          )}
          {[-0.62, 0.64].map((x, index) => (
            <mesh key={`cipher-fragment-${index}`} position={[x, 0.18, index ? -0.42 : 0.28]} rotation={[0.1, index * 0.9, 0.5]}>
              <boxGeometry args={[0.18, 0.035, 0.07]} />
              <DetailMaterial color="#ffd21f" opacity={0.28} />
            </mesh>
          ))}
        </>
      )}

      {node.focusTheme === 'chaos' && (
        <>
          {Array.from({ length: 16 }, (_, index) => {
            const angle = index * 1.23
            const radius = 0.18 + (index % 5) * 0.16
            return (
              <mesh
                key={`misc-tile-${index}`}
                position={[Math.cos(angle) * radius, 0.035 + (index % 3) * 0.02, Math.sin(angle) * radius]}
                rotation={[0, angle + (index % 2) * 0.45, 0]}
              >
                <boxGeometry args={[0.18 + (index % 3) * 0.05, 0.045, 0.14 + (index % 2) * 0.06]} />
                <DetailMaterial color={index % 4 === 0 ? '#ffd21f' : color} opacity={0.3} />
              </mesh>
            )
          })}
          {Array.from({ length: 7 }, (_, index) => (
            <mesh key={`misc-artifact-${index}`} position={[-0.68 + index * 0.22, 0.2 + (index % 2) * 0.05, 0.52 - index * 0.13]} rotation={[0.2 * index, index * 0.7, 0.3]}>
              <boxGeometry args={[0.09, 0.09, 0.09]} />
              <DetailMaterial color={index % 2 ? color : '#69f6ff'} opacity={0.32} />
            </mesh>
          ))}
          {[
            [-0.72, -0.4, 0.46, 0.32],
            [-0.25, -0.12, 0.58, -0.18],
            [0.28, 0.04, 0.5, 0.72],
          ].map(([x, z, length, rotation], index) => (
            <mesh key={`misc-clue-${index}`} position={[x, 0.11, z]} rotation={[0, rotation, 0]}>
              <boxGeometry args={[length, 0.02, 0.03]} />
              <DetailMaterial color={index === 1 ? '#ffd21f' : '#69f6ff'} opacity={0.38} />
            </mesh>
          ))}
          {[
            [-0.82, -0.58],
            [-0.42, -0.18],
            [0.02, -0.28],
            [0.38, 0.1],
            [0.72, 0.42],
          ].map(([x, z], index) => (
            <mesh key={`misc-clue-node-${index}`} position={[x, 0.145, z]}>
              <cylinderGeometry args={[0.045, 0.045, 0.052, index % 2 ? 4 : 6]} />
              <DetailMaterial color={index === 3 ? '#ffd21f' : color} opacity={0.5} />
            </mesh>
          ))}
          {[
            [-0.62, -0.38, 0.46, 0.72],
            [-0.15, -0.23, 0.42, -0.24],
            [0.48, 0.25, 0.36, 0.58],
          ].map(([x, z, length, rotation], index) => (
            <mesh key={`misc-fragment-link-${index}`} position={[x, 0.12, z]} rotation={[0, rotation, 0]}>
              <boxGeometry args={[length, 0.018, 0.022]} />
              <DetailMaterial color={index === 0 ? '#ffd21f' : '#69f6ff'} opacity={0.3} />
            </mesh>
          ))}
        </>
      )}

      {node.focusTheme === 'forensic' && (
        <>
          {[-0.48, -0.25, -0.02, 0.21, 0.44].map((z, index) => (
            <mesh key={`forensic-slab-${index}`} position={[0, 0.035 + index * 0.012, z]}>
              <boxGeometry args={[1.36 - index * 0.08, 0.035, 0.08]} />
              <DetailMaterial color={index % 2 ? color : '#f4f8ff'} opacity={0.3} />
            </mesh>
          ))}
          <mesh position={[0, 0.1, 0.66]}>
            <boxGeometry args={[1.44, 0.035, 0.045]} />
            <DetailMaterial color={color} opacity={0.46} />
          </mesh>
          {[-0.52, -0.16, 0.2, 0.56].map((x, index) => (
            <mesh key={`forensic-marker-${index}`} position={[x, 0.19, 0.66]}>
              <cylinderGeometry args={[0.055, 0.055, 0.22, 6]} />
              <DetailMaterial color={index === 2 ? '#ffd21f' : color} opacity={0.52} />
            </mesh>
          ))}
          <mesh position={[0.18, 0.11, -0.12]} rotation={[Math.PI / 2, 0, -0.72]}>
            <ringGeometry args={[0.18, 0.86, 96, 1, 0, Math.PI * 0.22]} />
            <meshBasicMaterial color={color} transparent opacity={0.18} side={DoubleSide} blending={AdditiveBlending} depthWrite={false} />
          </mesh>
          <mesh position={[0.48, 0.14, -0.24]} rotation={[0, -0.2, 0]}>
            <boxGeometry args={[0.035, 0.035, 0.82]} />
            <DetailMaterial color="#ffd21f" opacity={0.34} />
          </mesh>
        </>
      )}
    </group>
  )
}
