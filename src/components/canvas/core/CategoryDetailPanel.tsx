import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  CanvasTexture,
  LinearFilter,
  MeshBasicMaterial,
  SRGBColorSpace,
  Vector3,
  type Group,
} from 'three'
import { challengeCatalog, type ChallengeItem } from './challengeCatalog'
import { getCategoryNodeByKey, type CategoryKey, type CategorySceneNode } from './coreSceneConfig'

function setFont(ctx: CanvasRenderingContext2D, size: number, weight = 700) {
  ctx.font = `${weight} ${size}px "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif`
}

function setMonoFont(ctx: CanvasRenderingContext2D, size: number, weight = 700) {
  ctx.font = `${weight} ${size}px "DIN Condensed", "Bahnschrift", "Arial Narrow", sans-serif`
}

function detailPanelPath(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const cut = 34
  ctx.beginPath()
  ctx.moveTo(cut, 0)
  ctx.lineTo(width - cut * 1.5, 0)
  ctx.lineTo(width, cut * 1.05)
  ctx.lineTo(width - 10, height - cut)
  ctx.lineTo(width - cut * 1.3, height)
  ctx.lineTo(cut * 0.9, height)
  ctx.lineTo(0, height - cut * 0.9)
  ctx.lineTo(10, cut)
  ctx.closePath()
}

function statusColor(status: ChallengeItem['status']) {
  if (status === 'solved') return '#69f6ff'
  if (status === 'hot') return '#ffd21f'
  return 'rgba(215, 230, 236, 0.46)'
}

function makeDetailTexture(node: CategorySceneNode, challenges: ChallengeItem[]) {
  const width = 1280
  const height = 820
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  ctx.clearRect(0, 0, width, height)
  ctx.save()
  detailPanelPath(ctx, width, height)
  ctx.clip()

  const fill = ctx.createLinearGradient(0, 0, width, height)
  fill.addColorStop(0, 'rgba(32, 56, 62, 0.92)')
  fill.addColorStop(0.45, 'rgba(7, 15, 19, 0.78)')
  fill.addColorStop(1, 'rgba(2, 7, 10, 0.96)')
  ctx.fillStyle = fill
  ctx.fillRect(0, 0, width, height)

  const glow = ctx.createRadialGradient(width * 0.24, 0, 8, width * 0.3, height * 0.1, width * 0.72)
  glow.addColorStop(0, `${node.accentColor}66`)
  glow.addColorStop(0.36, 'rgba(105, 246, 255, 0.12)')
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, width, height)

  ctx.strokeStyle = 'rgba(226, 246, 255, 0.08)'
  ctx.lineWidth = 1
  for (let y = 18; y < height; y += 14) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }
  for (let x = -120; x < width; x += 84) {
    ctx.beginPath()
    ctx.moveTo(x, height)
    ctx.lineTo(x + width * 0.28, 0)
    ctx.stroke()
  }
  ctx.restore()

  detailPanelPath(ctx, width, height)
  ctx.strokeStyle = 'rgba(234, 248, 255, 0.42)'
  ctx.lineWidth = 2
  ctx.stroke()
  detailPanelPath(ctx, width, height)
  ctx.strokeStyle = node.accentColor
  ctx.lineWidth = 5
  ctx.setLineDash([84, 18, 10, 18])
  ctx.stroke()
  ctx.setLineDash([])

  ctx.fillStyle = node.accentColor
  setMonoFont(ctx, 34, 900)
  ctx.fillText('CATEGORY FOCUS', 68, 72)

  ctx.fillStyle = '#f4fbff'
  setFont(ctx, 72, 900)
  ctx.fillText(node.name.toUpperCase(), 68, 154)
  ctx.fillStyle = 'rgba(224, 236, 242, 0.76)'
  setFont(ctx, 34, 800)
  ctx.fillText(`${node.label} / ${node.name.toUpperCase()} / ${node.focusTheme.toUpperCase()} TERRAIN`, 68, 204)

  ctx.fillStyle = 'rgba(5, 11, 14, 0.72)'
  ctx.fillRect(68, 252, width - 136, 68)
  ctx.strokeStyle = `${node.accentColor}88`
  ctx.strokeRect(68, 252, width - 136, 68)
  ctx.fillStyle = 'rgba(218, 230, 236, 0.7)'
  setMonoFont(ctx, 28, 800)
  ctx.fillText(`${String(challenges.length).padStart(2, '0')} CHALLENGES`, 96, 295)
  ctx.textAlign = 'right'
  ctx.fillText('DIFFICULTY / POINTS / STATUS', width - 96, 295)
  ctx.textAlign = 'left'

  challenges.forEach((challenge, index) => {
    const y = 396 + index * 86
    ctx.fillStyle = index % 2 === 0 ? 'rgba(255, 255, 255, 0.035)' : 'rgba(105, 246, 255, 0.035)'
    ctx.fillRect(68, y - 52, width - 136, 68)
    ctx.strokeStyle = 'rgba(226, 246, 255, 0.12)'
    ctx.strokeRect(68, y - 52, width - 136, 68)

    ctx.fillStyle = statusColor(challenge.status)
    ctx.beginPath()
    ctx.arc(106, y - 14, 11, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#f4fbff'
    setFont(ctx, 38, 900)
    ctx.fillText(challenge.title, 144, y)

    ctx.fillStyle = 'rgba(224, 236, 242, 0.74)'
    setMonoFont(ctx, 30, 800)
    ctx.textAlign = 'right'
    ctx.fillText(challenge.difficulty.toUpperCase(), width - 430, y)
    ctx.fillStyle = '#fff2a6'
    ctx.fillText(String(challenge.points), width - 260, y)
    ctx.fillStyle = statusColor(challenge.status)
    ctx.fillText(challenge.status.toUpperCase(), width - 96, y)
    ctx.textAlign = 'left'
  })

  ctx.fillStyle = 'rgba(215, 230, 236, 0.62)'
  setFont(ctx, 30, 700)
  ctx.fillText('ESC / 点击空白返回总览', 68, height - 58)
  ctx.fillStyle = node.accentColor
  setMonoFont(ctx, 30, 900)
  ctx.textAlign = 'right'
  ctx.fillText('RETURN OVERVIEW', width - 68, height - 58)
  ctx.textAlign = 'left'

  return canvas
}

export function CategoryDetailPanel({
  activeCategory,
  onClearCategory,
}: {
  activeCategory: CategoryKey | null
  onClearCategory: () => void
}) {
  const group = useRef<Group>(null)
  const panelMaterial = useRef<MeshBasicMaterial>(null)
  const glowMaterial = useRef<MeshBasicMaterial>(null)
  const buttonMaterial = useRef<MeshBasicMaterial>(null)
  const opacity = useRef(0)
  const forward = useMemo(() => new Vector3(), [])
  const right = useMemo(() => new Vector3(), [])
  const up = useMemo(() => new Vector3(), [])

  const node = activeCategory ? getCategoryNodeByKey(activeCategory) : null
  const texture = useMemo(() => {
    if (!node || !activeCategory) return null
    const nextTexture = new CanvasTexture(makeDetailTexture(node, challengeCatalog[activeCategory]))
    nextTexture.colorSpace = SRGBColorSpace
    nextTexture.minFilter = LinearFilter
    nextTexture.magFilter = LinearFilter
    nextTexture.needsUpdate = true
    return nextTexture
  }, [activeCategory, node])

  useEffect(() => () => texture?.dispose(), [texture])

  useFrame((state) => {
    opacity.current += ((node ? 1 : 0) - opacity.current) * 0.08
    if (panelMaterial.current) panelMaterial.current.opacity = opacity.current * 0.96
    if (glowMaterial.current) glowMaterial.current.opacity = opacity.current * 0.12
    if (buttonMaterial.current) buttonMaterial.current.opacity = opacity.current * 0.82
    if (!group.current || !node) return

    state.camera.getWorldDirection(forward)
    right.crossVectors(forward, state.camera.up).normalize()
    up.copy(state.camera.up).normalize()
    group.current.position
      .copy(state.camera.position)
      .add(forward.multiplyScalar(3.82))
      .add(right.multiplyScalar(1.1))
      .add(up.multiplyScalar(-0.1 + opacity.current * 0.03))
    group.current.quaternion.copy(state.camera.quaternion)
  })

  if (!node || !texture) return null

  return (
    <group
      ref={group}
      renderOrder={100}
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <mesh renderOrder={102}>
        <planeGeometry args={[2.12, 1.36]} />
        <meshBasicMaterial
          ref={panelMaterial}
          map={texture}
          transparent
          opacity={0}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, 0, -0.03]} renderOrder={101}>
        <planeGeometry args={[2.3, 1.52]} />
        <meshBasicMaterial
          ref={glowMaterial}
          color={node.accentColor}
          transparent
          opacity={0}
          blending={AdditiveBlending}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
      <mesh
        position={[0.69, -0.53, 0.026]}
        renderOrder={103}
        onClick={(event) => {
          event.stopPropagation()
          onClearCategory()
        }}
        onPointerOver={(event) => {
          event.stopPropagation()
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          document.body.style.cursor = ''
        }}
      >
        <planeGeometry args={[0.46, 0.15]} />
        <meshBasicMaterial
          ref={buttonMaterial}
          color={node.accentColor}
          transparent
          opacity={0}
          blending={AdditiveBlending}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}
