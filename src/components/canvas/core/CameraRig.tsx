import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { PerspectiveCamera, Vector3 } from 'three'
import { getCategoryNodeByKey, type CategoryKey } from './coreSceneConfig'

const overviewPosition = new Vector3(0, 3.62, 9.48)
const overviewLookAt = new Vector3(0, 0.08, -0.08)

const focusOffsets: Record<CategoryKey, [number, number, number]> = {
  web: [0.8, 2.25, 2.8],
  pwn: [-0.2, 2.35, 2.9],
  rev: [-0.7, 2.15, 2.65],
  crypto: [-0.9, 2.2, 2.7],
  misc: [0.1, 2.1, 2.6],
  forensics: [0.75, 2.25, 2.75],
}

export function CameraRig({ activeCategory }: { activeCategory: CategoryKey | null }) {
  const lookAt = useRef(new Vector3(0, 0.08, -0.08))
  const targetPosition = useMemo(() => new Vector3(), [])
  const targetLookAt = useMemo(() => new Vector3(), [])

  useFrame((state) => {
    const camera = state.camera as PerspectiveCamera
    const { pointer } = state

    if (activeCategory) {
      const node = getCategoryNodeByKey(activeCategory)
      const offset = focusOffsets[activeCategory]
      targetPosition.set(
        node.x + offset[0] + pointer.x * 0.06,
        offset[1] + pointer.y * 0.04,
        node.z + offset[2],
      )
      targetLookAt.set(node.x + pointer.x * 0.025, 0.36 + pointer.y * 0.02, node.z - 0.04)
      camera.fov += (35.5 - camera.fov) * 0.07
    } else {
      targetPosition.set(
        overviewPosition.x + pointer.x * 0.42,
        overviewPosition.y + pointer.y * 0.2,
        overviewPosition.z - pointer.y * 0.12,
      )
      targetLookAt.set(pointer.x * 0.46, overviewLookAt.y + pointer.y * 0.16, overviewLookAt.z)
      camera.fov += (41 - camera.fov) * 0.07
    }

    camera.position.lerp(targetPosition, activeCategory ? 0.075 : 0.055)
    lookAt.current.lerp(targetLookAt, activeCategory ? 0.085 : 0.065)
    camera.lookAt(lookAt.current)
    camera.updateProjectionMatrix()
  })

  return null
}
