import { Billboard, Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import { AdditiveBlending, type Group } from 'three'
import { ChallengeCoreShell } from './ChallengeModelSet'

export function ChallengeCore({
  hot,
  solved,
  total,
}: {
  hot: number
  solved: number
  total: number
}) {
  const rings = useRef<Group>(null)
  const crystal = useRef<Group>(null)

  useFrame((state) => {
    const elapsed = state.clock.elapsedTime
    if (rings.current) {
      rings.current.rotation.y = elapsed * 0.28
      rings.current.scale.setScalar(1 + Math.sin(elapsed * 1.1) * 0.025)
    }
    if (crystal.current) {
      crystal.current.rotation.y = -elapsed * 0.18
      crystal.current.position.y = 0.48 + Math.sin(elapsed * 0.7) * 0.025
    }
  })

  return (
    <group position={[0, 0.12, 0]} raycast={() => undefined}>
      <ChallengeCoreShell intensity={1 + hot / Math.max(total, 1)} />
      <group ref={rings}>
        {[0.52, 0.76, 1.02].map((radius, index) => (
          <mesh key={radius} rotation={[Math.PI / 2, 0, index * 0.18]}>
            <torusGeometry args={[radius, 0.01 + index * 0.002, 8, 96]} />
            <meshBasicMaterial
              color={index === 1 ? '#ffd21f' : '#69f6ff'}
              transparent
              opacity={0.32 - index * 0.045}
              blending={AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        ))}
      </group>
      <group ref={crystal} position={[0, 0.48, 0]}>
        <mesh>
          <octahedronGeometry args={[0.24, 0]} />
          <meshStandardMaterial
            color="#0b2027"
            emissive="#69f6ff"
            emissiveIntensity={0.72}
            metalness={0.72}
            roughness={0.22}
            transparent
            opacity={0.92}
          />
        </mesh>
      </group>
      <Billboard follow position={[0, 0.86, 0]}>
        <Text
          anchorX="center"
          anchorY="middle"
          color="#f4fbff"
          fontSize={0.13}
          fontWeight={900}
          outlineColor="#05090c"
          outlineWidth={0.006}
          textAlign="center"
        >
          CHALLENGE CORE
        </Text>
        <Text
          anchorX="center"
          anchorY="middle"
          color="#9bddff"
          fontSize={0.085}
          fontWeight={900}
          outlineColor="#05090c"
          outlineWidth={0.004}
          position={[0, 0.17, 0]}
          textAlign="center"
        >
          {`${total} TOTAL / ${solved} SOLVED / ${hot} HOT`}
        </Text>
      </Billboard>
    </group>
  )
}
