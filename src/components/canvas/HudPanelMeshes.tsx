import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  BufferGeometry,
  CanvasTexture,
  DoubleSide,
  Float32BufferAttribute,
  LinearFilter,
  MeshBasicMaterial,
  SRGBColorSpace,
  type Group,
} from 'three'
import {
  challengeData,
  getChallengeCategoryStats,
  getCategoryMeta,
  getHotChallenges,
} from '@/components/canvas/challenge/challengeData'
import type { Challenge } from '@/components/canvas/challenge/challengeTypes'
import { eventPalette, rankMoveTone } from '@/components/canvas/team/teamEventVisuals'
import type { CtfSnapshot } from '@/types/ctf'

type PanelKind = 'rank' | 'timer' | 'solves' | 'donut' | 'line' | 'heat'
type HudViewMode = 'realtime' | 'challenge' | 'team'

type HudTextureMotion = {
  elapsed: number
  eventProgress: number
  rankProgress: number
}

type PanelConfig = {
  accent: string
  arc: number
  height: number
  kind: PanelKind
  position: [number, number, number]
  rotation: [number, number, number]
  texture: [number, number]
  width: number
}

const panels: PanelConfig[] = [
  {
    kind: 'rank',
    accent: '#ffd21f',
    width: 2.74,
    height: 3.5,
    arc: 0.5,
    texture: [840, 1080],
    position: [-5.18, 1.18, 0.08],
    rotation: [-0.06, 0.72, -0.08],
  },
  {
    kind: 'timer',
    accent: '#ffd21f',
    width: 6.2,
    height: 1.05,
    arc: 0.42,
    texture: [1680, 310],
    position: [0, 3.08, -0.72],
    rotation: [0.19, 0, 0],
  },
  {
    kind: 'solves',
    accent: '#9bddff',
    width: 2.86,
    height: 3.5,
    arc: 0.5,
    texture: [900, 1080],
    position: [5.18, 1.18, 0.08],
    rotation: [-0.06, -0.72, 0.08],
  },
  {
    kind: 'donut',
    accent: '#ffe17c',
    width: 2.8,
    height: 1.72,
    arc: 0.32,
    texture: [860, 520],
    position: [-3.98, -1.48, 1.34],
    rotation: [-0.5, 0.43, 0.04],
  },
  {
    kind: 'line',
    accent: '#ffd21f',
    width: 4.62,
    height: 1.72,
    arc: 0.34,
    texture: [1360, 520],
    position: [0, -1.54, 1.22],
    rotation: [-0.53, 0, 0],
  },
  {
    kind: 'heat',
    accent: '#9bddff',
    width: 3.18,
    height: 1.72,
    arc: 0.32,
    texture: [980, 520],
    position: [3.98, -1.48, 1.34],
    rotation: [-0.5, -0.43, -0.04],
  },
]

const teamPanels: PanelConfig[] = [
  {
    kind: 'rank',
    accent: '#ffd21f',
    width: 2.46,
    height: 3.16,
    arc: 0.44,
    texture: [840, 1080],
    position: [-4.38, 1.18, 0.48],
    rotation: [-0.07, 0.54, -0.055],
  },
  {
    kind: 'timer',
    accent: '#ffd21f',
    width: 5.7,
    height: 0.92,
    arc: 0.36,
    texture: [1680, 310],
    position: [0, 3.02, -0.56],
    rotation: [0.16, 0, 0],
  },
  {
    kind: 'solves',
    accent: '#9bddff',
    width: 2.58,
    height: 3.16,
    arc: 0.44,
    texture: [900, 1080],
    position: [4.38, 1.18, 0.48],
    rotation: [-0.07, -0.54, 0.055],
  },
  {
    kind: 'donut',
    accent: '#ffe17c',
    width: 2.34,
    height: 1.38,
    arc: 0.28,
    texture: [860, 520],
    position: [-3.42, -1.12, 1.56],
    rotation: [-0.43, 0.28, 0.035],
  },
  {
    kind: 'line',
    accent: '#ffd21f',
    width: 4.02,
    height: 1.38,
    arc: 0.29,
    texture: [1360, 520],
    position: [0, -1.14, 1.5],
    rotation: [-0.44, 0, 0],
  },
  {
    kind: 'heat',
    accent: '#9bddff',
    width: 2.64,
    height: 1.38,
    arc: 0.28,
    texture: [980, 520],
    position: [3.42, -1.12, 1.56],
    rotation: [-0.43, -0.28, -0.035],
  },
]

function setFont(ctx: CanvasRenderingContext2D, size: number, weight = 700) {
  ctx.font = `${weight} ${size}px "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif`
}

function setMonoFont(ctx: CanvasRenderingContext2D, size: number, weight = 700) {
  ctx.font = `${weight} ${size}px "DIN Condensed", "Bahnschrift", "Arial Narrow", sans-serif`
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

function motionEase(value: number) {
  const t = clamp01(value)
  return t * t * t * (t * (t * 6 - 15) + 10)
}

function lerpNumber(from: number, to: number, progress: number) {
  return from + (to - from) * progress
}

function latestSolveKey(snapshot: CtfSnapshot) {
  const solve = snapshot.recentSolves[0]
  return solve ? `${solve.time}:${solve.team}:${solve.challenge}:${solve.points}:${solve.eventTone ?? solve.badge ?? 'normal'}` : 'empty'
}

function panelPath(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const cut = Math.min(width, height) * 0.085
  ctx.beginPath()
  ctx.moveTo(cut, 0)
  ctx.lineTo(width - cut * 1.45, 0)
  ctx.lineTo(width, cut * 1.2)
  ctx.lineTo(width, height - cut * 1.2)
  ctx.lineTo(width - cut, height)
  ctx.lineTo(cut * 1.15, height)
  ctx.lineTo(0, height - cut * 1.35)
  ctx.lineTo(0, cut)
  ctx.closePath()
}

function drawPanelBase(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  title: string,
  subtitle: string,
  accent: string,
) {
  ctx.clearRect(0, 0, width, height)
  ctx.save()
  panelPath(ctx, width, height)
  ctx.clip()

  const fill = ctx.createLinearGradient(0, 0, width, height)
  fill.addColorStop(0, 'rgba(30, 48, 54, 0.88)')
  fill.addColorStop(0.48, 'rgba(7, 15, 18, 0.78)')
  fill.addColorStop(1, 'rgba(3, 8, 10, 0.94)')
  ctx.fillStyle = fill
  ctx.fillRect(0, 0, width, height)

  const radial = ctx.createRadialGradient(width * 0.5, height * 0.15, 8, width * 0.5, height * 0.2, width * 0.78)
  radial.addColorStop(0, `${accent}4a`)
  radial.addColorStop(0.32, 'rgba(155, 221, 255, 0.11)')
  radial.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = radial
  ctx.fillRect(0, 0, width, height)

  ctx.strokeStyle = 'rgba(226, 242, 247, 0.08)'
  ctx.lineWidth = 1
  for (let x = 0; x < width; x += 34) {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
    ctx.stroke()
  }
  for (let y = 0; y < height; y += 32) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }

  ctx.globalCompositeOperation = 'screen'
  const sweep = ctx.createLinearGradient(0, height * 0.06, width, height * 0.92)
  sweep.addColorStop(0, 'rgba(255, 255, 255, 0)')
  sweep.addColorStop(0.44, 'rgba(155, 235, 255, 0.08)')
  sweep.addColorStop(0.5, `${accent}22`)
  sweep.addColorStop(0.58, 'rgba(255, 255, 255, 0.04)')
  sweep.addColorStop(1, 'rgba(255, 255, 255, 0)')
  ctx.fillStyle = sweep
  ctx.fillRect(0, 0, width, height)

  ctx.fillStyle = 'rgba(220, 250, 255, 0.045)'
  for (let y = 3; y < height; y += 7) {
    ctx.fillRect(0, y, width, 1)
  }

  ctx.strokeStyle = `${accent}2f`
  ctx.lineWidth = 2
  for (let x = -width * 0.2; x < width; x += 88) {
    ctx.beginPath()
    ctx.moveTo(x, height)
    ctx.lineTo(x + width * 0.34, 0)
    ctx.stroke()
  }
  ctx.globalCompositeOperation = 'source-over'

  ctx.restore()

  panelPath(ctx, width, height)
  ctx.strokeStyle = 'rgba(226, 242, 247, 0.42)'
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.save()
  ctx.shadowColor = accent
  ctx.shadowBlur = 18
  ctx.strokeStyle = `${accent}dd`
  ctx.lineWidth = 4
  const bracket = Math.min(width, height) * 0.14
  const inset = 16
  ;[
    [inset, inset, inset + bracket, inset, inset, inset + bracket],
    [width - inset, inset, width - inset - bracket, inset, width - inset, inset + bracket],
    [inset, height - inset, inset + bracket, height - inset, inset, height - inset - bracket],
    [width - inset, height - inset, width - inset - bracket, height - inset, width - inset, height - inset - bracket],
  ].forEach(([x1, y1, x2, y2, x3, y3]) => {
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.moveTo(x1, y1)
    ctx.lineTo(x3, y3)
    ctx.stroke()
  })
  ctx.restore()

  ctx.beginPath()
  ctx.moveTo(width * 0.08, 76)
  ctx.lineTo(width * 0.94, 76)
  ctx.strokeStyle = accent
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.fillStyle = accent
  ctx.beginPath()
  ctx.arc(width * 0.07, 52, 17, 0, Math.PI * 2)
  ctx.strokeStyle = accent
  ctx.lineWidth = 5
  ctx.stroke()
  ctx.fillStyle = 'rgba(5, 10, 12, 0.9)'
  ctx.beginPath()
  ctx.arc(width * 0.07, 52, 9, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#f3f8fb'
  setFont(ctx, 34, 900)
  ctx.fillText(title, width * 0.11, 61)
  ctx.fillStyle = 'rgba(198, 209, 214, 0.68)'
  setMonoFont(ctx, 18, 700)
  ctx.fillText(subtitle, width * 0.11 + ctx.measureText(title).width + 20, 61)
}

function drawHex(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  fill: string,
  label: string,
) {
  ctx.beginPath()
  for (let i = 0; i < 6; i += 1) {
    const angle = -Math.PI / 2 + (Math.PI * 2 * i) / 6
    const px = x + Math.cos(angle) * radius
    const py = y + Math.sin(angle) * radius
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.fillStyle = fill === '#f6d252' ? '#17150a' : '#0b1113'
  setMonoFont(ctx, 13, 900)
  ctx.textAlign = 'center'
  ctx.fillText(label, x, y + 5)
  ctx.textAlign = 'left'
}

function drawRankPanel(
  ctx: CanvasRenderingContext2D,
  snapshot: CtfSnapshot,
  width: number,
  height: number,
  accent: string,
) {
  drawPanelBase(ctx, width, height, '实时排名', 'LIVE RANKING', accent)
  const left = 62
  const top = 125
  const columns = [left, left + 95, width - 220, width - 86]
  ctx.fillStyle = 'rgba(199, 211, 216, 0.68)'
  setFont(ctx, 21, 700)
  ;['排名', '战队', '总分', '已解题'].forEach((label, index) => {
    ctx.textAlign = index >= 2 ? 'right' : 'left'
    ctx.fillText(label, columns[index], top)
  })
  ctx.textAlign = 'left'

  snapshot.topTeams.slice(0, 9).forEach((team, index) => {
    const rowY = top + 54 + index * 86
    ctx.strokeStyle = 'rgba(226, 242, 247, 0.15)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(left - 16, rowY + 45)
    ctx.lineTo(width - 54, rowY + 45)
    ctx.stroke()

    if (team.rank <= 3) {
      const color = team.rank === 1 ? '#f6d252' : team.rank === 2 ? '#d5dde1' : '#d27a33'
      drawHex(ctx, columns[0] + 23, rowY + 6, 28, color, ['GOLD', 'SIL', 'BRZ'][team.rank - 1])
    } else {
      ctx.fillStyle = '#f3f8fb'
      setMonoFont(ctx, 33, 800)
      ctx.textAlign = 'center'
      ctx.fillText(String(team.rank), columns[0] + 22, rowY + 18)
      ctx.textAlign = 'left'
    }

    ctx.fillStyle = '#f7fbff'
    setFont(ctx, 31, 900)
    ctx.fillText(team.name, columns[1], rowY + 20)
    ctx.fillStyle = '#eff6f8'
    setMonoFont(ctx, 32, 800)
    ctx.textAlign = 'right'
    ctx.fillText(String(team.score), columns[2], rowY + 20)
    ctx.fillText(String(team.solves), columns[3], rowY + 20)
    ctx.textAlign = 'left'
  })

  ctx.fillStyle = 'rgba(246, 210, 82, 0.92)'
  setFont(ctx, 24, 800)
  ctx.textAlign = 'center'
  ctx.fillText('查看完整排名  >', width / 2, height - 44)
  ctx.textAlign = 'left'
}

function drawTimerPanel(
  ctx: CanvasRenderingContext2D,
  snapshot: CtfSnapshot,
  width: number,
  height: number,
  accent: string,
) {
  drawPanelBase(ctx, width, height, '', '', accent)
  ctx.clearRect(0, 0, width, 88)
  ctx.save()
  panelPath(ctx, width, height)
  ctx.clip()
  const glow = ctx.createRadialGradient(width / 2, height, 10, width / 2, height, width * 0.44)
  glow.addColorStop(0, 'rgba(255, 210, 31, 0.35)')
  glow.addColorStop(0.5, 'rgba(155, 221, 255, 0.08)')
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, width, height)
  ctx.restore()

  ctx.strokeStyle = accent
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(width * 0.08, 34)
  ctx.lineTo(width * 0.92, 34)
  ctx.stroke()

  ctx.fillStyle = '#dbe4e8'
  setFont(ctx, 30, 800)
  ctx.fillText('当前轮次', 130, 116)
  ctx.fillStyle = accent
  setMonoFont(ctx, 78, 900)
  ctx.fillText(String(snapshot.currentRound).padStart(2, '0'), 130, 198)
  ctx.fillStyle = '#f4f7f8'
  setMonoFont(ctx, 46, 800)
  ctx.fillText(`/ ${String(snapshot.totalRounds).padStart(2, '0')}`, 250, 190)
  ctx.fillStyle = accent
  ctx.fillRect(376, 132, 152, 54)
  ctx.fillStyle = '#10120a'
  setFont(ctx, 26, 900)
  ctx.fillText(snapshot.roundStatus, 413, 168)

  ctx.fillStyle = '#dbe4e8'
  setFont(ctx, 30, 800)
  ctx.textAlign = 'center'
  ctx.fillText('本轮剩余时间', width / 2, 104)
  ctx.fillStyle = '#ffffff'
  setMonoFont(ctx, 104, 900)
  ctx.fillText(snapshot.remainingTime, width / 2, 198)
  ctx.fillStyle = 'rgba(205, 216, 220, 0.68)'
  setMonoFont(ctx, 18, 700)
  ctx.fillText('» HOURS      » MINUTES      » SECONDS', width / 2, 244)

  ctx.textAlign = 'right'
  ctx.fillStyle = '#dbe4e8'
  setFont(ctx, 30, 800)
  ctx.fillText('下一轮开始', width - 130, 116)
  ctx.fillStyle = '#f4f7f8'
  setMonoFont(ctx, 56, 800)
  ctx.fillText(snapshot.nextRoundTime, width - 130, 188)
  ctx.textAlign = 'left'
}

function drawSolvesPanel(
  ctx: CanvasRenderingContext2D,
  snapshot: CtfSnapshot,
  width: number,
  height: number,
  accent: string,
) {
  drawPanelBase(ctx, width, height, '最新解题动态', 'RECENT SOLVES', accent)
  ctx.fillStyle = 'rgba(203, 216, 221, 0.7)'
  setFont(ctx, 22, 800)
  ctx.textAlign = 'right'
  ctx.fillText('查看更多  >', width - 66, 62)
  ctx.textAlign = 'left'

  const lineX = 82
  ctx.strokeStyle = 'rgba(155, 221, 255, 0.6)'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(lineX, 118)
  ctx.lineTo(lineX, height - 58)
  ctx.stroke()

  snapshot.recentSolves.slice(0, 9).forEach((solve, index) => {
    const y = 146 + index * 92
    const firstBlood = Boolean(solve.badge)
    ctx.fillStyle = firstBlood ? '#ffd21f' : index > 4 ? '#75d8ff' : 'rgba(226, 242, 247, 0.3)'
    ctx.beginPath()
    ctx.arc(lineX, y, firstBlood ? 10 : 8, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(226, 242, 247, 0.16)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(126, y + 43)
    ctx.lineTo(width - 60, y + 43)
    ctx.stroke()

    ctx.fillStyle = '#dce7eb'
    setMonoFont(ctx, 22, 700)
    ctx.fillText(solve.time, 102, y + 8)
    if (firstBlood) {
      ctx.strokeStyle = '#ffd21f'
      ctx.strokeRect(214, y - 23, 78, 46)
      ctx.fillStyle = '#ffd21f'
      setMonoFont(ctx, 13, 900)
      ctx.textAlign = 'center'
      ctx.fillText('FIRST', 253, y - 4)
      ctx.fillText('BLOOD', 253, y + 13)
      ctx.textAlign = 'left'
    } else {
      ctx.strokeStyle = 'rgba(226, 242, 247, 0.2)'
      ctx.beginPath()
      ctx.arc(253, y, 18, 0, Math.PI * 2)
      ctx.stroke()
    }

    ctx.fillStyle = '#f7fbff'
    setFont(ctx, 31, 900)
    ctx.fillText(solve.team, 322, y - 7)
    ctx.fillStyle = '#b7c4ca'
    setFont(ctx, 21, 600)
    ctx.fillText(`解出  ${solve.category}  |  ${solve.challenge}`, 322, y + 26)
    ctx.fillStyle = '#ffd21f'
    setMonoFont(ctx, 34, 900)
    ctx.textAlign = 'right'
    ctx.fillText(`+${solve.points}`, width - 60, y + 11)
    ctx.textAlign = 'left'
  })
}

function drawDonutPanel(
  ctx: CanvasRenderingContext2D,
  snapshot: CtfSnapshot,
  width: number,
  height: number,
  accent: string,
) {
  drawPanelBase(ctx, width, height, '题目类别分布', 'CATEGORY DISTRIBUTION', accent)
  const centerX = 228
  const centerY = 288
  const radius = 132
  let cursor = -Math.PI / 2
  snapshot.categories.forEach((category) => {
    const angle = (category.percent / 100) * Math.PI * 2
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, cursor, cursor + angle)
    ctx.lineWidth = 54
    ctx.strokeStyle = category.color
    ctx.stroke()
    cursor += angle
  })
  ctx.fillStyle = '#071014'
  ctx.beginPath()
  ctx.arc(centerX, centerY, 72, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#fff'
  setMonoFont(ctx, 58, 900)
  ctx.textAlign = 'center'
  ctx.fillText(String(snapshot.totalChallenges), centerX, centerY + 6)
  ctx.fillStyle = '#c5d0d5'
  setFont(ctx, 20, 700)
  ctx.fillText('总题目数', centerX, centerY + 45)
  ctx.textAlign = 'left'

  snapshot.categories.forEach((category, index) => {
    const x = 450
    const y = 174 + index * 52
    ctx.fillStyle = category.color
    ctx.fillRect(x, y - 13, 17, 17)
    ctx.fillStyle = '#eff6f8'
    setFont(ctx, 25, 700)
    ctx.fillText(category.name, x + 34, y + 2)
    ctx.fillStyle = '#ffe17c'
    setMonoFont(ctx, 26, 900)
    ctx.fillText(String(category.solved), x + 198, y + 2)
    ctx.fillStyle = '#c3cdd2'
    setMonoFont(ctx, 21, 700)
    ctx.fillText(`(${category.percent}%)`, x + 243, y + 2)
  })
}

function drawLinePanel(
  ctx: CanvasRenderingContext2D,
  snapshot: CtfSnapshot,
  width: number,
  height: number,
  accent: string,
) {
  drawPanelBase(ctx, width, height, '解题趋势（本轮）', 'SOLVES OVER TIME', accent)
  const chart = { x: 118, y: 126, w: width - 200, h: height - 190 }
  const max = Math.max(...snapshot.timeline.flatMap((point) => [point.current, point.previous]), 1)

  ctx.strokeStyle = 'rgba(226, 242, 247, 0.14)'
  ctx.lineWidth = 1
  setMonoFont(ctx, 20, 700)
  ctx.fillStyle = 'rgba(205, 216, 220, 0.68)'
  for (let i = 0; i <= 4; i += 1) {
    const y = chart.y + (chart.h / 4) * i
    ctx.beginPath()
    ctx.moveTo(chart.x, y)
    ctx.lineTo(chart.x + chart.w, y)
    ctx.stroke()
    ctx.fillText(String(Math.round(max - (max / 4) * i)), 48, y + 7)
  }

  const toPoint = (index: number, key: 'current' | 'previous') => {
    const denominator = Math.max(snapshot.timeline.length - 1, 1)
    const x = chart.x + (index / denominator) * chart.w
    const y = chart.y + chart.h - (snapshot.timeline[index][key] / max) * chart.h
    return [x, y] as const
  }

  const drawLine = (key: 'current' | 'previous', color: string, widthPx: number) => {
    ctx.beginPath()
    snapshot.timeline.forEach((_, index) => {
      const [x, y] = toPoint(index, key)
      if (index === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.strokeStyle = color
    ctx.lineWidth = widthPx
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.stroke()
  }

  const fill = ctx.createLinearGradient(0, chart.y, 0, chart.y + chart.h)
  fill.addColorStop(0, 'rgba(255, 210, 31, 0.28)')
  fill.addColorStop(1, 'rgba(255, 210, 31, 0)')
  ctx.beginPath()
  snapshot.timeline.forEach((_, index) => {
    const [x, y] = toPoint(index, 'current')
    if (index === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  })
  ctx.lineTo(chart.x + chart.w, chart.y + chart.h)
  ctx.lineTo(chart.x, chart.y + chart.h)
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()

  drawLine('previous', 'rgba(216, 226, 230, 0.62)', 4)
  drawLine('current', '#ffd21f', 7)

  const active = Math.max(snapshot.timeline.findIndex((point) => point.highlight), 0)
  const [mx, my] = toPoint(active, 'current')
  ctx.strokeStyle = 'rgba(255, 210, 31, 0.7)'
  ctx.setLineDash([4, 8])
  ctx.beginPath()
  ctx.moveTo(mx, chart.y)
  ctx.lineTo(mx, chart.y + chart.h)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.fillStyle = '#ffd21f'
  ctx.beginPath()
  ctx.arc(mx, my, 13, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#fff'
  ctx.lineWidth = 5
  ctx.stroke()

  ctx.fillStyle = 'rgba(9, 15, 18, 0.88)'
  ctx.strokeStyle = 'rgba(255, 210, 31, 0.55)'
  ctx.lineWidth = 2
  ctx.fillRect(mx + 30, my - 52, 172, 86)
  ctx.strokeRect(mx + 30, my - 52, 172, 86)
  ctx.fillStyle = '#dbe5e9'
  setFont(ctx, 21, 700)
  ctx.fillText(`当前解出 ${snapshot.timeline[active].current}`, mx + 48, my - 18)
  ctx.fillText(`上一轮同期 ${snapshot.timeline[active].previous}`, mx + 48, my + 15)

  setMonoFont(ctx, 18, 700)
  ctx.fillStyle = 'rgba(205, 216, 220, 0.68)'
  snapshot.timeline.forEach((point, index) => {
    const [x] = toPoint(index, 'current')
    ctx.textAlign = 'center'
    ctx.fillText(point.time, x, height - 40)
  })
  ctx.textAlign = 'left'
}

function drawHeatPanel(
  ctx: CanvasRenderingContext2D,
  snapshot: CtfSnapshot,
  width: number,
  height: number,
  accent: string,
) {
  drawPanelBase(ctx, width, height, '战队活跃度（提交数/分钟）', 'TEAM ACTIVITY', accent)
  ctx.fillStyle = '#cfd9dd'
  setFont(ctx, 19, 700)
  ctx.fillText('低', width - 276, 61)
  const grad = ctx.createLinearGradient(width - 228, 0, width - 72, 0)
  grad.addColorStop(0, 'rgba(108, 122, 132, 0.58)')
  grad.addColorStop(1, '#ffd21f')
  ctx.fillStyle = grad
  ctx.fillRect(width - 228, 45, 150, 12)
  ctx.fillStyle = '#cfd9dd'
  ctx.fillText('高', width - 58, 61)

  const startX = 202
  const startY = 132
  const cellW = 48
  const cellH = 27
  const gap = 8
  snapshot.activity.slice(0, 8).forEach((row, rowIndex) => {
    const y = startY + rowIndex * (cellH + 18)
    ctx.fillStyle = '#f4f9fb'
    setFont(ctx, 20, 800)
    ctx.fillText(row.team, 42, y + 20)
    row.buckets.forEach((bucket, index) => {
      const x = startX + index * (cellW + gap)
      const alpha = bucket >= 0.42 ? 0.24 + bucket * 0.66 : 0.18 + bucket * 0.62
      ctx.fillStyle =
        bucket >= 0.42
          ? `rgba(246, 210, 82, ${alpha})`
          : `rgba(105, 122, 132, ${alpha})`
      ctx.fillRect(x, y, cellW, cellH)
      ctx.strokeStyle = 'rgba(226, 242, 247, 0.1)'
      ctx.lineWidth = 1
      ctx.strokeRect(x, y, cellW, cellH)
    })
  })

  ctx.fillStyle = 'rgba(205, 216, 220, 0.68)'
  setMonoFont(ctx, 18, 700)
  snapshot.heatmapTicks.forEach((tick, index) => {
    ctx.textAlign = 'center'
    ctx.fillText(tick, startX + index * 104, height - 36)
  })
  ctx.textAlign = 'left'
}

function rankMoveLabel(rank: number, previousRank: number, score: number, previousScore: number) {
  const delta = previousRank - rank
  if (delta > 0) return `↑${delta}`
  if (delta < 0) return `↓${Math.abs(delta)}`
  if (score > previousScore) return `+${score - previousScore}`
  return '-'
}

function rankMoveColor(rank: number, previousRank: number, score: number, previousScore: number) {
  return rankMoveTone(rank, previousRank, score, previousScore)
}

function teamRankColor(rank: number) {
  if (rank === 1) return '#ffd21f'
  if (rank === 2) return '#dce9ef'
  if (rank === 3) return '#ff8a36'
  if (rank <= 10) return '#69f6ff'
  return '#8fa4ac'
}

function drawTeamRankPanel(
  ctx: CanvasRenderingContext2D,
  snapshot: CtfSnapshot,
  width: number,
  height: number,
  accent: string,
  motion?: HudTextureMotion,
) {
  drawPanelBase(ctx, width, height, '实时排行榜', 'TEAM ORBIT TOP 10', accent)
  const left = 58
  const top = 124
  const columns = [left, left + 92, width - 274, width - 166, width - 72]
  const rankProgress = motionEase(motion?.rankProgress ?? 1)
  ctx.fillStyle = 'rgba(203, 216, 221, 0.7)'
  setFont(ctx, 21, 800)
  ;['排名', '战队', '得分', '变化', '一血'].forEach((label, index) => {
    ctx.textAlign = index >= 2 ? 'right' : 'left'
    ctx.fillText(label, columns[index], top)
  })
  ctx.textAlign = 'left'

  snapshot.topTeams
    .filter((team) => team.rank <= 10 || team.previousRank <= 10)
    .slice(0, 12)
    .sort((leftTeam, rightTeam) => {
      const leftPromoted = leftTeam.rank < leftTeam.previousRank ? 1 : 0
      const rightPromoted = rightTeam.rank < rightTeam.previousRank ? 1 : 0
      return leftPromoted - rightPromoted
    })
    .forEach((team) => {
    const startIndex = Math.min(Math.max(team.previousRank, 1), 11) - 1
    const endIndex = Math.min(Math.max(team.rank, 1), 11) - 1
    const rowIndex = lerpNumber(startIndex, endIndex, rankProgress)
    const y = top + 54 + rowIndex * 78
    const rowVisible = y > top + 28 && y < height - 42
    if (!rowVisible) return
    const tone = teamRankColor(team.rank)
    const rowAlpha = team.rank <= 10 ? 1 : 1 - rankProgress
    const score = Math.round(lerpNumber(team.previousScore, team.score, rankProgress))
    const rankLabel = rankProgress < 0.48 ? team.previousRank : team.rank
    const promoted = team.rank < team.previousRank
    const demoted = team.rank > team.previousRank

    ctx.save()
    ctx.globalAlpha = rowAlpha
    if (promoted || demoted) {
      const moveTone = rankMoveColor(team.rank, team.previousRank, team.score, team.previousScore)
      ctx.fillStyle = promoted ? 'rgba(255, 210, 31, 0.08)' : 'rgba(126, 189, 255, 0.055)'
      ctx.fillRect(left - 26, y - 28, width - left - 22, 58)
      ctx.strokeStyle = moveTone
      ctx.globalAlpha = rowAlpha * (0.22 + Math.sin(rankProgress * Math.PI) * 0.38)
      ctx.strokeRect(left - 28, y - 31, width - left - 18, 64)
      ctx.globalAlpha = rowAlpha
    }
    ctx.strokeStyle = 'rgba(226, 242, 247, 0.13)'
    ctx.beginPath()
    ctx.moveTo(left - 18, y + 39)
    ctx.lineTo(width - 56, y + 39)
    ctx.stroke()

    if (team.rank <= 3) {
      drawHex(ctx, columns[0] + 23, y + 5, 26, tone, ['01', '02', '03'][team.rank - 1])
    } else {
      ctx.fillStyle = '#f4fbff'
      setMonoFont(ctx, 30, 900)
      ctx.textAlign = 'center'
      ctx.fillText(String(rankLabel).padStart(2, '0'), columns[0] + 22, y + 16)
      ctx.textAlign = 'left'
    }

    ctx.fillStyle = '#f7fbff'
    setFont(ctx, 29, 900)
    ctx.fillText(team.name, columns[1], y + 15)
    ctx.fillStyle = 'rgba(203, 216, 221, 0.7)'
    setMonoFont(ctx, 18, 800)
    ctx.fillText(`${team.topCategory.toUpperCase()} / ${team.solves} SOLVES`, columns[1], y + 42)

    ctx.textAlign = 'right'
    ctx.fillStyle = tone
    setMonoFont(ctx, 32, 900)
    ctx.fillText(String(score), columns[2], y + 15)
    ctx.fillStyle = rankMoveColor(team.rank, team.previousRank, team.score, team.previousScore)
    setMonoFont(ctx, 25, 900)
    ctx.fillText(rankMoveLabel(team.rank, team.previousRank, team.score, team.previousScore), columns[3], y + 15)
    ctx.fillStyle = '#f4fbff'
    setMonoFont(ctx, 25, 900)
    ctx.fillText(String(team.firstBloods), columns[4], y + 15)
    ctx.textAlign = 'left'
    ctx.restore()
  })
}

function drawTeamSummaryPanel(
  ctx: CanvasRenderingContext2D,
  snapshot: CtfSnapshot,
  width: number,
  height: number,
  accent: string,
  motion?: HudTextureMotion,
) {
  drawPanelBase(ctx, width, height, '', '', accent)
  ctx.clearRect(0, 0, width, 84)
  const leader = snapshot.topTeams[0]
  const second = snapshot.topTeams[1]
  const leadGap = leader && second ? leader.score - second.score : 0
  const previousLeader = snapshot.topTeams.find((team) => team.previousRank === 1 && team.teamId !== leader?.teamId)
  const newLeader = Boolean(leader && leader.previousRank !== 1)
  const totalFirstBloods = snapshot.topTeams.reduce((sum, team) => sum + team.firstBloods, 0)

  ctx.strokeStyle = accent
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(width * 0.08, 34)
  ctx.lineTo(width * 0.92, 34)
  ctx.stroke()

  ctx.fillStyle = '#dbe4e8'
  setFont(ctx, 32, 900)
  ctx.fillText('战队视图', 130, 120)
  ctx.fillStyle = '#f4f7f8'
  setMonoFont(ctx, 84, 900)
  ctx.fillText('TEAM RANK ORBIT', 130, 206)

  const metrics = [
    ['TEAMS', snapshot.totalTeams, '#f4fbff'],
    ['TOP SCORE', leader?.score ?? 0, '#ffd21f'],
    ['LEAD GAP', leadGap, '#69f6ff'],
    ['FIRST BLOOD', totalFirstBloods, '#b46cff'],
  ] as const

  metrics.forEach(([label, value, color], index) => {
    const x = width - 720 + index * 170
    ctx.fillStyle = color
    setMonoFont(ctx, 56, 900)
    ctx.textAlign = 'center'
    ctx.fillText(String(value), x, 150)
    ctx.fillStyle = 'rgba(205, 216, 220, 0.74)'
    setMonoFont(ctx, 20, 800)
    ctx.fillText(label, x, 188)
  })
  ctx.textAlign = 'left'

  if (newLeader && leader) {
    const flash = Math.sin(motionEase(Math.min((motion?.elapsed ?? 2) / 0.86, 1)) * Math.PI)
    const alpha = 0.72 + flash * 0.28
    ctx.save()
    ctx.globalAlpha = alpha
    const bannerX = width / 2 - 238
    const bannerY = 210
    const bannerW = 476
    const bannerH = 70
    const glow = ctx.createLinearGradient(bannerX, bannerY, bannerX + bannerW, bannerY)
    glow.addColorStop(0, 'rgba(255, 210, 31, 0)')
    glow.addColorStop(0.5, 'rgba(255, 210, 31, 0.32)')
    glow.addColorStop(1, 'rgba(105, 246, 255, 0)')
    ctx.fillStyle = glow
    ctx.fillRect(bannerX - 90, bannerY - 8, bannerW + 180, bannerH + 16)
    ctx.strokeStyle = '#ffd21f'
    ctx.lineWidth = 2
    ctx.strokeRect(bannerX, bannerY, bannerW, bannerH)
    ctx.fillStyle = '#ffd21f'
    setMonoFont(ctx, 30, 900)
    ctx.textAlign = 'center'
    ctx.fillText('NEW LEADER', bannerX + bannerW / 2, bannerY + 29)
    ctx.fillStyle = '#f7fbff'
    setFont(ctx, 25, 900)
    ctx.fillText(`${previousLeader?.name ?? '---'} → ${leader.name}    领先分差 +${leadGap}`, bannerX + bannerW / 2, bannerY + 56)
    ctx.textAlign = 'left'
    ctx.restore()
  }
}

function drawTeamSolvesPanel(
  ctx: CanvasRenderingContext2D,
  snapshot: CtfSnapshot,
  width: number,
  height: number,
  accent: string,
  motion?: HudTextureMotion,
) {
  drawPanelBase(ctx, width, height, '最新突破动态', 'TEAM BREAKTHROUGH FEED', accent)
  ctx.fillStyle = 'rgba(203, 216, 221, 0.7)'
  setFont(ctx, 22, 800)
  ctx.textAlign = 'right'
  ctx.fillText('实时更新  >', width - 66, 62)
  ctx.textAlign = 'left'

  const lineX = 82
  ctx.strokeStyle = 'rgba(155, 221, 255, 0.6)'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(lineX, 118)
  ctx.lineTo(lineX, height - 58)
  ctx.stroke()

  snapshot.recentSolves.slice(0, 9).forEach((solve, index) => {
    const firstBlood = solve.badge === 'FIRST BLOOD' || solve.eventTone === 'firstBlood'
    const toneKey = firstBlood ? 'firstBlood' : solve.eventTone ?? 'normal'
    const palette = eventPalette(toneKey)
    const intro = index === 0 ? motionEase(motion?.eventProgress ?? 1) : 1
    const flash = index === 0 ? Math.sin(motionEase(Math.min((motion?.elapsed ?? 2) / 0.62, 1)) * Math.PI) : 0
    const y = 146 + index * 92 - (index === 0 ? (1 - intro) * 78 : 0)
    const rowAlpha = index === 0 ? 0.36 + intro * 0.64 : index > 6 ? 0.78 : 1
    const cardX = 120
    const cardY = y - 36
    const cardW = width - 178
    const cardH = 72

    if (y < 104 || cardY > height - 62) return

    ctx.save()
    ctx.globalAlpha = rowAlpha
    ctx.fillStyle = firstBlood ? 'rgba(180, 108, 255, 0.09)' : toneKey === 'highValue' ? 'rgba(255, 210, 31, 0.075)' : toneKey === 'breakthrough' ? 'rgba(255, 120, 68, 0.07)' : 'rgba(105, 246, 255, 0.045)'
    ctx.beginPath()
    ctx.roundRect(cardX, cardY, cardW, cardH, 8)
    ctx.fill()

    const rail = ctx.createLinearGradient(cardX, cardY, cardX, cardY + cardH)
    rail.addColorStop(0, palette.start)
    rail.addColorStop(1, palette.end)
    ctx.fillStyle = rail
    ctx.fillRect(cardX, cardY + 8, 5, cardH - 16)

    ctx.save()
    ctx.shadowColor = palette.border
    ctx.shadowBlur = flash ? 24 : firstBlood ? 12 : 0
    ctx.strokeStyle = flash ? palette.border : firstBlood ? '#b46cff' : 'rgba(226, 242, 247, 0.16)'
    ctx.lineWidth = flash ? 3 : firstBlood ? 2 : 1
    ctx.beginPath()
    ctx.roundRect(cardX, cardY, cardW, cardH, 8)
    ctx.stroke()
    ctx.restore()

    ctx.fillStyle = palette.accent
    ctx.beginPath()
    ctx.arc(lineX, y, firstBlood ? 11 : 8, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = firstBlood ? '#ffd21f' : 'rgba(226, 242, 247, 0.14)'
    ctx.lineWidth = firstBlood ? 2 : 1
    ctx.beginPath()
    ctx.moveTo(126, y + 43)
    ctx.lineTo(width - 60, y + 43)
    ctx.stroke()

    ctx.fillStyle = '#dce7eb'
    setMonoFont(ctx, 22, 700)
    ctx.fillText(solve.time, 102, y + 8)

    ctx.strokeStyle = firstBlood ? palette.border : palette.accent
    ctx.strokeRect(214, y - 23, 78, 46)
    ctx.fillStyle = firstBlood ? palette.border : palette.accent
    setMonoFont(ctx, 13, 900)
    ctx.textAlign = 'center'
    ctx.fillText(palette.label, 253, y - 4)
    ctx.fillText(firstBlood ? 'BLOOD' : 'EVENT', 253, y + 13)
    ctx.textAlign = 'left'
    if (firstBlood) {
      ctx.strokeStyle = palette.accent
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(300, y - 22)
      ctx.lineTo(288, y - 2)
      ctx.lineTo(304, y - 2)
      ctx.lineTo(292, y + 22)
      ctx.stroke()
    }

    ctx.fillStyle = '#f7fbff'
    setFont(ctx, 31, 900)
    ctx.fillText(solve.team, 322, y - 7)
    ctx.fillStyle = '#b7c4ca'
    setFont(ctx, 21, 600)
    ctx.fillText(`解出  ${solve.category}  |  ${solve.challenge}`, 322, y + 26)
    ctx.fillStyle = '#ffd21f'
    setMonoFont(ctx, 34, 900)
    ctx.textAlign = 'right'
    ctx.fillText(`+${solve.points}`, width - 60, y + 11)
    ctx.textAlign = 'left'
    ctx.restore()
  })
}

function drawTeamCategoryPanel(
  ctx: CanvasRenderingContext2D,
  snapshot: CtfSnapshot,
  width: number,
  height: number,
  accent: string,
) {
  drawPanelBase(ctx, width, height, '战队强项分布', 'TOP TEAM CATEGORY', accent)
  const categoryCounts = snapshot.categories.map((category) => ({
    ...category,
    solved: snapshot.topTeams.filter((team) => team.topCategory === category.name).length,
  }))
  const total = Math.max(categoryCounts.reduce((sum, category) => sum + category.solved, 0), 1)
  const centerX = 228
  const centerY = 288
  let cursor = -Math.PI / 2
  categoryCounts.forEach((category) => {
    const angle = (category.solved / total) * Math.PI * 2
    ctx.beginPath()
    ctx.arc(centerX, centerY, 132, cursor, cursor + angle)
    ctx.lineWidth = 54
    ctx.strokeStyle = category.color
    ctx.stroke()
    cursor += angle
  })
  ctx.fillStyle = '#071014'
  ctx.beginPath()
  ctx.arc(centerX, centerY, 72, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#fff'
  setMonoFont(ctx, 58, 900)
  ctx.textAlign = 'center'
  ctx.fillText(String(snapshot.topTeams.length), centerX, centerY + 6)
  ctx.fillStyle = '#c5d0d5'
  setFont(ctx, 20, 700)
  ctx.fillText('TOP TEAMS', centerX, centerY + 45)
  ctx.textAlign = 'left'

  categoryCounts.forEach((category, index) => {
    const x = 450
    const y = 174 + index * 52
    ctx.fillStyle = category.color
    ctx.fillRect(x, y - 13, 17, 17)
    ctx.fillStyle = '#eff6f8'
    setFont(ctx, 25, 700)
    ctx.fillText(category.name, x + 34, y + 2)
    ctx.fillStyle = '#ffe17c'
    setMonoFont(ctx, 26, 900)
    ctx.fillText(String(category.solved), x + 198, y + 2)
    ctx.fillStyle = '#c3cdd2'
    setMonoFont(ctx, 21, 700)
    ctx.fillText(`${Math.round((category.solved / total) * 100)}%`, x + 243, y + 2)
  })
}

function drawTeamScorePanel(
  ctx: CanvasRenderingContext2D,
  snapshot: CtfSnapshot,
  width: number,
  height: number,
  accent: string,
) {
  drawPanelBase(ctx, width, height, '得分趋势（实时）', 'TOP TEAM SCORE CURVES', accent)
  const chart = { x: 116, y: 126, w: width - 250, h: height - 190 }
  const teams = snapshot.topTeams.slice(0, 8)
  const max = Math.max(...teams.map((team) => team.score), 1)

  ctx.strokeStyle = 'rgba(226, 242, 247, 0.14)'
  ctx.lineWidth = 1
  setMonoFont(ctx, 20, 700)
  ctx.fillStyle = 'rgba(205, 216, 220, 0.68)'
  for (let i = 0; i <= 4; i += 1) {
    const y = chart.y + (chart.h / 4) * i
    ctx.beginPath()
    ctx.moveTo(chart.x, y)
    ctx.lineTo(chart.x + chart.w, y)
    ctx.stroke()
    ctx.fillText(String(Math.round(max - (max / 4) * i)), 48, y + 7)
  }

  teams.forEach((team, teamIndex) => {
    const tone = teamRankColor(team.rank)
    const points = Array.from({ length: 9 }, (_, index) => {
      const u = index / 8
      const wobble = Math.sin(index * 1.7 + teamIndex) * 0.02
      const score = Math.max(0, team.previousScore * (0.72 + u * 0.28 + wobble) + (team.score - team.previousScore) * u)
      const x = chart.x + u * chart.w
      const y = chart.y + chart.h - (score / max) * chart.h
      return [x, y] as const
    })

    ctx.beginPath()
    points.forEach(([x, y], index) => {
      if (index === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.strokeStyle = tone
    ctx.lineWidth = team.rank <= 3 ? 5 : 3
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()

    const [lastX, lastY] = points[points.length - 1]
    ctx.fillStyle = tone
    ctx.beginPath()
    ctx.arc(lastX, lastY, team.rank <= 3 ? 8 : 5, 0, Math.PI * 2)
    ctx.fill()

    const legendX = width - 174
    const legendY = 116 + teamIndex * 42
    ctx.fillStyle = tone
    ctx.fillRect(legendX, legendY - 10, 18, 5)
    ctx.fillStyle = '#f4fbff'
    setFont(ctx, 20, 900)
    ctx.fillText(team.name, legendX + 28, legendY)
    ctx.fillStyle = tone
    setMonoFont(ctx, 22, 900)
    ctx.textAlign = 'right'
    ctx.fillText(String(team.score), width - 58, legendY)
    ctx.textAlign = 'left'
  })
}

function drawTeamHeatPanel(
  ctx: CanvasRenderingContext2D,
  snapshot: CtfSnapshot,
  width: number,
  height: number,
  accent: string,
) {
  drawPanelBase(ctx, width, height, '战队活跃度热力图', 'LAST 60 MINUTES', accent)
  ctx.fillStyle = '#cfd9dd'
  setFont(ctx, 19, 700)
  ctx.fillText('低', width - 276, 61)
  const grad = ctx.createLinearGradient(width - 228, 0, width - 72, 0)
  grad.addColorStop(0, 'rgba(108, 122, 132, 0.58)')
  grad.addColorStop(0.55, '#69f6ff')
  grad.addColorStop(1, '#ffd21f')
  ctx.fillStyle = grad
  ctx.fillRect(width - 228, 45, 150, 12)
  ctx.fillStyle = '#cfd9dd'
  ctx.fillText('高', width - 58, 61)

  const startX = 202
  const startY = 132
  const cellW = 48
  const cellH = 27
  const gap = 8
  snapshot.activity.slice(0, 8).forEach((row, rowIndex) => {
    const y = startY + rowIndex * (cellH + 18)
    ctx.fillStyle = '#f4f9fb'
    setFont(ctx, 20, 800)
    ctx.fillText(row.team, 42, y + 20)
    row.buckets.forEach((bucket, index) => {
      const x = startX + index * (cellW + gap)
      const alpha = bucket >= 0.42 ? 0.24 + bucket * 0.66 : 0.18 + bucket * 0.62
      ctx.fillStyle = bucket >= 0.42 ? `rgba(246, 210, 82, ${alpha})` : `rgba(105, 246, 255, ${alpha * 0.58})`
      ctx.fillRect(x, y, cellW, cellH)
      ctx.strokeStyle = 'rgba(226, 242, 247, 0.1)'
      ctx.lineWidth = 1
      ctx.strokeRect(x, y, cellW, cellH)
    })
  })

  ctx.fillStyle = 'rgba(205, 216, 220, 0.68)'
  setMonoFont(ctx, 18, 700)
  snapshot.heatmapTicks.forEach((tick, index) => {
    ctx.textAlign = 'center'
    ctx.fillText(tick, startX + index * 104, height - 36)
  })
  ctx.textAlign = 'left'
}

function drawChallengeCategoryPanel(ctx: CanvasRenderingContext2D, width: number, height: number, accent: string) {
  drawPanelBase(ctx, width, height, '分类统计', 'CHALLENGE CATEGORIES', accent)
  const stats = getChallengeCategoryStats()
  const left = 62
  const top = 132
  ctx.fillStyle = 'rgba(203, 216, 221, 0.72)'
  setFont(ctx, 21, 800)
  ctx.fillText('分类', left, top)
  ctx.textAlign = 'right'
  ctx.fillText('题目 / 已解 / 热门', width - 68, top)
  ctx.textAlign = 'left'

  stats.forEach((stat, index) => {
    const y = top + 64 + index * 104
    ctx.strokeStyle = 'rgba(226, 242, 247, 0.14)'
    ctx.beginPath()
    ctx.moveTo(left - 16, y + 48)
    ctx.lineTo(width - 60, y + 48)
    ctx.stroke()
    ctx.fillStyle = stat.accent
    ctx.fillRect(left, y - 18, 12, 58)
    ctx.fillStyle = '#f7fbff'
    setFont(ctx, 35, 900)
    ctx.fillText(stat.label, left + 30, y + 12)
    ctx.fillStyle = 'rgba(203, 216, 221, 0.66)'
    setMonoFont(ctx, 20, 800)
    ctx.fillText(`${stat.percent}% SOLVED`, left + 30, y + 42)
    ctx.textAlign = 'right'
    ctx.fillStyle = '#f4fbff'
    setMonoFont(ctx, 32, 900)
    ctx.fillText(`${stat.total} / ${stat.solved} / ${stat.hot}`, width - 68, y + 12)
    ctx.textAlign = 'left'
  })
}

function drawChallengeSummaryPanel(ctx: CanvasRenderingContext2D, width: number, height: number, accent: string) {
  drawPanelBase(ctx, width, height, '', '', accent)
  ctx.clearRect(0, 0, width, 84)
  const total = challengeData.length
  const solved = challengeData.filter((challenge) => challenge.status === 'solved').length
  const hot = challengeData.filter((challenge) => challenge.status === 'hot').length
  const locked = challengeData.filter((challenge) => challenge.status === 'locked').length

  ctx.strokeStyle = accent
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(width * 0.08, 34)
  ctx.lineTo(width * 0.92, 34)
  ctx.stroke()

  ctx.fillStyle = '#dbe4e8'
  setFont(ctx, 32, 900)
  ctx.fillText('题目视图', 130, 122)
  ctx.fillStyle = '#f4f7f8'
  setMonoFont(ctx, 84, 900)
  ctx.fillText('CHALLENGE ATLAS', 130, 208)

  const metrics = [
    ['TOTAL', total, '#f4fbff'],
    ['SOLVED', solved, '#69f6ff'],
    ['HOT', hot, '#ffd21f'],
    ['LOCKED', locked, '#87949c'],
  ] as const
  metrics.forEach(([label, value, color], index) => {
    const x = width - 720 + index * 170
    ctx.fillStyle = color
    setMonoFont(ctx, 58, 900)
    ctx.textAlign = 'center'
    ctx.fillText(String(value).padStart(2, '0'), x, 150)
    ctx.fillStyle = 'rgba(205, 216, 220, 0.74)'
    setMonoFont(ctx, 20, 800)
    ctx.fillText(label, x, 188)
  })
  ctx.textAlign = 'left'
}

function drawChallengeDetailPanel(
  ctx: CanvasRenderingContext2D,
  selectedChallenge: Challenge | null,
  width: number,
  height: number,
  accent: string,
) {
  drawPanelBase(ctx, width, height, '当前题目详情', 'SELECTED CHALLENGE', accent)
  if (!selectedChallenge) {
    ctx.fillStyle = '#f7fbff'
    setFont(ctx, 42, 900)
    ctx.fillText('等待节点选择', 72, 170)
    ctx.fillStyle = 'rgba(203, 216, 221, 0.72)'
    setFont(ctx, 25, 700)
    ctx.fillText('点击中间图谱中的题目节点查看详情。', 72, 224)
  } else {
    const meta = getCategoryMeta(selectedChallenge.category)
    ctx.fillStyle = meta.accent
    setMonoFont(ctx, 26, 900)
    ctx.fillText(`${meta.label.toUpperCase()} / ${selectedChallenge.difficulty.toUpperCase()}`, 72, 140)
    ctx.fillStyle = '#f7fbff'
    setFont(ctx, 46, 900)
    ctx.fillText(selectedChallenge.title, 72, 206)
    const rows = [
      ['分值', selectedChallenge.points],
      ['已解', selectedChallenge.solvedCount],
      ['提交', selectedChallenge.submitCount],
      ['状态', selectedChallenge.status.toUpperCase()],
    ]
    rows.forEach(([label, value], index) => {
      const y = 298 + index * 78
      ctx.fillStyle = 'rgba(255, 255, 255, 0.055)'
      ctx.fillRect(72, y - 38, width - 144, 54)
      ctx.fillStyle = 'rgba(203, 216, 221, 0.72)'
      setFont(ctx, 23, 800)
      ctx.fillText(String(label), 96, y)
      ctx.textAlign = 'right'
      ctx.fillStyle = index === rows.length - 1 ? meta.accent : '#f7fbff'
      setMonoFont(ctx, 31, 900)
      ctx.fillText(String(value), width - 96, y)
      ctx.textAlign = 'left'
    })
    ctx.fillStyle = 'rgba(203, 216, 221, 0.72)'
    setFont(ctx, 23, 800)
    ctx.fillText('BLOODS', 72, height - 128)
    ;[
      ['1ST', selectedChallenge.bloods?.first ?? selectedChallenge.firstBloodTeam ?? '尚未产生'],
      ['2ND', selectedChallenge.bloods?.second ?? '尚未产生'],
      ['3RD', selectedChallenge.bloods?.third ?? '尚未产生'],
    ].forEach(([label, value], index) => {
      const x = 72 + index * 250
      ctx.fillStyle = index === 0 ? '#ffd21f' : 'rgba(203, 216, 221, 0.72)'
      setMonoFont(ctx, 20, 900)
      ctx.fillText(label, x, height - 86)
      ctx.fillStyle = '#f7fbff'
      setFont(ctx, 24, 900)
      ctx.fillText(value, x + 48, height - 86)
    })
  }

  ctx.fillStyle = 'rgba(155, 221, 255, 0.18)'
  ctx.fillRect(72, height - 36, width - 144, 2)
}

function drawChallengeDonutPanel(ctx: CanvasRenderingContext2D, width: number, height: number, accent: string) {
  drawPanelBase(ctx, width, height, '题目分类分布', 'ATLAS DISTRIBUTION', accent)
  const stats = getChallengeCategoryStats()
  const total = Math.max(challengeData.length, 1)
  const centerX = 228
  const centerY = 288
  let cursor = -Math.PI / 2
  stats.forEach((stat) => {
    const angle = (stat.total / total) * Math.PI * 2
    ctx.beginPath()
    ctx.arc(centerX, centerY, 132, cursor, cursor + angle)
    ctx.lineWidth = 54
    ctx.strokeStyle = stat.accent
    ctx.stroke()
    cursor += angle
  })
  ctx.fillStyle = '#071014'
  ctx.beginPath()
  ctx.arc(centerX, centerY, 72, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#fff'
  setMonoFont(ctx, 58, 900)
  ctx.textAlign = 'center'
  ctx.fillText(String(total), centerX, centerY + 6)
  ctx.fillStyle = '#c5d0d5'
  setFont(ctx, 20, 700)
  ctx.fillText('ATLAS', centerX, centerY + 45)
  ctx.textAlign = 'left'

  stats.forEach((stat, index) => {
    const x = 450
    const y = 174 + index * 52
    ctx.fillStyle = stat.accent
    ctx.fillRect(x, y - 13, 17, 17)
    ctx.fillStyle = '#eff6f8'
    setFont(ctx, 25, 700)
    ctx.fillText(stat.label, x + 34, y + 2)
    ctx.fillStyle = '#ffe17c'
    setMonoFont(ctx, 26, 900)
    ctx.fillText(String(stat.total), x + 198, y + 2)
    ctx.fillStyle = '#c3cdd2'
    setMonoFont(ctx, 21, 700)
    ctx.fillText(`${stat.percent}%`, x + 243, y + 2)
  })
}

function drawChallengeTrendPanel(ctx: CanvasRenderingContext2D, width: number, height: number, accent: string) {
  drawPanelBase(ctx, width, height, '解题趋势', 'SOLVE TREND', accent)
  const points = [24, 48, 73, 115, 151, 202, 248, 291, 336, 382, 438]
  const submits = [68, 132, 211, 328, 418, 560, 688, 790, 908, 1042, 1184]
  const chart = { x: 118, y: 126, w: width - 200, h: height - 190 }
  const max = Math.max(...submits)
  ctx.strokeStyle = 'rgba(226, 242, 247, 0.14)'
  for (let i = 0; i <= 4; i += 1) {
    const y = chart.y + (chart.h / 4) * i
    ctx.beginPath()
    ctx.moveTo(chart.x, y)
    ctx.lineTo(chart.x + chart.w, y)
    ctx.stroke()
  }
  const toPoint = (value: number, index: number, source: number[]) => {
    const x = chart.x + (index / Math.max(source.length - 1, 1)) * chart.w
    const y = chart.y + chart.h - (value / max) * chart.h
    return [x, y] as const
  }
  const drawLine = (source: number[], color: string, widthPx: number) => {
    ctx.beginPath()
    source.forEach((value, index) => {
      const [x, y] = toPoint(value, index, source)
      if (index === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.strokeStyle = color
    ctx.lineWidth = widthPx
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
  }
  drawLine(submits, 'rgba(155, 221, 255, 0.48)', 4)
  drawLine(points, '#ffd21f', 7)
  ctx.fillStyle = '#ffd21f'
  setMonoFont(ctx, 20, 900)
  ctx.fillText('SOLVES', chart.x, height - 40)
  ctx.fillStyle = 'rgba(155, 221, 255, 0.78)'
  ctx.fillText('SUBMISSIONS', chart.x + 160, height - 40)
}

function drawChallengeHotPanel(ctx: CanvasRenderingContext2D, width: number, height: number, accent: string) {
  drawPanelBase(ctx, width, height, '热门题目 TOP 10', 'HOT CHALLENGES', accent)
  getHotChallenges().forEach((challenge, index) => {
    const y = 132 + index * 74
    const meta = getCategoryMeta(challenge.category)
    ctx.strokeStyle = 'rgba(226, 242, 247, 0.13)'
    ctx.beginPath()
    ctx.moveTo(62, y + 38)
    ctx.lineTo(width - 62, y + 38)
    ctx.stroke()
    ctx.fillStyle = challenge.status === 'hot' ? '#ffd21f' : meta.accent
    setMonoFont(ctx, 25, 900)
    ctx.fillText(String(index + 1).padStart(2, '0'), 70, y)
    ctx.fillStyle = '#f7fbff'
    setFont(ctx, 28, 900)
    ctx.fillText(challenge.title, 128, y)
    ctx.fillStyle = 'rgba(203, 216, 221, 0.72)'
    setMonoFont(ctx, 19, 800)
    ctx.fillText(`${meta.label.toUpperCase()} / ${challenge.difficulty.toUpperCase()}`, 128, y + 28)
    ctx.textAlign = 'right'
    ctx.fillStyle = '#ffd21f'
    setMonoFont(ctx, 31, 900)
    ctx.fillText(String(challenge.submitCount), width - 68, y)
    ctx.textAlign = 'left'
  })
}

function drawChallengeTexture(
  kind: PanelKind,
  selectedChallenge: Challenge | null,
  width: number,
  height: number,
  accent: string,
) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  ctx.imageSmoothingEnabled = true

  switch (kind) {
    case 'rank':
      drawChallengeCategoryPanel(ctx, width, height, accent)
      break
    case 'timer':
      drawChallengeSummaryPanel(ctx, width, height, accent)
      break
    case 'solves':
      drawChallengeDetailPanel(ctx, selectedChallenge, width, height, accent)
      break
    case 'donut':
      drawChallengeDonutPanel(ctx, width, height, accent)
      break
    case 'line':
      drawChallengeTrendPanel(ctx, width, height, accent)
      break
    case 'heat':
      drawChallengeHotPanel(ctx, width, height, accent)
      break
  }

  return canvas
}

function drawTeamTextureToContext(
  ctx: CanvasRenderingContext2D,
  kind: PanelKind,
  snapshot: CtfSnapshot,
  width: number,
  height: number,
  accent: string,
  motion?: HudTextureMotion,
) {
  switch (kind) {
    case 'rank':
      drawTeamRankPanel(ctx, snapshot, width, height, accent, motion)
      break
    case 'timer':
      drawTeamSummaryPanel(ctx, snapshot, width, height, accent, motion)
      break
    case 'solves':
      drawTeamSolvesPanel(ctx, snapshot, width, height, accent, motion)
      break
    case 'donut':
      drawTeamCategoryPanel(ctx, snapshot, width, height, accent)
      break
    case 'line':
      drawTeamScorePanel(ctx, snapshot, width, height, accent)
      break
    case 'heat':
      drawTeamHeatPanel(ctx, snapshot, width, height, accent)
      break
  }
}

function drawTeamTexture(
  kind: PanelKind,
  snapshot: CtfSnapshot,
  width: number,
  height: number,
  accent: string,
  motion?: HudTextureMotion,
) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  ctx.imageSmoothingEnabled = true
  drawTeamTextureToContext(ctx, kind, snapshot, width, height, accent, motion)

  return canvas
}

function drawTexture(
  kind: PanelKind,
  snapshot: CtfSnapshot,
  width: number,
  height: number,
  accent: string,
  viewMode: HudViewMode,
  selectedChallenge: Challenge | null,
) {
  if (viewMode === 'challenge') {
    return drawChallengeTexture(kind, selectedChallenge, width, height, accent)
  }
  if (viewMode === 'team') {
    return drawTeamTexture(kind, snapshot, width, height, accent)
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  ctx.imageSmoothingEnabled = true

  switch (kind) {
    case 'rank':
      drawRankPanel(ctx, snapshot, width, height, accent)
      break
    case 'timer':
      drawTimerPanel(ctx, snapshot, width, height, accent)
      break
    case 'solves':
      drawSolvesPanel(ctx, snapshot, width, height, accent)
      break
    case 'donut':
      drawDonutPanel(ctx, snapshot, width, height, accent)
      break
    case 'line':
      drawLinePanel(ctx, snapshot, width, height, accent)
      break
    case 'heat':
      drawHeatPanel(ctx, snapshot, width, height, accent)
      break
  }

  return canvas
}

function makeCurvedGeometry(width: number, height: number, arc: number) {
  const segmentsX = 36
  const segmentsY = 5
  const radius = width / arc
  const edgeZ = Math.cos(arc / 2)
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []

  for (let yIndex = 0; yIndex <= segmentsY; yIndex += 1) {
    const v = yIndex / segmentsY
    for (let xIndex = 0; xIndex <= segmentsX; xIndex += 1) {
      const u = xIndex / segmentsX
      const theta = (u - 0.5) * arc
      const x = Math.sin(theta) * radius
      const z = (Math.cos(theta) - edgeZ) * radius
      const y = (0.5 - v) * height
      positions.push(x, y, z)
      uvs.push(u, 1 - v)
    }
  }

  for (let yIndex = 0; yIndex < segmentsY; yIndex += 1) {
    for (let xIndex = 0; xIndex < segmentsX; xIndex += 1) {
      const a = yIndex * (segmentsX + 1) + xIndex
      const b = a + 1
      const c = a + segmentsX + 1
      const d = c + 1
      indices.push(a, c, b, b, c, d)
    }
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function usePanelTexture(
  config: PanelConfig,
  snapshot: CtfSnapshot,
  viewMode: HudViewMode,
  selectedChallenge: Challenge | null,
) {
  const texture = useMemo(() => {
    const canvas = drawTexture(
      config.kind,
      snapshot,
      config.texture[0],
      config.texture[1],
      config.accent,
      viewMode,
      selectedChallenge,
    )
    const nextTexture = new CanvasTexture(canvas)
    nextTexture.colorSpace = SRGBColorSpace
    nextTexture.minFilter = LinearFilter
    nextTexture.magFilter = LinearFilter
    nextTexture.needsUpdate = true
    return nextTexture
  }, [config, selectedChallenge, snapshot, viewMode])

  useEffect(() => () => texture.dispose(), [texture])
  return texture
}

function redrawTeamPanelTexture(
  texture: CanvasTexture,
  config: PanelConfig,
  snapshot: CtfSnapshot,
  motion: HudTextureMotion,
) {
  const canvas = texture.image as HTMLCanvasElement
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.imageSmoothingEnabled = true
  drawTeamTextureToContext(ctx, config.kind, snapshot, config.texture[0], config.texture[1], config.accent, motion)
  texture.needsUpdate = true
}

function HudPanelMesh({
  config,
  dimmed,
  index,
  selectedChallenge,
  snapshot,
  viewMode,
}: {
  config: PanelConfig
  dimmed: boolean
  index: number
  selectedChallenge: Challenge | null
  snapshot: CtfSnapshot
  viewMode: HudViewMode
}) {
  const group = useRef<Group>(null)
  const mainMaterial = useRef<MeshBasicMaterial>(null)
  const opacity = useRef(1)
  const textureMotion = useRef({ key: '', pending: false, startedAt: -10 })
  const texture = usePanelTexture(config, snapshot, viewMode, selectedChallenge)
  const solveKey = viewMode === 'team' ? latestSolveKey(snapshot) : 'idle'
  const geometry = useMemo(
    () => makeCurvedGeometry(config.width, config.height, config.arc),
    [config.arc, config.height, config.width],
  )

  useEffect(() => () => geometry.dispose(), [geometry])

  useEffect(() => {
    if (viewMode !== 'team') return
    if (textureMotion.current.key === solveKey) return
    textureMotion.current.key = solveKey
    textureMotion.current.pending = true
  }, [solveKey, viewMode])

  useFrame((state) => {
    if (textureMotion.current.pending) {
      textureMotion.current.pending = false
      textureMotion.current.startedAt = state.clock.elapsedTime
    }
    if (viewMode === 'team' && (config.kind === 'rank' || config.kind === 'solves' || config.kind === 'timer')) {
      const elapsed = Math.max(0, state.clock.elapsedTime - textureMotion.current.startedAt)
      if (elapsed < 2.2) {
        redrawTeamPanelTexture(texture, config, snapshot, {
          elapsed,
          eventProgress: clamp01(elapsed / 0.82),
          rankProgress: clamp01((elapsed - 0.18) / 1.24),
        })
      }
    }

    opacity.current += ((dimmed ? 0.12 : 1) - opacity.current) * 0.08
    if (mainMaterial.current) mainMaterial.current.opacity = 0.94 * opacity.current

    const target = group.current
    if (!target) return
    const side = config.position[0] < -0.1 ? -1 : config.position[0] > 0.1 ? 1 : 0
    const float = Math.sin(state.clock.elapsedTime * 0.7 + index) * 0.018
    target.position.y = config.position[1] + float + state.pointer.y * 0.035
    target.position.x = config.position[0] + state.pointer.x * (0.05 + Math.abs(side) * 0.035)
    target.position.z = config.position[2] - (dimmed ? 0.16 : 0)
    target.scale.setScalar(target.scale.x + (1 - target.scale.x) * 0.08)
    target.rotation.x = config.rotation[0] - state.pointer.y * 0.025
    target.rotation.y = config.rotation[1] - state.pointer.x * 0.035 + side * state.pointer.y * 0.012
  })

  return (
    <group ref={group} position={config.position} rotation={config.rotation}>
      <mesh geometry={geometry} renderOrder={20} raycast={() => undefined}>
        <meshBasicMaterial
          ref={mainMaterial}
          map={texture}
          transparent
          opacity={0.94}
          side={DoubleSide}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

function CurvedShell() {
  return (
    <group position={[0, -0.55, 0.2]}>
      {[4.7, 5.25, 5.78].map((radius, index) => (
        <mesh
          key={radius}
          rotation={[Math.PI / 2, 0, 0]}
          position={[0, -1.72 + index * 0.05, 0]}
          raycast={() => undefined}
        >
          <torusGeometry args={[radius, 0.008 + index * 0.002, 8, 220]} />
          <meshBasicMaterial
            color={index === 1 ? '#ffd21f' : '#9bddff'}
            transparent
            opacity={index === 1 ? 0.28 : 0.18}
            blending={AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
      {Array.from({ length: 18 }, (_, index) => {
        const angle = (-85 + index * 10) * (Math.PI / 180)
        const radius = 5.68
        return (
          <line key={angle}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                args={[
                  new Float32Array([
                    Math.sin(angle) * 2.2,
                    -1.72,
                    Math.cos(angle) * 2.2,
                    Math.sin(angle) * radius,
                    -1.7,
                    Math.cos(angle) * radius,
                  ]),
                  3,
                ]}
              />
            </bufferGeometry>
            <lineBasicMaterial
              color={index % 3 === 0 ? '#ffd21f' : '#9bddff'}
              transparent
              opacity={index % 3 === 0 ? 0.16 : 0.09}
              blending={AdditiveBlending}
              depthWrite={false}
            />
          </line>
        )
      })}
    </group>
  )
}

export function HudPanelMeshes({
  dimmed = false,
  selectedChallenge = null,
  snapshot,
  viewMode = 'realtime',
}: {
  dimmed?: boolean
  selectedChallenge?: Challenge | null
  snapshot: CtfSnapshot
  viewMode?: HudViewMode
}) {
  const activePanels = viewMode === 'team' ? teamPanels : panels

  return (
    <group>
      <CurvedShell />
      {activePanels.map((panel, index) => (
        <HudPanelMesh
          key={panel.kind}
          config={panel}
          dimmed={dimmed}
          index={index}
          selectedChallenge={selectedChallenge}
          snapshot={snapshot}
          viewMode={viewMode}
        />
      ))}
    </group>
  )
}
