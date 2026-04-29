import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useAnimations, useGLTF } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import {
  Box3,
  type AnimationAction,
  type Group,
  type PerspectiveCamera,
  type PointLight,
  Vector3,
} from 'three'

const logoUrl = '/wmctf-logo.glb'

function frameCameraToLogoFace(camera: PerspectiveCamera, size: Vector3, obliqueRatio = 0.06) {
  const dimensions = [size.x, size.y, size.z]
  const thinAxis = dimensions.indexOf(Math.min(...dimensions))
  const axes = [new Vector3(1, 0, 0), new Vector3(0, 1, 0), new Vector3(0, 0, 1)]
  const inPlaneLargest = [...dimensions].sort((a, b) => a - b)[2] || 1
  const fovRad = (camera.fov * Math.PI) / 180
  const distance = ((inPlaneLargest / 2) / Math.tan(fovRad / 2)) * 1.1

  const position = axes[thinAxis].clone().multiplyScalar(distance)
  const obliqueA = (thinAxis + 1) % 3
  const obliqueB = (thinAxis + 2) % 3

  position.addScaledVector(axes[obliqueA], distance * obliqueRatio * 0.45)
  position.addScaledVector(axes[obliqueB], distance * obliqueRatio * 0.35)
  camera.position.copy(position)
  camera.lookAt(0, 0, 0)
  camera.updateProjectionMatrix()
}

function LogoModel() {
  const groupRef = useRef<Group>(null)
  const movingLightRef = useRef<PointLight>(null)
  const { camera } = useThree()
  const gltf = useGLTF(logoUrl)
  const logoScene = useMemo(() => {
    const clonedScene = gltf.scene.clone(true)
    const box = new Box3().setFromObject(clonedScene)
    const center = box.getCenter(new Vector3())
    clonedScene.position.sub(center)
    clonedScene.scale.multiplyScalar(1.35)

    clonedScene.traverse((child) => {
      if ('isMesh' in child && child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true
      }
    })

    return clonedScene
  }, [gltf.scene])
  const { actions } = useAnimations(gltf.animations, groupRef)

  useLayoutEffect(() => {
    const framedBox = new Box3().setFromObject(logoScene)
    frameCameraToLogoFace(camera as PerspectiveCamera, framedBox.getSize(new Vector3()), 0.055)
  }, [camera, logoScene])

  useEffect(() => {
    const activeActions = Object.values(actions).filter(
      (action): action is AnimationAction => action !== null,
    )
    activeActions.forEach((action) => action.reset().fadeIn(0.25).play())
    return () => activeActions.forEach((action) => action.fadeOut(0.2))
  }, [actions])

  useFrame(({ clock }) => {
    const elapsedTime = clock.getElapsedTime()

    if (movingLightRef.current) {
      movingLightRef.current.position.x = Math.sin(elapsedTime * 2) * 2.5
      movingLightRef.current.position.z = Math.cos(elapsedTime * 2) * 2.5
      movingLightRef.current.position.y = Math.sin(elapsedTime) * 2
    }

    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(elapsedTime * 0.62) * 0.055
      groupRef.current.rotation.x = Math.cos(elapsedTime * 0.48) * 0.025
    }
  })

  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight color="#ffffff" intensity={2.2} position={[0.3, 0.2, 4]} />
      <pointLight ref={movingLightRef} color="#ffffff" intensity={55} distance={12} />
      <group ref={groupRef}>
        <primitive object={logoScene} />
      </group>
    </>
  )
}

export function WmctfLogo() {
  return (
    <div className="screen-logo" aria-hidden>
      <Canvas
        camera={{ fov: 42, near: 0.1, far: 100, position: [0, 0, 5] }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        <Suspense fallback={null}>
          <LogoModel />
        </Suspense>
      </Canvas>
    </div>
  )
}

useGLTF.preload(logoUrl)
