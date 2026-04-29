import { useMemo, useRef, useState, type RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import { PerspectiveCamera, Vector3, type Group } from 'three'
import { ChallengeAtlasDecor } from './ChallengeAtlasDecor'
import { ChallengeCore } from './ChallengeCore'
import { ChallengeDetailCard } from './ChallengeDetailCard'
import { ChallengeDifficultyRings } from './ChallengeDifficultyRings'
import { ChallengeNodes } from './ChallengeNodes'
import { ChallengeSector } from './ChallengeSector'
import {
  challengeCategories,
  challengeData,
  getCategoryAngle,
} from './challengeData'
import type { Challenge, ChallengeCategory } from './challengeTypes'

function ChallengeAtlasCameraRig({
  activeCategory,
  atlasGroup,
  selectedChallenge,
}: {
  activeCategory: ChallengeCategory | null
  atlasGroup: RefObject<Group | null>
  selectedChallenge: Challenge | null
}) {
  const camera = useThree((state) => state.camera as PerspectiveCamera)
  const lookAt = useRef(new Vector3(0, 0.1, 0))
  const targetPosition = useMemo(() => new Vector3(), [])
  const targetLookAt = useMemo(() => new Vector3(), [])

  useFrame((state) => {
    const { pointer } = state
    void activeCategory
    void atlasGroup
    void selectedChallenge

    targetPosition.set(
      pointer.x * 0.42,
      3.62 + pointer.y * 0.2,
      9.48 - pointer.y * 0.12,
    )
    targetLookAt.set(pointer.x * 0.46, 0.08 + pointer.y * 0.16, -0.08)
    camera.fov += (41 - camera.fov) * 0.07
    camera.position.lerp(targetPosition, 0.055)
    lookAt.current.lerp(targetLookAt, 0.065)
    camera.lookAt(lookAt.current)
    camera.updateProjectionMatrix()
  })

  return null
}

function CategoryFocusStats({
  activeCategory,
  challenges,
}: {
  activeCategory: ChallengeCategory | null
  challenges: Challenge[]
}) {
  if (!activeCategory) return null
  const items = challenges.filter((challenge) => challenge.category === activeCategory)
  const solved = items.filter((challenge) => challenge.status === 'solved').length
  const hot = items.filter((challenge) => challenge.status === 'hot').length
  const angle = getCategoryAngle(activeCategory)
  return (
    <group position={[Math.cos(angle) * 2.9, 0.62, Math.sin(angle) * 2.9]} rotation={[-0.74, 0, angle + Math.PI / 2]}>
      <Text color="#f4fbff" fontSize={0.18} fontWeight={900} textAlign="center">
        {`${activeCategory.toUpperCase()}  ${items.length}题  已解${solved}  热门${hot}`}
      </Text>
    </group>
  )
}

export function ChallengeAtlas({
  activeCategory,
  onClearCategory,
  onSelectCategory,
  onSelectChallenge,
  selectedChallenge,
}: {
  activeCategory: ChallengeCategory | null
  onClearCategory: () => void
  onSelectCategory: (category: ChallengeCategory) => void
  onSelectChallenge: (challenge: Challenge) => void
  selectedChallenge: Challenge | null
}) {
  const atlasGroup = useRef<Group>(null)
  const mapGroup = useRef<Group>(null)
  const [hoverCategory, setHoverCategory] = useState<ChallengeCategory | null>(null)
  const challenges = useMemo(() => challengeData, [])

  useFrame((state) => {
    if (!mapGroup.current) return
    const dampen = activeCategory || selectedChallenge ? 0.12 : 1
    mapGroup.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.16) * 0.018 * dampen
    mapGroup.current.position.y = Math.sin(state.clock.elapsedTime * 0.64) * 0.016
  })

  return (
    <>
      <ChallengeAtlasCameraRig
        activeCategory={activeCategory}
        atlasGroup={atlasGroup}
        selectedChallenge={selectedChallenge}
      />
      <group
        ref={atlasGroup}
        scale={[0.86, 1, 0.72]}
        position={[0, 0.42, -0.12]}
        rotation={[0.53, 0, 0]}
        onClick={() => {
          if (activeCategory || selectedChallenge) onClearCategory()
        }}
      >
        <group ref={mapGroup}>
          <ChallengeAtlasDecor activeCategory={activeCategory} />
          <ChallengeDifficultyRings activeCategory={activeCategory} />
          {challengeCategories.map((category) => (
            <ChallengeSector
              key={category.key}
              activeCategory={activeCategory}
              category={category.key}
              hoverCategory={hoverCategory}
              onHoverCategory={setHoverCategory}
              onSelectCategory={onSelectCategory}
            />
          ))}
          <ChallengeNodes
            activeCategory={activeCategory}
            challenges={challenges}
            onSelectChallenge={onSelectChallenge}
            selectedChallenge={selectedChallenge}
          />
          <ChallengeCore />
          <CategoryFocusStats activeCategory={activeCategory} challenges={challenges} />
        </group>
      </group>
      <ChallengeDetailCard selectedChallenge={selectedChallenge} />
    </>
  )
}
