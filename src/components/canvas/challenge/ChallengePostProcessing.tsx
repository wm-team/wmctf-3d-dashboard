import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import { Vector2 } from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js'
import { challengeVisualConfig } from './challengeVisualConfig'

export function ChallengePostProcessing() {
  const { camera, gl, scene, size } = useThree()
  const pipeline = useMemo(() => {
    const composer = new EffectComposer(gl)
    const renderPass = new RenderPass(scene, camera)
    const bloomPass = new UnrealBloomPass(
      new Vector2(size.width, size.height),
      challengeVisualConfig.postprocessing.bloomStrength,
      challengeVisualConfig.postprocessing.bloomRadius,
      challengeVisualConfig.postprocessing.bloomThreshold,
    )
    const fxaaPass = new ShaderPass(FXAAShader)

    composer.addPass(renderPass)
    composer.addPass(bloomPass)
    composer.addPass(fxaaPass)

    return { bloomPass, composer, fxaaPass }
  }, [camera, gl, scene, size.height, size.width])

  useEffect(() => {
    const pixelRatio = Math.min(gl.getPixelRatio(), 2)
    pipeline.composer.setPixelRatio(pixelRatio)
    pipeline.composer.setSize(size.width, size.height)
    pipeline.bloomPass.setSize(size.width, size.height)
    pipeline.fxaaPass.material.uniforms.resolution.value.set(
      1 / Math.max(size.width * pixelRatio, 1),
      1 / Math.max(size.height * pixelRatio, 1),
    )
  }, [gl, pipeline, size.height, size.width])

  useEffect(
    () => () => {
      pipeline.composer.dispose()
    },
    [pipeline],
  )

  useFrame((_, delta) => {
    pipeline.composer.render(delta)
  }, 1)

  return null
}
