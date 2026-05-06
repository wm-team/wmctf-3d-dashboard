import { Billboard, Text } from '@react-three/drei'
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
  return (
    <group position={[0, 0.12, 0]} raycast={() => undefined}>
      <ChallengeCoreShell intensity={1 + hot / Math.max(total, 1)} />
      <Billboard follow position={[0, 1.12, 0]}>
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
