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
import { challengeCategories, challengeData, getCategoryAngle, getChallengePosition } from './challengeData'
import type { Challenge, ChallengeCategory, ChallengeViewMode } from './challengeTypes'

const ATLAS_SPIN_PERIOD = 115
const MAP_SCALE = 1.28

function ChallengeAtlasCameraRig({
  activeCategory,
  atlasGroup,
  autoplayFocusChallenge,
  selectedChallenge,
  viewMode,
}: {
  activeCategory: ChallengeCategory | null
  atlasGroup: RefObject<Group | null>
  autoplayFocusChallenge: Challenge | null
  selectedChallenge: Challenge | null
  viewMode: ChallengeViewMode
}) {
  const camera = useThree((state) => state.camera as PerspectiveCamera)
  const lookAt = useRef(new Vector3(0, 0.14, 0))
  const targetPosition = useMemo(() => new Vector3(), [])
  const targetLookAt = useMemo(() => new Vector3(), [])
  const tmpVec = useMemo(() => new Vector3(), [])
  const tmpFocus = useMemo(() => new Vector3(), [])
  const overviewBase = useMemo(() => new Vector3(0, 3.55, 9.35), [])

  /* eslint-disable react-hooks/immutability -- R3F / Three.js camera is updated each frame */
  useFrame((state) => {
    const { pointer } = state
    const elapsed = state.clock.elapsedTime
    const group = atlasGroup.current

    const focusChallenge =
      viewMode === 'manual-challenge' && selectedChallenge
        ? selectedChallenge
        : viewMode === 'autoplay-focus' && autoplayFocusChallenge
          ? autoplayFocusChallenge
          : null

    if (focusChallenge && group) {
      const lp = getChallengePosition(focusChallenge, challengeData)
      tmpFocus.set(lp[0], lp[1], lp[2]).applyMatrix4(group.matrixWorld)
      const horizontalAngle = Math.atan2(tmpFocus.x, tmpFocus.z) + 0.42
      const dist = 5.35
      targetPosition.set(
        tmpFocus.x + Math.sin(horizontalAngle) * dist,
        tmpFocus.y + 2.72,
        tmpFocus.z + Math.cos(horizontalAngle) * dist,
      )
      targetLookAt.copy(tmpFocus).add(tmpVec.set(0, 0.22, 0))
    } else if (viewMode === 'manual-category' && activeCategory && group) {
      const angle = getCategoryAngle(activeCategory)
      const radius = 2.65
      tmpFocus.set(Math.cos(angle) * radius, 0.38, Math.sin(angle) * radius).applyMatrix4(group.matrixWorld)
      const side = 0.55
      targetPosition.set(
        tmpFocus.x + Math.sin(angle + Math.PI / 2) * side + Math.sin(angle) * 4.4,
        3.05,
        tmpFocus.z + Math.cos(angle + Math.PI / 2) * side + Math.cos(angle) * 4.4,
      )
      targetLookAt.copy(tmpFocus).add(tmpVec.set(0, 0.18, 0))
    } else {
      const breathe = Math.sin(elapsed * 0.31) * 0.11
      const sway = Math.cos(elapsed * 0.27) * 0.1
      const rise = Math.sin(elapsed * 0.19) * 0.06
      targetPosition.set(
        overviewBase.x + breathe + pointer.x * 0.28,
        overviewBase.y + rise + pointer.y * 0.14,
        overviewBase.z + sway + pointer.y * 0.08,
      )
      targetLookAt.set(pointer.x * 0.38, 0.11 + pointer.y * 0.12 + Math.sin(elapsed * 0.23) * 0.03, -0.06 + pointer.y * 0.06)
    }

    camera.fov += (41 - camera.fov) * 0.05
    camera.position.lerp(targetPosition, 0.066)
    lookAt.current.lerp(targetLookAt, 0.072)
    camera.lookAt(lookAt.current)
    camera.updateProjectionMatrix()
  })
  /* eslint-enable react-hooks/immutability */

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
    <group position={[Math.cos(angle) * 3.35, 0.72, Math.sin(angle) * 3.35]} rotation={[-0.74, 0, angle + Math.PI / 2]}>
      <Text color="#f4fbff" fontSize={0.2} fontWeight={900} textAlign="center">
        {`${activeCategory.toUpperCase()}  ${items.length}题  已解${solved}  热门${hot}`}
      </Text>
    </group>
  )
}

export function ChallengeAtlas({
  activeCategory,
  autoplayFocusChallenge,
  detailChallenge,
  onClearCategory,
  onCategoryManual,
  onChallengeManual,
  selectedChallenge,
  viewMode,
}: {
  activeCategory: ChallengeCategory | null
  autoplayFocusChallenge: Challenge | null
  detailChallenge: Challenge | null
  onClearCategory: () => void
  onCategoryManual: (category: ChallengeCategory) => void
  onChallengeManual: (challenge: Challenge) => void
  selectedChallenge: Challenge | null
  viewMode: ChallengeViewMode
}) {
  const atlasGroup = useRef<Group>(null)
  const mapGroup = useRef<Group>(null)
  const atlasSpinRef = useRef<Group>(null)
  const [hoverCategory, setHoverCategory] = useState<ChallengeCategory | null>(null)
  const [, setHoverChallengeId] = useState<string | null>(null)
  const challenges = useMemo(() => challengeData, [])

  const categoryLabelsVerbose = viewMode === 'manual-category' && Boolean(activeCategory)
  const autoplayFocusId =
    viewMode === 'autoplay-focus' && !selectedChallenge ? autoplayFocusChallenge?.id ?? null : null

  useFrame((state) => {
    if (!mapGroup.current) return
    const manual = viewMode === 'manual-category' || viewMode === 'manual-challenge'
    const dampen = activeCategory || selectedChallenge ? 0.12 : 1
    mapGroup.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.16) * 0.018 * dampen
    mapGroup.current.position.y = Math.sin(state.clock.elapsedTime * 0.64) * 0.016
    if (atlasSpinRef.current) {
      const spin = manual ? state.clock.elapsedTime * 0.004 : state.clock.elapsedTime * ((Math.PI * 2) / ATLAS_SPIN_PERIOD)
      atlasSpinRef.current.rotation.y = spin
    }
  })

  return (
    <>
      <ChallengeAtlasCameraRig
        activeCategory={activeCategory}
        atlasGroup={atlasGroup}
        autoplayFocusChallenge={autoplayFocusChallenge}
        selectedChallenge={selectedChallenge}
        viewMode={viewMode}
      />
      <group
        ref={atlasGroup}
        scale={[0.86 * MAP_SCALE, MAP_SCALE, 0.72 * MAP_SCALE]}
        position={[0, 0.48, -0.06]}
        rotation={[0.53, 0, 0]}
        onClick={() => {
          if (activeCategory || selectedChallenge) onClearCategory()
        }}
      >
        <group ref={mapGroup}>
          <group ref={atlasSpinRef}>
            <ChallengeAtlasDecor activeCategory={activeCategory} />
            <ChallengeDifficultyRings activeCategory={activeCategory} />
            {challengeCategories.map((category) => (
              <ChallengeSector
                key={category.key}
                activeCategory={activeCategory}
                category={category.key}
                hoverCategory={hoverCategory}
                labelVerbose={categoryLabelsVerbose}
                onHoverCategory={setHoverCategory}
                onSelectCategory={onCategoryManual}
              />
            ))}
            <ChallengeNodes
              activeCategory={activeCategory}
              autoplayFocusId={autoplayFocusId}
              categoryLabelsVerbose={categoryLabelsVerbose}
              challenges={challenges}
              onHoverChallenge={setHoverChallengeId}
              onSelectChallenge={onChallengeManual}
              selectedChallenge={selectedChallenge}
              viewMode={viewMode}
            />
            <ChallengeCore />
            <CategoryFocusStats activeCategory={activeCategory} challenges={challenges} />
          </group>
        </group>
      </group>
      <ChallengeDetailCard detailChallenge={detailChallenge} />
    </>
  )
}
