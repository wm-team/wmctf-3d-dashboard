import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  CanvasTexture,
  DoubleSide,
  LinearFilter,
  MeshBasicMaterial,
  SRGBColorSpace,
  type Group,
} from 'three'
import { getCategoryMeta } from './challengeData'
import type { Challenge } from './challengeTypes'

function setFont(ctx: CanvasRenderingContext2D, size: number, weight = 700) {
  ctx.font = `${weight} ${size}px "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif`
}

function setMonoFont(ctx: CanvasRenderingContext2D, size: number, weight = 700) {
  ctx.font = `${weight} ${size}px "DIN Condensed", "Bahnschrift", "Arial Narrow", sans-serif`
}

function drawCardTexture(challenge: Challenge | null) {
  const canvas = document.createElement('canvas')
  canvas.width = 860
  canvas.height = 620
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  const accent = challenge ? getCategoryMeta(challenge.category).accent : '#9bddff'
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  const fill = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
  fill.addColorStop(0, 'rgba(27, 47, 54, 0.94)')
  fill.addColorStop(0.54, 'rgba(5, 13, 16, 0.88)')
  fill.addColorStop(1, 'rgba(2, 7, 10, 0.96)')
  ctx.fillStyle = fill
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  ctx.strokeStyle = 'rgba(226, 246, 255, 0.1)'
  for (let y = 0; y < canvas.height; y += 20) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(canvas.width, y)
    ctx.stroke()
  }

  ctx.strokeStyle = accent
  ctx.lineWidth = 4
  ctx.strokeRect(18, 18, canvas.width - 36, canvas.height - 36)
  ctx.strokeStyle = 'rgba(226, 246, 255, 0.34)'
  ctx.lineWidth = 2
  ctx.strokeRect(34, 34, canvas.width - 68, canvas.height - 68)

  ctx.fillStyle = accent
  setMonoFont(ctx, 28, 900)
  ctx.fillText('CHALLENGE DETAIL', 58, 76)

  if (!challenge) {
    ctx.fillStyle = '#f4fbff'
    setFont(ctx, 42, 900)
    ctx.fillText('选择题目节点', 58, 166)
    ctx.fillStyle = 'rgba(220, 235, 242, 0.72)'
    setFont(ctx, 25, 700)
    ctx.fillText('点击任意未锁定节点查看题目状态、提交量和一血信息。', 58, 224)
    return canvas
  }

  ctx.fillStyle = '#f4fbff'
  setFont(ctx, 48, 900)
  ctx.fillText(challenge.title, 58, 150)

  const rows = [
    ['分类', getCategoryMeta(challenge.category).label.toUpperCase()],
    ['难度', challenge.difficulty.toUpperCase()],
    ['分值', String(challenge.points)],
    ['已解 / 提交', `${challenge.solvedCount} / ${challenge.submitCount}`],
    ['一血战队', challenge.bloods?.first ?? challenge.firstBloodTeam ?? '尚未产生'],
    ['二血战队', challenge.bloods?.second ?? '—'],
    ['三血战队', challenge.bloods?.third ?? '—'],
    ['状态', challenge.status.toUpperCase()],
  ]

  rows.forEach(([label, value], index) => {
    const y = 196 + index * 42
    ctx.fillStyle = 'rgba(201, 217, 224, 0.62)'
    setFont(ctx, 22, 800)
    ctx.fillText(label, 62, y)
    ctx.fillStyle = index === rows.length - 1 ? accent : '#f4fbff'
    setMonoFont(ctx, 28, 900)
    ctx.fillText(value, 266, y)
  })

  const solveRate = Math.round((challenge.solvedCount / Math.max(challenge.submitCount, 1)) * 100)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.06)'
  ctx.fillRect(58, 564, canvas.width - 116, 14)
  ctx.fillStyle = accent
  ctx.fillRect(58, 564, (canvas.width - 116) * (solveRate / 100), 14)
  ctx.fillStyle = 'rgba(220, 235, 242, 0.72)'
  setMonoFont(ctx, 18, 800)
  ctx.fillText(`SOLVE RATIO ${solveRate}%`, 58, 550)
  return canvas
}

export function ChallengeDetailCard({ detailChallenge }: { detailChallenge: Challenge | null }) {
  const group = useRef<Group>(null)
  const material = useRef<MeshBasicMaterial>(null)
  const texture = useMemo(() => {
    const nextTexture = new CanvasTexture(drawCardTexture(detailChallenge))
    nextTexture.colorSpace = SRGBColorSpace
    nextTexture.minFilter = LinearFilter
    nextTexture.magFilter = LinearFilter
    nextTexture.needsUpdate = true
    return nextTexture
  }, [detailChallenge])

  useEffect(() => () => texture.dispose(), [texture])

  useFrame((state) => {
    if (!group.current) return
    group.current.position.y = 1.04 + Math.sin(state.clock.elapsedTime * 0.72) * 0.018
    group.current.rotation.y = -0.34 - state.pointer.x * 0.025
    if (material.current) material.current.opacity += ((detailChallenge ? 0.94 : 0.72) - material.current.opacity) * 0.08
  })

  if (!detailChallenge) return null

  return (
    <group ref={group} position={[3.24, 1.04, 0.3]} rotation={[-0.1, -0.34, 0.03]}>
      <mesh renderOrder={40} raycast={() => undefined}>
        <planeGeometry args={[2.1, 1.5]} />
        <meshBasicMaterial
          ref={material}
          map={texture}
          transparent
          opacity={0.88}
          side={DoubleSide}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}
