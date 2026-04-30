import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  BufferGeometry,
  CanvasTexture,
  DoubleSide,
  Float32BufferAttribute,
  LinearFilter,
  LineBasicMaterial,
  MeshBasicMaterial,
  Quaternion,
  SRGBColorSpace,
  Vector3,
  type Group,
} from 'three'
import { getCategoryMeta } from './challengeData'
import type { Challenge } from './challengeTypes'
import { challengeVisualConfig } from './challengeVisualConfig'

function setFont(ctx: CanvasRenderingContext2D, size: number, weight = 700) {
  ctx.font = `${weight} ${size}px "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif`
}

function setMonoFont(ctx: CanvasRenderingContext2D, size: number, weight = 700) {
  ctx.font = `${weight} ${size}px "DIN Condensed", "Bahnschrift", "Arial Narrow", sans-serif`
}

function panelPath(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const cut = 24
  ctx.beginPath()
  ctx.moveTo(cut, 0)
  ctx.lineTo(width - cut * 1.35, 0)
  ctx.lineTo(width, cut)
  ctx.lineTo(width - 8, height - cut * 0.72)
  ctx.lineTo(width - cut * 1.48, height)
  ctx.lineTo(cut * 0.72, height)
  ctx.lineTo(0, height - cut)
  ctx.lineTo(8, cut * 0.82)
  ctx.closePath()
}

function makeChallengeTexture(challenge: Challenge) {
  const width = 760
  const height = 360
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  const meta = getCategoryMeta(challenge.category)
  const first = challenge.bloods?.first ?? challenge.firstBloodTeam ?? '尚未产生'
  const second = challenge.bloods?.second ?? '尚未产生'
  const third = challenge.bloods?.third ?? '尚未产生'

  ctx.clearRect(0, 0, width, height)
  ctx.save()
  panelPath(ctx, width, height)
  ctx.clip()
  const fill = ctx.createLinearGradient(0, 0, width, height)
  fill.addColorStop(0, 'rgba(24, 48, 54, 0.9)')
  fill.addColorStop(0.48, 'rgba(5, 13, 16, 0.82)')
  fill.addColorStop(1, 'rgba(2, 7, 10, 0.95)')
  ctx.fillStyle = fill
  ctx.fillRect(0, 0, width, height)
  const glow = ctx.createRadialGradient(width * 0.16, height * 0.16, 6, width * 0.18, height * 0.18, width * 0.52)
  glow.addColorStop(0, `${meta.accent}66`)
  glow.addColorStop(0.42, 'rgba(105, 246, 255, 0.12)')
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, width, height)
  ctx.globalAlpha = 0.5
  ctx.strokeStyle = 'rgba(224, 246, 255, 0.1)'
  for (let y = 12; y < height; y += 10) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }
  for (let x = -width * 0.2; x < width; x += 72) {
    ctx.beginPath()
    ctx.moveTo(x, height)
    ctx.lineTo(x + width * 0.34, 0)
    ctx.stroke()
  }
  ctx.restore()
  ctx.globalAlpha = 1

  panelPath(ctx, width, height)
  ctx.strokeStyle = 'rgba(234, 248, 255, 0.42)'
  ctx.lineWidth = 2
  ctx.stroke()
  panelPath(ctx, width, height)
  ctx.strokeStyle = meta.accent
  ctx.lineWidth = 5
  ctx.setLineDash([58, 16, 8, 16])
  ctx.stroke()
  ctx.setLineDash([])

  ctx.fillStyle = meta.accent
  setMonoFont(ctx, 25, 900)
  ctx.fillText('CHALLENGE NODE', 42, 52)
  ctx.fillStyle = '#f4fbff'
  setFont(ctx, 44, 900)
  ctx.fillText(challenge.title, 42, 108)
  ctx.fillStyle = 'rgba(224, 236, 242, 0.78)'
  setFont(ctx, 22, 800)
  ctx.fillText(`${meta.label.toUpperCase()} / ${challenge.difficulty.toUpperCase()} / ${challenge.points} PTS`, 42, 144)

  const rows = [
    ['1ST', first],
    ['2ND', second],
    ['3RD', third],
  ]
  rows.forEach(([label, value], index) => {
    const y = 202 + index * 44
    ctx.fillStyle = index === 0 ? '#fff2a6' : 'rgba(218, 230, 236, 0.68)'
    setMonoFont(ctx, 22, 900)
    ctx.fillText(label, 48, y)
    ctx.fillStyle = '#f4fbff'
    setFont(ctx, 25, 900)
    ctx.fillText(value, 128, y)
  })
  ctx.textAlign = 'right'
  ctx.fillStyle = challenge.status === 'hot' ? '#ffd21f' : meta.accent
  setMonoFont(ctx, 22, 900)
  ctx.fillText(challenge.status.toUpperCase(), width - 42, height - 34)
  ctx.textAlign = 'left'
  return canvas
}

function makeLineGeometry(side: number) {
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute([0, 0.06, 0, side * 0.28, 0.48, 0.02, side * 0.78, 0.78, 0.02], 3))
  return geometry
}

export function ChallengeNodeBillboard({
  challenge,
  lift = 0,
  nodePosition,
  scale = challengeVisualConfig.focus.billboardScale,
  visible,
}: {
  challenge: Challenge
  lift?: number
  nodePosition: readonly [number, number, number]
  scale?: number
  visible: boolean
}) {
  const group = useRef<Group>(null)
  const panelMaterial = useRef<MeshBasicMaterial>(null)
  const lineMaterial = useRef<LineBasicMaterial>(null)
  const parentWorldQuaternion = useMemo(() => new Quaternion(), [])
  const targetQuaternion = useMemo(() => new Quaternion(), [])
  const targetPosition = useMemo(() => new Vector3(), [])
  const side = nodePosition[0] > 0 ? -1 : 1
  const texture = useMemo(() => {
    const next = new CanvasTexture(makeChallengeTexture(challenge))
    next.colorSpace = SRGBColorSpace
    next.minFilter = LinearFilter
    next.magFilter = LinearFilter
    next.needsUpdate = true
    return next
  }, [challenge])
  const lineGeometry = useMemo(() => makeLineGeometry(side), [side])

  useEffect(
    () => () => {
      texture.dispose()
      lineGeometry.dispose()
    },
    [lineGeometry, texture],
  )

  useFrame((state) => {
    if (!group.current) return
    const pulse = Math.sin(state.clock.elapsedTime * 1.1 + nodePosition[0]) * 0.015
    targetPosition.set(nodePosition[0], nodePosition[1] + lift + pulse, nodePosition[2])
    group.current.position.lerp(targetPosition, 0.12)
    group.current.parent?.getWorldQuaternion(parentWorldQuaternion)
    targetQuaternion.copy(parentWorldQuaternion).invert().multiply(state.camera.quaternion)
    group.current.quaternion.slerp(targetQuaternion, 0.2)
    group.current.scale.setScalar(group.current.scale.x + ((visible ? scale : scale * 0.92) - group.current.scale.x) * 0.12)
    const opacity = visible ? 0.94 : 0
    if (panelMaterial.current) panelMaterial.current.opacity += (opacity - panelMaterial.current.opacity) * 0.16
    if (lineMaterial.current) lineMaterial.current.opacity += ((visible ? 0.34 : 0) - lineMaterial.current.opacity) * 0.16
  })

  return (
    <group ref={group} position={[nodePosition[0], nodePosition[1], nodePosition[2]]} renderOrder={48} raycast={() => undefined}>
      <line>
        <primitive attach="geometry" object={lineGeometry} />
        <lineBasicMaterial
          ref={lineMaterial}
          color={getCategoryMeta(challenge.category).accent}
          transparent
          opacity={0}
          blending={AdditiveBlending}
          depthTest={false}
          depthWrite={false}
        />
      </line>
      <mesh position={[side * 0.92, 0.9, 0.02]} renderOrder={49} raycast={() => undefined}>
        <planeGeometry args={[1.44, 0.68]} />
        <meshBasicMaterial
          ref={panelMaterial}
          map={texture}
          transparent
          opacity={0}
          side={DoubleSide}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}
