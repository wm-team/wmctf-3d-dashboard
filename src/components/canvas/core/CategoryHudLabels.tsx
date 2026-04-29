import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  BufferGeometry,
  CanvasTexture,
  Float32BufferAttribute,
  LinearFilter,
  SRGBColorSpace,
  type Group,
} from 'three'
import type { CategoryStat, CtfSnapshot } from '@/types/ctf'
import { getCategoryNode, terrainHeight, type CategoryKey, type CategorySceneNode } from './coreSceneConfig'

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

function makeCategoryTexture(category: CategoryStat, node: CategorySceneNode, index: number) {
  const width = 640
  const height = 228
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  ctx.clearRect(0, 0, width, height)
  ctx.save()
  panelPath(ctx, width, height)
  ctx.clip()

  const fill = ctx.createLinearGradient(0, 0, width, height)
  fill.addColorStop(0, 'rgba(32, 54, 60, 0.82)')
  fill.addColorStop(0.42, 'rgba(6, 15, 18, 0.62)')
  fill.addColorStop(1, 'rgba(2, 7, 10, 0.92)')
  ctx.fillStyle = fill
  ctx.fillRect(0, 0, width, height)

  const glow = ctx.createRadialGradient(width * 0.18, height * 0.12, 4, width * 0.22, height * 0.18, width * 0.58)
  glow.addColorStop(0, `${node.color}66`)
  glow.addColorStop(0.42, 'rgba(105, 246, 255, 0.13)')
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, width, height)

  ctx.globalAlpha = 0.52
  ctx.strokeStyle = 'rgba(224, 246, 255, 0.1)'
  ctx.lineWidth = 1
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
  ctx.globalAlpha = 1
  ctx.restore()

  panelPath(ctx, width, height)
  ctx.strokeStyle = 'rgba(234, 248, 255, 0.45)'
  ctx.lineWidth = 2
  ctx.stroke()
  panelPath(ctx, width, height)
  ctx.strokeStyle = `${node.color}aa`
  ctx.lineWidth = 5
  ctx.setLineDash([54, 16, 8, 16])
  ctx.stroke()
  ctx.setLineDash([])

  ctx.fillStyle = `${node.color}f2`
  setMonoFont(ctx, 38, 900)
  ctx.fillText(String(index + 1).padStart(2, '0'), 42, 62)

  ctx.fillStyle = '#f4fbff'
  setFont(ctx, 42, 900)
  ctx.fillText(category.name.toUpperCase(), 122, 64)

  ctx.fillStyle = 'rgba(218, 230, 236, 0.74)'
  setFont(ctx, 22, 700)
  ctx.fillText(node.label, 124, 98)

  ctx.strokeStyle = `${node.color}d8`
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(42, 124)
  ctx.lineTo(width - 48, 124)
  ctx.stroke()

  ctx.fillStyle = '#fff5ba'
  setMonoFont(ctx, 52, 900)
  ctx.fillText(String(category.solved), 42, 184)
  ctx.fillStyle = 'rgba(219, 230, 235, 0.8)'
  setFont(ctx, 23, 800)
  ctx.fillText('SOLVED', 118, 181)

  ctx.fillStyle = '#ecfbff'
  setMonoFont(ctx, 40, 900)
  ctx.fillText(`${category.percent}%`, 244, 184)

  ctx.textAlign = 'right'
  ctx.fillStyle = 'rgba(178, 205, 214, 0.64)'
  setMonoFont(ctx, 18, 800)
  ctx.fillText('CTF NODE TELEMETRY', width - 44, 184)
  ctx.textAlign = 'left'

  return canvas
}

function CategoryHudLabel({
  activeCategory,
  category,
  hoverCategory,
  index,
  node,
  onHoverCategory,
  onSelectCategory,
}: {
  activeCategory: CategoryKey | null
  category: CategoryStat
  hoverCategory: CategoryKey | null
  index: number
  node: CategorySceneNode
  onHoverCategory: (key: CategoryKey | null) => void
  onSelectCategory: (key: CategoryKey) => void
}) {
  const group = useRef<Group>(null)
  const texture = useMemo(() => {
    const nextTexture = new CanvasTexture(makeCategoryTexture(category, node, index))
    nextTexture.colorSpace = SRGBColorSpace
    nextTexture.minFilter = LinearFilter
    nextTexture.magFilter = LinearFilter
    nextTexture.needsUpdate = true
    return nextTexture
  }, [category, index, node])
  const lineGeometry = useMemo(() => {
    const side = node.calloutPosition[0] < 0 ? -1 : 1
    const anchorY = terrainHeight(node.x, node.z) + 0.35
    const edgeX = node.calloutPosition[0] - side * 0.98
    const elbowX = node.x + side * 0.62
    const points = new Float32Array([
      node.x,
      anchorY,
      node.z,
      elbowX,
      node.calloutPosition[1] - 0.06,
      node.z + 0.05,
      edgeX,
      node.calloutPosition[1],
      node.calloutPosition[2],
    ])
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new Float32BufferAttribute(points, 3))
    return geometry
  }, [node])

  useEffect(
    () => () => {
      texture.dispose()
      lineGeometry.dispose()
    },
    [lineGeometry, texture],
  )

  useFrame((state) => {
    const pulse = Math.sin(state.clock.elapsedTime * 1.05 + index * 0.9)
    if (!group.current) return
    const active = activeCategory === node.key
    const hovered = hoverCategory === node.key
    group.current.position.y = node.calloutPosition[1] + pulse * 0.018
    group.current.rotation.z = pulse * 0.004
    group.current.rotation.y = -state.pointer.x * 0.035
    group.current.rotation.x = state.pointer.y * 0.022
    group.current.scale.setScalar(active ? 1.12 : hovered ? 1.06 : 1)
  })

  const selected = activeCategory === node.key
  const faded = Boolean(activeCategory) && !selected
  const panelOpacity = faded ? 0.16 : selected ? 1 : hoverCategory === node.key ? 0.98 : 0.9
  const lineOpacity = faded ? 0.06 : selected ? 0.5 : 0.28

  return (
    <>
      <line>
        <primitive attach="geometry" object={lineGeometry} />
        <lineBasicMaterial
          color={node.color}
          transparent
          opacity={lineOpacity}
          blending={AdditiveBlending}
          depthTest={false}
          depthWrite={false}
        />
      </line>

      <group
        ref={group}
        position={node.calloutPosition}
        renderOrder={42}
        onClick={(event) => {
          event.stopPropagation()
          onSelectCategory(node.key)
        }}
        onPointerOver={(event) => {
          event.stopPropagation()
          onHoverCategory(node.key)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={(event) => {
          event.stopPropagation()
          onHoverCategory(null)
          document.body.style.cursor = ''
        }}
      >
        <mesh renderOrder={43}>
          <planeGeometry args={[1.76, 0.63]} />
          <meshBasicMaterial
            map={texture}
            transparent
            opacity={panelOpacity}
            blending={AdditiveBlending}
            depthTest={false}
            depthWrite={false}
          />
        </mesh>
        <mesh position={[0, 0, -0.018]} renderOrder={41}>
          <planeGeometry args={[1.92, 0.76]} />
          <meshBasicMaterial
            color={node.color}
            transparent
            opacity={faded ? 0.02 : selected ? 0.16 : 0.07}
            blending={AdditiveBlending}
            depthTest={false}
            depthWrite={false}
          />
        </mesh>
      </group>
    </>
  )
}

export function CategoryHudLabels({
  activeCategory,
  hoverCategory,
  onHoverCategory,
  onSelectCategory,
  snapshot,
}: {
  activeCategory: CategoryKey | null
  hoverCategory: CategoryKey | null
  onHoverCategory: (key: CategoryKey | null) => void
  onSelectCategory: (key: CategoryKey) => void
  snapshot: CtfSnapshot
}) {
  return (
    <group>
      {snapshot.categories.slice(0, 6).map((category, index) => {
        const node = getCategoryNode(category.name, index)
        return (
          <CategoryHudLabel
            key={category.name}
            activeCategory={activeCategory}
            category={category}
            hoverCategory={hoverCategory}
            index={index}
            node={node}
            onHoverCategory={onHoverCategory}
            onSelectCategory={onSelectCategory}
          />
        )
      })}
    </group>
  )
}
