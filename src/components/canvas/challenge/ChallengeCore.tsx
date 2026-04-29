import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import { AdditiveBlending, type Group } from 'three'

export function ChallengeCore() {
  const ringA = useRef<Group>(null)
  const ringB = useRef<Group>(null)
  const scan = useRef<Group>(null)

  useFrame((state) => {
    const elapsed = state.clock.elapsedTime
    if (ringA.current) ringA.current.rotation.y = elapsed * 0.42
    if (ringB.current) ringB.current.rotation.y = -elapsed * 0.32
    if (scan.current) {
      scan.current.rotation.y = elapsed * 0.18
      const scale = 1 + Math.sin(elapsed * 1.4) * 0.04
      scan.current.scale.setScalar(scale)
    }
  })

  return (
    <group position={[0, 0.08, 0]}>
      <mesh position={[0, 0.04, 0]}>
        <cylinderGeometry args={[0.86, 0.98, 0.16, 64]} />
        <meshStandardMaterial
          color="#07161b"
          emissive="#69f6ff"
          emissiveIntensity={0.18}
          metalness={0.76}
          roughness={0.32}
        />
      </mesh>
      <mesh position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.56, 0.72, 0.18, 48]} />
        <meshStandardMaterial
          color="#0b2027"
          emissive="#69f6ff"
          emissiveIntensity={0.28}
          metalness={0.82}
          roughness={0.24}
        />
      </mesh>
      <group ref={ringA} position={[0, 0.31, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.72, 0.018, 8, 96]} />
          <meshBasicMaterial color="#69f6ff" transparent opacity={0.72} blending={AdditiveBlending} />
        </mesh>
        {Array.from({ length: 8 }, (_, index) => {
          const angle = (index / 8) * Math.PI * 2
          return (
            <mesh
              key={angle}
              position={[Math.cos(angle) * 0.72, 0, Math.sin(angle) * 0.72]}
              rotation={[0, -angle, 0]}
            >
              <boxGeometry args={[0.16, 0.035, 0.035]} />
              <meshBasicMaterial color={index % 2 === 0 ? '#ffd21f' : '#9bddff'} transparent opacity={0.82} />
            </mesh>
          )
        })}
      </group>
      <group ref={ringB} position={[0, 0.46, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.42, 0.015, 8, 80]} />
          <meshBasicMaterial color="#ffd21f" transparent opacity={0.68} blending={AdditiveBlending} />
        </mesh>
      </group>
      <mesh position={[0, 0.54, 0]}>
        <octahedronGeometry args={[0.22, 0]} />
        <meshStandardMaterial
          color="#ffd21f"
          emissive="#ffd21f"
          emissiveIntensity={1.15}
          metalness={0.5}
          roughness={0.2}
          transparent
          opacity={0.96}
        />
      </mesh>
      <group ref={scan} position={[0, 0.08, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.02, 1.08, 96]} />
          <meshBasicMaterial color="#69f6ff" transparent opacity={0.16} blending={AdditiveBlending} depthWrite={false} />
        </mesh>
      </group>
      <Text
        color="#f4fbff"
        fontSize={0.13}
        fontWeight={900}
        position={[0, 0.79, 0]}
        textAlign="center"
      >
        CHALLENGE CORE
      </Text>
    </group>
  )
}
