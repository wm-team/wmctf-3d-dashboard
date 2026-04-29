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
import type { CtfSnapshot } from '@/types/ctf'

type PanelKind = 'rank' | 'timer' | 'solves' | 'donut' | 'line' | 'heat'

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

function setFont(ctx: CanvasRenderingContext2D, size: number, weight = 700) {
  ctx.font = `${weight} ${size}px "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif`
}

function setMonoFont(ctx: CanvasRenderingContext2D, size: number, weight = 700) {
  ctx.font = `${weight} ${size}px "DIN Condensed", "Bahnschrift", "Arial Narrow", sans-serif`
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

function drawTexture(kind: PanelKind, snapshot: CtfSnapshot, width: number, height: number, accent: string) {
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

function usePanelTexture(config: PanelConfig, snapshot: CtfSnapshot) {
  const texture = useMemo(() => {
    const canvas = drawTexture(
      config.kind,
      snapshot,
      config.texture[0],
      config.texture[1],
      config.accent,
    )
    const nextTexture = new CanvasTexture(canvas)
    nextTexture.colorSpace = SRGBColorSpace
    nextTexture.minFilter = LinearFilter
    nextTexture.magFilter = LinearFilter
    nextTexture.needsUpdate = true
    return nextTexture
  }, [config, snapshot])

  useEffect(() => () => texture.dispose(), [texture])
  return texture
}

function HudPanelMesh({
  config,
  dimmed,
  index,
  snapshot,
}: {
  config: PanelConfig
  dimmed: boolean
  index: number
  snapshot: CtfSnapshot
}) {
  const group = useRef<Group>(null)
  const mainMaterial = useRef<MeshBasicMaterial>(null)
  const glowMaterial = useRef<MeshBasicMaterial>(null)
  const backMaterial = useRef<MeshBasicMaterial>(null)
  const opacity = useRef(1)
  const texture = usePanelTexture(config, snapshot)
  const geometry = useMemo(
    () => makeCurvedGeometry(config.width, config.height, config.arc),
    [config.arc, config.height, config.width],
  )

  useEffect(() => () => geometry.dispose(), [geometry])

  useFrame((state) => {
    opacity.current += ((dimmed ? 0.12 : 1) - opacity.current) * 0.08
    if (mainMaterial.current) mainMaterial.current.opacity = 0.94 * opacity.current
    if (glowMaterial.current) glowMaterial.current.opacity = 0.18 * opacity.current
    if (backMaterial.current) backMaterial.current.opacity = 0.1 * opacity.current

    const target = group.current
    if (!target) return
    const side = config.position[0] < -0.1 ? -1 : config.position[0] > 0.1 ? 1 : 0
    const float = Math.sin(state.clock.elapsedTime * 0.7 + index) * 0.018
    target.position.y = config.position[1] + float + state.pointer.y * 0.035
    target.position.x = config.position[0] + state.pointer.x * (0.05 + Math.abs(side) * 0.035)
    target.position.z = config.position[2] - (dimmed ? 0.16 : 0)
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
      <mesh
        geometry={geometry}
        renderOrder={21}
        scale={[1.008, 1.012, 1]}
        position={[0, 0, 0.012]}
        raycast={() => undefined}
      >
        <meshBasicMaterial
          ref={glowMaterial}
          map={texture}
          transparent
          opacity={0.18}
          side={DoubleSide}
          blending={AdditiveBlending}
          depthTest={false}
          depthWrite={false}
        />
      </mesh>
      <mesh
        geometry={geometry}
        renderOrder={19}
        scale={[1.026, 1.034, 1]}
        position={[0, 0, -0.028]}
        raycast={() => undefined}
      >
        <meshBasicMaterial
          ref={backMaterial}
          color={config.accent}
          transparent
          opacity={0.1}
          side={DoubleSide}
          blending={AdditiveBlending}
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
  snapshot,
}: {
  dimmed?: boolean
  snapshot: CtfSnapshot
}) {
  return (
    <group>
      <CurvedShell />
      {panels.map((panel, index) => (
        <HudPanelMesh
          key={panel.kind}
          config={panel}
          dimmed={dimmed}
          index={index}
          snapshot={snapshot}
        />
      ))}
    </group>
  )
}
