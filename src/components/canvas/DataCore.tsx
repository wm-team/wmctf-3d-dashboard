import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  BufferGeometry,
  CanvasTexture,
  DoubleSide,
  Float32BufferAttribute,
  LinearFilter,
  SRGBColorSpace,
  type Group,
  type Mesh,
  MeshBasicMaterial,
} from 'three'
import type { CategoryStat, CtfSnapshot } from '@/types/ctf'

const ripplePalette = ['#ffe566', '#7cfbff', '#fff1b8', '#62d4ff', '#ffd230']

function setFont(ctx: CanvasRenderingContext2D, size: number, weight = 700) {
  ctx.font = `${weight} ${size}px "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif`
}

function setMonoFont(ctx: CanvasRenderingContext2D, size: number, weight = 700) {
  ctx.font = `${weight} ${size}px "DIN Condensed", "Bahnschrift", "Arial Narrow", sans-serif`
}

function ExpandingDiscRipples() {
  const meshes = useRef<Mesh[]>([])

  useFrame((state) => {
    const cycle = 2.35
    const t = state.clock.elapsedTime
    const n = ripplePalette.length

    for (let i = 0; i < n; i += 1) {
      const mesh = meshes.current[i]
      if (!mesh) continue
      const u = ((t + (i * cycle) / n) % cycle) / cycle
      const scale = 0.16 + u * 5.1
      mesh.scale.setScalar(scale)
      const material = mesh.material as MeshBasicMaterial
      material.opacity = (1 - u) ** 1.05 * 0.78
    }
  })

  return (
    <group rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.042, 0]}>
      {ripplePalette.map((color, index) => (
        <mesh
          key={`${color}-${index}`}
          ref={(element) => {
            if (element) meshes.current[index] = element
          }}
        >
          <ringGeometry args={[0.9, 0.972, 128]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0}
            side={DoubleSide}
            blending={AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  )
}

const terrainRadius = 4.48

type CategoryNode = {
  amp: number
  calloutPosition: [number, number, number]
  color: string
  height: number
  label: string
  name: string
  phase: number
  spread: number
  x: number
  z: number
}

const categoryNodes: CategoryNode[] = [
  {
    name: 'Crypto',
    label: '密码分析',
    x: -2.58,
    z: 0.86,
    color: '#7df7ff',
    phase: 0.35,
    amp: 1.18,
    spread: 0.88,
    height: 0.5,
    calloutPosition: [-4.12, 1.28, 0.82],
  },
  {
    name: 'Pwn',
    label: '二进制漏洞',
    x: -0.12,
    z: 1.36,
    color: '#ffd21f',
    phase: 1.2,
    amp: 1.36,
    spread: 0.96,
    height: 0.72,
    calloutPosition: [-1.8, 1.72, 1.92],
  },
  {
    name: 'Web',
    label: '入口渗透',
    x: 2.46,
    z: 0.58,
    color: '#ffd21f',
    phase: 2.1,
    amp: 1.22,
    spread: 0.92,
    height: 0.54,
    calloutPosition: [3.94, 1.28, 0.88],
  },
  {
    name: 'Rev',
    label: '逆向工程',
    x: -1.72,
    z: -0.96,
    color: '#f4f8ff',
    phase: 3.05,
    amp: 1.1,
    spread: 0.82,
    height: 0.44,
    calloutPosition: [-3.96, 0.62, -0.68],
  },
  {
    name: 'Misc',
    label: '综合杂项',
    x: 0.58,
    z: -1.08,
    color: '#fff1a8',
    phase: 4.05,
    amp: 1.32,
    spread: 0.98,
    height: 0.62,
    calloutPosition: [1.08, 0.46, -1.72],
  },
  {
    name: 'Forensics',
    label: '取证溯源',
    x: 2.05,
    z: 1.48,
    color: '#9bddff',
    phase: 5.0,
    amp: 1.08,
    spread: 0.84,
    height: 0.46,
    calloutPosition: [3.84, 1.62, 1.56],
  },
]

function getCategoryNode(name: string, fallbackIndex = 0) {
  return categoryNodes.find((node) => node.name === name) ?? categoryNodes[fallbackIndex % categoryNodes.length]
}

function terrainHeight(x: number, z: number) {
  const radius = Math.hypot(x, z)
  const edgeFalloff = Math.max(0, 1 - (radius / terrainRadius) ** 2.5)
  const ridges =
    Math.sin(x * 2.15 + z * 0.7) * 0.085 +
    Math.cos(z * 2.65 - x * 0.35) * 0.07 +
    Math.sin((x - z) * 3.2) * 0.038 +
    Math.cos((x + z) * 4.1) * 0.026

  const peakHeight = categoryNodes.reduce((height, seed) => {
    const amp = seed.amp * 0.62
    const distanceSquared = (x - seed.x) ** 2 + (z - seed.z) ** 2
    return height + amp * Math.exp(-distanceSquared / (seed.spread ** 2)) + 0.08 * Math.exp(-distanceSquared / 4.2)
  }, 0)

  return Math.max(0, (peakHeight + ridges * 0.9) * edgeFalloff * 0.16)
}

function makeTerrainGeometry() {
  const ringCount = 38
  const segments = 168
  const positions: number[] = [0, terrainHeight(0, 0), 0]
  const indices: number[] = []

  for (let ring = 1; ring <= ringCount; ring += 1) {
    const radius = (ring / ringCount) * terrainRadius
    for (let segment = 0; segment < segments; segment += 1) {
      const angle = (segment / segments) * Math.PI * 2
      const x = Math.cos(angle) * radius
      const z = Math.sin(angle) * radius
      positions.push(x, terrainHeight(x, z), z)
    }
  }

  for (let segment = 0; segment < segments; segment += 1) {
    indices.push(0, 1 + ((segment + 1) % segments), 1 + segment)
  }

  for (let ring = 2; ring <= ringCount; ring += 1) {
    const previousStart = 1 + (ring - 2) * segments
    const currentStart = 1 + (ring - 1) * segments

    for (let segment = 0; segment < segments; segment += 1) {
      const next = (segment + 1) % segments
      const previousA = previousStart + segment
      const previousB = previousStart + next
      const currentA = currentStart + segment
      const currentB = currentStart + next
      indices.push(previousA, previousB, currentA, currentA, previousB, currentB)
    }
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function makeContourPoints(seed: CategoryNode, level: number) {
  const points: number[] = []
  const radius = 0.28 + level * 0.17
  const stretchX = 1.08 + Math.sin(seed.phase * 0.8) * 0.34
  const stretchZ = 0.9 + Math.cos(seed.phase * 0.7) * 0.24
  const rotation = seed.phase * 0.42
  const cosR = Math.cos(rotation)
  const sinR = Math.sin(rotation)

  for (let index = 0; index <= 168; index += 1) {
    const angle = (index / 168) * Math.PI * 2
    const warp =
      Math.sin(angle * 3 + seed.phase) * 0.11 +
      Math.cos(angle * 5 - seed.phase * 0.8) * 0.06 +
      Math.sin(angle * 9 + level) * 0.025 +
      Math.cos(angle * 13 + seed.phase + level * 0.4) * 0.014
    const r = radius + warp
    const localX = Math.cos(angle) * r * stretchX
    const localZ = Math.sin(angle) * r * stretchZ
    const x = seed.x + localX * cosR - localZ * sinR
    const z = seed.z + localX * sinR + localZ * cosR
    const y = terrainHeight(x, z) + 0.075 + level * 0.006
    points.push(x, y, z)
  }

  return points
}

const mapBoundary: Array<[number, number]> = [
  [-3.62, 0.64],
  [-3.15, 1.78],
  [-2.2, 2.36],
  [-1.05, 2.18],
  [-0.25, 2.64],
  [0.9, 2.36],
  [1.72, 2.04],
  [2.92, 1.82],
  [3.55, 0.92],
  [3.12, 0.12],
  [3.74, -0.68],
  [2.66, -1.26],
  [1.84, -2.05],
  [0.58, -1.82],
  [-0.22, -2.45],
  [-1.24, -2.02],
  [-2.42, -2.22],
  [-2.96, -1.32],
  [-3.86, -0.92],
  [-3.42, -0.08],
]

const routePaths: Array<{ color: string; points: Array<[number, number]> }> = [
  {
    color: '#ffd21f',
    points: [
      [-2.36, -0.92],
      [-1.22, -0.54],
      [0.38, -1.2],
      [1.36, -0.88],
      [2.42, -0.78],
    ],
  },
  {
    color: '#fff6c8',
    points: [
      [0.38, -1.2],
      [0.18, -0.38],
      [-0.02, 0.42],
      [-0.28, 1.46],
    ],
  },
  {
    color: '#67f4ff',
    points: [
      [-2.55, 1.02],
      [-1.54, 1.2],
      [-0.28, 1.46],
      [0.92, 1.28],
      [2.36, 1.0],
    ],
  },
]

const mapRegions: Array<{ points: Array<[number, number]>; stroke: string }> = [
  {
    stroke: '#68f4ff',
    points: [
      [-3.36, 1.42],
      [-2.42, 2.1],
      [-1.28, 1.94],
      [-0.76, 1.28],
      [-1.28, 0.52],
      [-2.58, 0.36],
      [-3.3, 0.76],
    ],
  },
  {
    stroke: '#ffd21f',
    points: [
      [-0.88, 1.52],
      [-0.18, 2.18],
      [0.94, 2.04],
      [1.48, 1.42],
      [0.82, 0.66],
      [-0.18, 0.46],
      [-0.78, 0.88],
    ],
  },
  {
    stroke: '#bfefff',
    points: [
      [1.36, 1.4],
      [2.56, 1.68],
      [3.12, 0.92],
      [2.84, 0.14],
      [1.68, 0.02],
      [0.84, 0.58],
    ],
  },
  {
    stroke: '#f4f8ff',
    points: [
      [-3.28, 0.08],
      [-2.4, 0.38],
      [-1.22, 0.0],
      [-1.16, -0.92],
      [-2.22, -1.52],
      [-3.12, -1.14],
      [-3.62, -0.56],
    ],
  },
  {
    stroke: '#fff1a8',
    points: [
      [-1.08, 0.08],
      [-0.1, 0.42],
      [0.98, 0.14],
      [1.38, -0.66],
      [0.78, -1.46],
      [-0.34, -1.6],
      [-1.04, -0.9],
    ],
  },
  {
    stroke: '#9bddff',
    points: [
      [1.36, -0.02],
      [2.82, 0.04],
      [3.28, -0.74],
      [2.32, -1.44],
      [1.1, -1.36],
      [0.9, -0.58],
    ],
  },
]

function makeBoundaryGeometry() {
  const points: number[] = []
  mapBoundary.forEach(([x, z]) => points.push(x, 0.096, z))
  points.push(mapBoundary[0][0], 0.096, mapBoundary[0][1])
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(points, 3))
  return geometry
}

function makeRouteGeometry(path: Array<[number, number]>, y = 0.14) {
  const points: number[] = []
  path.forEach(([x, z]) => points.push(x, y, z))
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(points, 3))
  return geometry
}

function makeTopoMapTexture() {
  const width = 1400
  const height = 900
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  const scale = 150
  const toCanvas = (x: number, z: number) => [width / 2 + x * scale, height / 2 - z * scale] as const

  ctx.clearRect(0, 0, width, height)
  ctx.save()
  ctx.beginPath()
  mapBoundary.forEach(([x, z], index) => {
    const [px, py] = toCanvas(x, z)
    if (index === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  })
  ctx.closePath()
  ctx.fillStyle = 'rgba(4, 14, 17, 0.18)'
  ctx.fill()
  ctx.clip()

  const fillRegion = (region: (typeof mapRegions)[number]) => {
    ctx.beginPath()
    region.points.forEach(([x, z], index) => {
      const [px, py] = toCanvas(x, z)
      if (index === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    })
    ctx.closePath()
    ctx.fillStyle = region.color
    ctx.fill()
    ctx.strokeStyle = region.stroke
    ctx.globalAlpha = 0.54
    ctx.lineWidth = 3.2
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  mapRegions.forEach(fillRegion)

  ctx.fillStyle = 'rgba(255, 255, 255, 0.24)'
  for (let i = 0; i < 56; i += 1) {
    const x = 90 + ((i * 97) % (width - 180))
    const y = 70 + ((i * 53) % (height - 140))
    ctx.fillRect(x, y, i % 7 === 0 ? 3 : 1.6, i % 7 === 0 ? 3 : 1.6)
  }

  const drawTopoRing = (
    seed: CategoryNode,
    level: number,
    color: string,
    alpha: number,
  ) => {
    const radius = 0.32 + level * 0.24
    const stretchX = 1.1 + Math.sin(seed.phase * 0.8) * 0.36
    const stretchZ = 0.82 + Math.cos(seed.phase * 0.7) * 0.28
    const rotation = seed.phase * 0.42
    const cosR = Math.cos(rotation)
    const sinR = Math.sin(rotation)

    ctx.beginPath()
    for (let index = 0; index <= 180; index += 1) {
      const angle = (index / 180) * Math.PI * 2
      const warp =
        Math.sin(angle * 3 + seed.phase) * 0.12 +
        Math.cos(angle * 6 - seed.phase * 0.8) * 0.05 +
        Math.sin(angle * 11 + level) * 0.028
      const localX = Math.cos(angle) * (radius + warp) * stretchX
      const localZ = Math.sin(angle) * (radius + warp) * stretchZ
      const x = seed.x + localX * cosR - localZ * sinR
      const z = seed.z + localX * sinR + localZ * cosR
      const [px, py] = toCanvas(x, z)
      if (index === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    }
    ctx.strokeStyle = color
    ctx.globalAlpha = alpha
    ctx.lineWidth = level % 3 === 0 ? 3.2 : 1.8
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  categoryNodes.forEach((seed) => {
    for (let level = 0; level < 6; level += 1) {
      drawTopoRing(seed, level, seed.color, 0.34 + level * 0.055)
    }
  })

  routePaths.forEach((route, routeIndex) => {
    ctx.beginPath()
    route.points.forEach(([x, z], index) => {
      const [px, py] = toCanvas(x, z)
      if (index === 0) ctx.moveTo(px, py)
      else ctx.lineTo(px, py)
    })
    ctx.strokeStyle = route.color
    ctx.lineWidth = routeIndex === 1 ? 6 : 3.4
    ctx.shadowColor = route.color
    ctx.shadowBlur = routeIndex === 1 ? 18 : 10
    ctx.stroke()
    ctx.shadowBlur = 0
  })

  categoryNodes.forEach((node, index) => {
    const [x, y] = toCanvas(node.x, node.z)
    ctx.strokeStyle = node.color
    ctx.fillStyle = node.color
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.arc(x, y, 26 + index * 2, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(x, y, 7, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(x - 38, y)
    ctx.lineTo(x - 17, y)
    ctx.moveTo(x + 17, y)
    ctx.lineTo(x + 38, y)
    ctx.moveTo(x, y - 38)
    ctx.lineTo(x, y - 17)
    ctx.moveTo(x, y + 17)
    ctx.lineTo(x, y + 38)
    ctx.stroke()
    ctx.fillStyle = 'rgba(246, 250, 255, 0.76)'
    setMonoFont(ctx, 21, 900)
    ctx.fillText(node.name.toUpperCase(), x + 34, y - 16)
  })

  ctx.restore()

  ctx.beginPath()
  mapBoundary.forEach(([x, z], index) => {
    const [px, py] = toCanvas(x, z)
    if (index === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  })
  ctx.closePath()
  ctx.strokeStyle = 'rgba(255, 242, 166, 0.72)'
  ctx.lineWidth = 5
  ctx.shadowColor = '#ffd21f'
  ctx.shadowBlur = 16
  ctx.stroke()
  ctx.shadowBlur = 0

  return canvas
}

function OrbitRing({
  color,
  opacity,
  radius,
  tube = 0.012,
}: {
  color: string
  opacity: number
  radius: number
  tube?: number
}) {
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[radius, tube, 8, 220]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        blending={AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  )
}

function categoryPanelPath(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const cut = 22
  ctx.beginPath()
  ctx.moveTo(cut, 0)
  ctx.lineTo(width - cut * 1.35, 0)
  ctx.lineTo(width, cut * 0.95)
  ctx.lineTo(width - 7, height - cut * 0.7)
  ctx.lineTo(width - cut * 1.5, height)
  ctx.lineTo(cut * 0.7, height)
  ctx.lineTo(0, height - cut * 1.05)
  ctx.lineTo(7, cut * 0.9)
  ctx.closePath()
}

function makeCategoryTexture(category: CategoryStat, node: CategoryNode, index: number) {
  const width = 512
  const height = 184
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  ctx.clearRect(0, 0, width, height)
  ctx.save()
  categoryPanelPath(ctx, width, height)
  ctx.clip()

  const fill = ctx.createLinearGradient(0, 0, width, height)
  fill.addColorStop(0, 'rgba(22, 38, 43, 0.82)')
  fill.addColorStop(0.44, 'rgba(8, 16, 19, 0.54)')
  fill.addColorStop(1, 'rgba(3, 9, 11, 0.88)')
  ctx.fillStyle = fill
  ctx.fillRect(0, 0, width, height)

  const glow = ctx.createRadialGradient(width * 0.22, height * 0.1, 4, width * 0.24, height * 0.18, width * 0.58)
  glow.addColorStop(0, `${node.color}66`)
  glow.addColorStop(0.46, 'rgba(124, 235, 255, 0.13)')
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, width, height)

  ctx.strokeStyle = 'rgba(232, 248, 255, 0.08)'
  ctx.lineWidth = 1
  for (let y = 10; y < height; y += 8) {
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
    ctx.stroke()
  }

  ctx.globalAlpha = 0.72
  ctx.strokeStyle = `${node.color}44`
  for (let x = -width * 0.2; x < width; x += 62) {
    ctx.beginPath()
    ctx.moveTo(x, height)
    ctx.lineTo(x + width * 0.42, 0)
    ctx.stroke()
  }
  ctx.globalAlpha = 1
  ctx.restore()

  categoryPanelPath(ctx, width, height)
  ctx.strokeStyle = 'rgba(224, 244, 250, 0.44)'
  ctx.lineWidth = 2
  ctx.stroke()
  categoryPanelPath(ctx, width, height)
  ctx.strokeStyle = `${node.color}99`
  ctx.lineWidth = 4
  ctx.setLineDash([42, 14, 7, 14])
  ctx.stroke()
  ctx.setLineDash([])

  ctx.fillStyle = `${node.color}f2`
  setMonoFont(ctx, 30, 900)
  ctx.fillText(`0${index + 1}`, 34, 49)
  ctx.fillStyle = '#f3fbff'
  setFont(ctx, 34, 900)
  ctx.fillText(category.name, 96, 52)
  ctx.fillStyle = 'rgba(214, 226, 232, 0.68)'
  setFont(ctx, 18, 700)
  ctx.fillText(node.label, 96, 80)

  ctx.strokeStyle = `${node.color}cc`
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(34, 103)
  ctx.lineTo(width - 42, 103)
  ctx.stroke()

  ctx.fillStyle = '#fff7c9'
  setMonoFont(ctx, 43, 900)
  ctx.fillText(String(category.solved), 36, 151)
  ctx.fillStyle = 'rgba(219, 230, 235, 0.78)'
  setFont(ctx, 20, 800)
  ctx.fillText('题', 99, 149)
  ctx.fillStyle = '#eef8ff'
  setMonoFont(ctx, 34, 900)
  ctx.fillText(`${category.percent}%`, 154, 151)
  ctx.fillStyle = 'rgba(176, 195, 204, 0.64)'
  setMonoFont(ctx, 17, 800)
  ctx.textAlign = 'right'
  ctx.fillText('HOLOGRAPHIC LINK', width - 36, 150)
  ctx.textAlign = 'left'

  return canvas
}

function CategoryCallout({
  category,
  index,
  node,
}: {
  category: CategoryStat
  index: number
  node: CategoryNode
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
    const anchorY = terrainHeight(node.x, node.z) + 0.2
    const edgeX = node.calloutPosition[0] - side * 0.92
    const elbowX = node.x + side * 0.72
    const points = new Float32Array([
      node.x,
      anchorY,
      node.z,
      elbowX,
      node.calloutPosition[1] - 0.04,
      node.z + 0.08,
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
    const pulse = Math.sin(state.clock.elapsedTime * 1.15 + index * 0.9)
    if (group.current) {
      group.current.position.y = node.calloutPosition[1] + pulse * 0.024
      group.current.rotation.z = pulse * 0.006
      group.current.rotation.y = -state.pointer.x * 0.045
      group.current.rotation.x = state.pointer.y * 0.028
    }
  })

  return (
    <>
      <line>
        <primitive attach="geometry" object={lineGeometry} />
        <lineBasicMaterial
          color={node.color}
          transparent
          opacity={0.32}
          blending={AdditiveBlending}
          depthTest={false}
          depthWrite={false}
        />
      </line>
      <group ref={group} position={node.calloutPosition} renderOrder={36}>
        <mesh renderOrder={37}>
          <planeGeometry args={[2.02, 0.72]} />
          <meshBasicMaterial
            map={texture}
            transparent
            opacity={0.92}
            blending={AdditiveBlending}
            depthTest={false}
            depthWrite={false}
          />
        </mesh>
        <mesh position={[0, 0, -0.018]} renderOrder={35}>
          <planeGeometry args={[2.22, 0.88]} />
          <meshBasicMaterial
            color={node.color}
            transparent
            opacity={0.08}
            blending={AdditiveBlending}
            depthTest={false}
            depthWrite={false}
          />
        </mesh>
      </group>
    </>
  )
}

function CategoryCallouts({ snapshot }: { snapshot: CtfSnapshot }) {
  return (
    <group>
      {snapshot.categories.slice(0, 6).map((category, index) => {
        const node = getCategoryNode(category.name, index)
        return (
          <CategoryCallout
            key={category.name}
            category={category}
            index={index}
            node={node}
          />
        )
      })}
    </group>
  )
}

export function DataCore({ snapshot }: { snapshot: CtfSnapshot }) {
  const map = useRef<Group>(null)
  const scanner = useRef<Group>(null)
  const terrainGeometry = useMemo(() => makeTerrainGeometry(), [])
  const mapBoundaryGeometry = useMemo(() => makeBoundaryGeometry(), [])
  const topoTexture = useMemo(() => {
    const texture = new CanvasTexture(makeTopoMapTexture())
    texture.colorSpace = SRGBColorSpace
    texture.minFilter = LinearFilter
    texture.magFilter = LinearFilter
    texture.needsUpdate = true
    return texture
  }, [])
  const routeGeometries = useMemo(
    () => routePaths.map((route) => ({ color: route.color, geometry: makeRouteGeometry(route.points) })),
    [],
  )

  const contourGeometries = useMemo(
    () =>
      categoryNodes.flatMap((seed) =>
        Array.from({ length: 3 }, (_, level) => {
          const geometry = new BufferGeometry()
          geometry.setAttribute(
            'position',
            new Float32BufferAttribute(makeContourPoints(seed, level * 2), 3),
          )
          return {
            color: seed.color,
            geometry,
            level,
            opacity: 0.11 + level * 0.045,
          }
        }),
      ),
    [],
  )

  useEffect(
    () => () => {
      contourGeometries.forEach((item) => item.geometry.dispose())
      routeGeometries.forEach((item) => item.geometry.dispose())
      terrainGeometry.dispose()
      mapBoundaryGeometry.dispose()
      topoTexture.dispose()
    },
    [
      contourGeometries,
      mapBoundaryGeometry,
      routeGeometries,
      terrainGeometry,
      topoTexture,
    ],
  )

  useFrame((state, delta) => {
    const elapsed = state.clock.elapsedTime

    if (map.current) {
      map.current.rotation.y = Math.sin(elapsed * 0.22) * 0.028
      map.current.rotation.x = Math.sin(elapsed * 0.18) * 0.01
      map.current.position.y = Math.sin(elapsed * 0.8) * 0.025
    }
    if (scanner.current) scanner.current.rotation.y -= delta * 0.28
  })

  return (
    <group rotation={[0, 0, 0]} scale={1.05}>
      <group ref={map}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.075, 0]}>
          <circleGeometry args={[4.7, 192]} />
          <meshBasicMaterial
            color="#05090a"
            transparent
            opacity={0.58}
            side={DoubleSide}
          />
        </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.065, 0]}>
        <ringGeometry args={[0.62, 4.72, 192]} />
        <meshBasicMaterial
          color="#18313a"
          transparent
          opacity={0.24}
          side={DoubleSide}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <mesh position={[0, -0.018, 0]}>
        <primitive attach="geometry" object={terrainGeometry} />
        <meshStandardMaterial
          color="#071013"
          emissive="#0f252b"
          emissiveIntensity={0.34}
          metalness={0.42}
          roughness={0.36}
          transparent
          opacity={0.34}
          side={DoubleSide}
        />
      </mesh>

      <mesh position={[0, 0.004, 0]}>
        <primitive attach="geometry" object={terrainGeometry} />
        <meshBasicMaterial
          color="#d8f6f4"
          wireframe
          transparent
          opacity={0.045}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.108, 0]}>
        <planeGeometry args={[8.45, 5.7]} />
        <meshBasicMaterial
          map={topoTexture}
          transparent
          opacity={0.94}
          side={DoubleSide}
          depthWrite={false}
        />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.118, 0]}>
        <planeGeometry args={[8.45, 5.7]} />
        <meshBasicMaterial
          map={topoTexture}
          transparent
          opacity={0.18}
          side={DoubleSide}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <line>
        <primitive attach="geometry" object={mapBoundaryGeometry} />
        <lineBasicMaterial
          color="#fff2a6"
          transparent
          opacity={0.52}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </line>

      {routeGeometries.map((route, index) => (
        <line key={`route-${index}`}>
          <primitive attach="geometry" object={route.geometry} />
          <lineBasicMaterial
            color={route.color}
            transparent
            opacity={index === 1 ? 0.72 : 0.56}
            blending={AdditiveBlending}
            depthWrite={false}
          />
        </line>
      ))}

      {[
        { x: -2.68, z: -1.36, color: '#ffd21f', angle: 0.2 },
        { x: 2.9, z: 0.74, color: '#ffd21f', angle: -0.55 },
        { x: -2.58, z: 1.5, color: '#7cfbff', angle: 0.7 },
        { x: 2.58, z: 1.68, color: '#fff2a6', angle: 0.18 },
      ].map((marker) => (
        <mesh
          key={`${marker.x}-${marker.z}`}
          rotation={[-Math.PI / 2, 0, marker.angle]}
          position={[marker.x, 0.18, marker.z]}
        >
          <circleGeometry args={[0.18, 3]} />
          <meshBasicMaterial
            color={marker.color}
            transparent
            opacity={0.62}
            side={DoubleSide}
            blending={AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}

      <ExpandingDiscRipples />

      {[1.15, 1.85, 2.55, 3.25, 4.1, 4.65].map((radius, index) => (
        <OrbitRing
          key={radius}
          color={index % 2 === 0 ? '#f6d252' : '#aee9ff'}
          opacity={index % 2 === 0 ? 0.28 : 0.2}
          radius={radius}
          tube={index === 5 ? 0.025 : 0.01}
        />
      ))}

      {contourGeometries.map((item, index) => (
        <line key={`contour-${index}`}>
          <primitive attach="geometry" object={item.geometry} />
          <lineBasicMaterial
            color={item.color}
            transparent
            opacity={item.opacity}
            blending={AdditiveBlending}
            depthWrite={false}
          />
        </line>
      ))}

      {snapshot.categories.slice(0, 6).map((category, index) => {
        const pylon = getCategoryNode(category.name, index)
        return (
        <group
          key={`${pylon.name}-${pylon.x}-${pylon.z}`}
          position={[pylon.x, terrainHeight(pylon.x, pylon.z) + 0.05, pylon.z]}
        >
          <mesh position={[0, pylon.height / 2, 0]}>
            <cylinderGeometry args={[0.012, 0.03, pylon.height, 16]} />
            <meshBasicMaterial
              color={pylon.color}
              transparent
              opacity={0.62}
              blending={AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
            <torusGeometry args={[0.24 + index * 0.025, 0.012, 8, 96]} />
            <meshBasicMaterial
              color={pylon.color}
              transparent
              opacity={0.82}
              blending={AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
          <mesh position={[0, pylon.height + 0.035, 0]}>
            <sphereGeometry args={[0.052, 16, 16]} />
            <meshBasicMaterial
              color={pylon.color}
              transparent
              opacity={0.95}
              blending={AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        </group>
        )
      })}

        <group ref={scanner}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.045, 0]}>
            <ringGeometry args={[4.48, 4.57, 192, 1, 0.24, Math.PI * 0.32]} />
            <meshBasicMaterial
              color="#ffd21f"
              transparent
              opacity={0.86}
              side={DoubleSide}
              blending={AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
            <ringGeometry args={[3.78, 3.82, 192, 1, 3.24, Math.PI * 0.24]} />
            <meshBasicMaterial
              color="#7be6ff"
              transparent
              opacity={0.72}
              side={DoubleSide}
              blending={AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        </group>
      </group>
      <CategoryCallouts snapshot={snapshot} />
    </group>
  )
}
