import { useMemo, useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { PerspectiveCamera, Vector3, type Group } from 'three'
import { getCategoryNodeByKey, terrainHeight, type CategoryKey } from './coreSceneConfig'

const overviewPosition = new Vector3(0, 3.62, 9.48)
const overviewLookAt = new Vector3(0, 0.08, -0.08)

function getFocusWorldPoint(activeCategory: CategoryKey, dataCoreGroup: RefObject<Group | null>) {
  const node = getCategoryNodeByKey(activeCategory)
  const localPoint = new Vector3(node.x, terrainHeight(node.x, node.z), node.z)
  return dataCoreGroup.current ? dataCoreGroup.current.localToWorld(localPoint.clone()) : localPoint
}

export function CameraRig({
  activeCategory,
  dataCoreGroup,
}: {
  activeCategory: CategoryKey | null
  dataCoreGroup: RefObject<Group | null>
}) {
  const lookAt = useRef(new Vector3(0, 0.08, -0.08))
  const targetPosition = useMemo(() => new Vector3(), [])
  const targetLookAt = useMemo(() => new Vector3(), [])

  useFrame((state) => {
    const camera = state.camera as PerspectiveCamera
    const { pointer } = state

    if (activeCategory) {
      const focusWorld = getFocusWorldPoint(activeCategory, dataCoreGroup)
      const side = activeCategory === 'web' || activeCategory === 'forensics' ? -1 : 1
      targetPosition.copy(focusWorld).add(new Vector3(side * 1.05 + pointer.x * 0.05, 2.72 + pointer.y * 0.04, 5.1))
      targetLookAt.copy(focusWorld).add(new Vector3(side * 0.18 + pointer.x * 0.02, 0.42 + pointer.y * 0.02, -0.22))
      camera.fov += (39.6 - camera.fov) * 0.065
    } else {
      targetPosition.set(
        overviewPosition.x + pointer.x * 0.42,
        overviewPosition.y + pointer.y * 0.2,
        overviewPosition.z - pointer.y * 0.12,
      )
      targetLookAt.set(pointer.x * 0.46, overviewLookAt.y + pointer.y * 0.16, overviewLookAt.z)
      camera.fov += (41 - camera.fov) * 0.07
    }

    camera.position.lerp(targetPosition, activeCategory ? 0.062 : 0.055)
    lookAt.current.lerp(targetLookAt, activeCategory ? 0.07 : 0.065)
    camera.lookAt(lookAt.current)
    camera.updateProjectionMatrix()
  })

  return null
}
