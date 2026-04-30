import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = resolve(root, 'public/models/challenge')

const cyan = [0.42, 0.96, 1, 0.58]
const gold = [1, 0.82, 0.12, 0.58]
const white = [0.88, 0.95, 1, 0.5]
const dim = [0.36, 0.48, 0.54, 0.42]

function v(x, y, z) {
  return [x, y, z]
}

function add(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
}

function sub(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
}

function mul(a, scalar) {
  return [a[0] * scalar, a[1] * scalar, a[2] * scalar]
}

function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ]
}

function normalize(a) {
  const length = Math.hypot(a[0], a[1], a[2]) || 1
  return [a[0] / length, a[1] / length, a[2] / length]
}

function createMesh(name, material = 0) {
  return {
    material,
    name,
    normals: [],
    positions: [],
  }
}

function tri(mesh, a, b, c) {
  const normal = normalize(cross(sub(b, a), sub(c, a)))
  mesh.positions.push(...a, ...b, ...c)
  mesh.normals.push(...normal, ...normal, ...normal)
}

function quad(mesh, a, b, c, d) {
  tri(mesh, a, b, c)
  tri(mesh, a, c, d)
}

function addBox(mesh, center, size) {
  const hx = size[0] / 2
  const hy = size[1] / 2
  const hz = size[2] / 2
  const x0 = center[0] - hx
  const x1 = center[0] + hx
  const y0 = center[1] - hy
  const y1 = center[1] + hy
  const z0 = center[2] - hz
  const z1 = center[2] + hz
  quad(mesh, v(x0, y0, z1), v(x1, y0, z1), v(x1, y1, z1), v(x0, y1, z1))
  quad(mesh, v(x1, y0, z0), v(x0, y0, z0), v(x0, y1, z0), v(x1, y1, z0))
  quad(mesh, v(x0, y1, z1), v(x1, y1, z1), v(x1, y1, z0), v(x0, y1, z0))
  quad(mesh, v(x0, y0, z0), v(x1, y0, z0), v(x1, y0, z1), v(x0, y0, z1))
  quad(mesh, v(x1, y0, z1), v(x1, y0, z0), v(x1, y1, z0), v(x1, y1, z1))
  quad(mesh, v(x0, y0, z0), v(x0, y0, z1), v(x0, y1, z1), v(x0, y1, z0))
}

function addPyramid(mesh, center, radius, height, sides = 4, rotation = 0) {
  const base = []
  for (let i = 0; i < sides; i += 1) {
    const angle = rotation + (i / sides) * Math.PI * 2
    base.push(v(center[0] + Math.cos(angle) * radius, center[1], center[2] + Math.sin(angle) * radius))
  }
  const apex = v(center[0], center[1] + height, center[2])
  const bottom = v(center[0], center[1], center[2])
  for (let i = 0; i < sides; i += 1) {
    tri(mesh, base[i], base[(i + 1) % sides], apex)
    tri(mesh, base[(i + 1) % sides], base[i], bottom)
  }
}

function addTetra(mesh, center, radius, rotation = 0) {
  const points = [
    v(0, radius, 0),
    v(Math.cos(rotation) * radius, -radius * 0.42, Math.sin(rotation) * radius),
    v(Math.cos(rotation + Math.PI * 0.66) * radius, -radius * 0.42, Math.sin(rotation + Math.PI * 0.66) * radius),
    v(Math.cos(rotation - Math.PI * 0.66) * radius, -radius * 0.42, Math.sin(rotation - Math.PI * 0.66) * radius),
  ].map((point) => add(point, center))
  tri(mesh, points[0], points[1], points[2])
  tri(mesh, points[0], points[2], points[3])
  tri(mesh, points[0], points[3], points[1])
  tri(mesh, points[1], points[3], points[2])
}

function addFrustum(mesh, center, radiusBottom, radiusTop, height, sides = 8, rotation = 0) {
  const y0 = center[1] - height / 2
  const y1 = center[1] + height / 2
  const bottom = []
  const top = []
  for (let i = 0; i < sides; i += 1) {
    const angle = rotation + (i / sides) * Math.PI * 2
    bottom.push(v(center[0] + Math.cos(angle) * radiusBottom, y0, center[2] + Math.sin(angle) * radiusBottom))
    top.push(v(center[0] + Math.cos(angle) * radiusTop, y1, center[2] + Math.sin(angle) * radiusTop))
  }
  const bottomCenter = v(center[0], y0, center[2])
  const topCenter = v(center[0], y1, center[2])
  for (let i = 0; i < sides; i += 1) {
    const next = (i + 1) % sides
    quad(mesh, bottom[i], bottom[next], top[next], top[i])
    tri(mesh, bottom[next], bottom[i], bottomCenter)
    tri(mesh, top[i], top[next], topCenter)
  }
}

function addTorus(mesh, majorRadius, tubeRadius, segments = 28, rotation = 0, arc = Math.PI * 2) {
  const crossSection = [
    [tubeRadius, tubeRadius],
    [-tubeRadius, tubeRadius],
    [-tubeRadius, -tubeRadius],
    [tubeRadius, -tubeRadius],
  ]
  const rings = []
  const steps = Math.max(3, Math.round(segments * (arc / (Math.PI * 2))))
  for (let i = 0; i <= steps; i += 1) {
    const angle = rotation + (i / steps) * arc
    const radial = v(Math.cos(angle), 0, Math.sin(angle))
    const center = mul(radial, majorRadius)
    rings.push(crossSection.map(([r, y]) => add(center, add(mul(radial, r), v(0, y, 0)))))
  }
  const closed = Math.abs(arc - Math.PI * 2) < 0.0001
  const limit = closed ? steps : steps - 1
  for (let i = 0; i <= limit; i += 1) {
    const nextRing = i === steps ? 0 : i + 1
    if (nextRing >= rings.length) continue
    for (let j = 0; j < crossSection.length; j += 1) {
      const next = (j + 1) % crossSection.length
      quad(mesh, rings[i][j], rings[nextRing][j], rings[nextRing][next], rings[i][next])
    }
  }
}

function addHexPrism(mesh, radius, depth, y = 0, rotation = Math.PI / 6) {
  addFrustum(mesh, v(0, y, 0), radius, radius, depth, 6, rotation)
}

function createCoreMeshes() {
  const outer = createMesh('CoreOuterRing', 0)
  addTorus(outer, 0.62, 0.025, 36)

  const inner = createMesh('CoreInnerRing', 1)
  addTorus(inner, 0.39, 0.018, 32, Math.PI / 9)

  const cage = createMesh('CoreOctaCage', 0)
  const top = v(0, 0.54, 0)
  const bottom = v(0, -0.32, 0)
  const radius = 0.38
  const equator = Array.from({ length: 8 }, (_, index) => {
    const angle = (index / 8) * Math.PI * 2
    return v(Math.cos(angle) * radius, 0.08, Math.sin(angle) * radius)
  })
  for (let i = 0; i < equator.length; i += 1) {
    tri(cage, top, equator[i], equator[(i + 1) % equator.length])
    tri(cage, bottom, equator[(i + 1) % equator.length], equator[i])
  }

  const crownTop = createMesh('CoreCrownTop', 2)
  addFrustum(crownTop, v(0, 0.49, 0), 0.2, 0.08, 0.18, 8, Math.PI / 8)

  const crownBottom = createMesh('CoreCrownBottom', 2)
  addFrustum(crownBottom, v(0, -0.28, 0), 0.08, 0.2, 0.18, 8, Math.PI / 8)

  return [outer, inner, cage, crownTop, crownBottom]
}

function createLandmarkMeshes() {
  const web = createMesh('LandmarkWeb', 1)
  addBox(web, v(-0.18, 0.18, 0), v(0.09, 0.36, 0.12))
  addBox(web, v(0.18, 0.18, 0), v(0.09, 0.36, 0.12))
  addBox(web, v(0, 0.38, 0), v(0.46, 0.08, 0.12))
  addBox(web, v(0, 0.2, 0), v(0.18, 0.06, 0.12))

  const pwn = createMesh('LandmarkPwn', 1)
  addPyramid(pwn, v(0, 0, 0), 0.24, 0.62, 5, Math.PI / 5)
  addPyramid(pwn, v(-0.18, 0, 0.1), 0.12, 0.36, 4, Math.PI / 4)
  addPyramid(pwn, v(0.18, 0, -0.12), 0.12, 0.4, 4, 0)

  const rev = createMesh('LandmarkRev', 2)
  addBox(rev, v(-0.16, 0.14, 0), v(0.26, 0.09, 0.28))
  addBox(rev, v(0.08, 0.28, 0), v(0.32, 0.09, 0.22))
  addBox(rev, v(-0.02, 0.42, 0), v(0.42, 0.09, 0.16))
  addPyramid(rev, v(0.24, 0.46, 0), 0.1, 0.16, 3, Math.PI / 2)

  const crypto = createMesh('LandmarkCrypto', 0)
  addHexPrism(crypto, 0.3, 0.12, 0.2)
  addBox(crypto, v(-0.11, 0.2, 0), v(0.045, 0.34, 0.16))
  addBox(crypto, v(0.02, 0.2, 0), v(0.045, 0.28, 0.16))
  addBox(crypto, v(0.15, 0.2, 0), v(0.045, 0.22, 0.16))

  const misc = createMesh('LandmarkMisc', 0)
  addTetra(misc, v(0, 0.26, 0), 0.22)
  addTetra(misc, v(-0.22, 0.12, 0.08), 0.14, 1.1)
  addTetra(misc, v(0.2, 0.12, -0.08), 0.15, 2.1)
  addTetra(misc, v(0.05, 0.46, 0.12), 0.12, 0.5)

  const forensics = createMesh('LandmarkForensics', 0)
  addTorus(forensics, 0.22, 0.022, 24, 0, Math.PI * 1.55)
  addBox(forensics, v(0.19, 0.02, -0.19), v(0.08, 0.36, 0.08))
  addBox(forensics, v(-0.06, 0.22, 0), v(0.06, 0.2, 0.08))
  addBox(forensics, v(0.06, 0.22, 0), v(0.06, 0.2, 0.08))

  return [web, pwn, rev, crypto, misc, forensics]
}

function createShardMeshes() {
  const shard = createMesh('DataShardCluster', 1)
  const offsets = [
    [-0.22, 0.08, 0.04, 0.11, 0.2],
    [0.18, 0.16, -0.06, 0.12, 1.3],
    [0.02, 0.28, 0.18, 0.1, 2.4],
    [-0.04, 0.42, -0.12, 0.09, 0.8],
    [0.25, 0.02, 0.13, 0.08, 1.8],
    [-0.18, 0.34, -0.19, 0.08, 2.8],
  ]
  offsets.forEach(([x, y, z, radius, rotation]) => addTetra(shard, v(x, y, z), radius, rotation))
  return [shard]
}

function align(offset) {
  return (4 - (offset % 4)) % 4
}

function floatBuffer(values) {
  const buffer = Buffer.alloc(values.length * 4)
  values.forEach((value, index) => buffer.writeFloatLE(value, index * 4))
  return buffer
}

function minMaxVec3(values) {
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  for (let index = 0; index < values.length; index += 3) {
    for (let axis = 0; axis < 3; axis += 1) {
      min[axis] = Math.min(min[axis], values[index + axis])
      max[axis] = Math.max(max[axis], values[index + axis])
    }
  }
  return { max, min }
}

function writeGlb(fileName, meshes) {
  const bufferViews = []
  const accessors = []
  const meshDefs = []
  const nodes = []
  const chunks = []
  let byteOffset = 0

  function appendBuffer(buffer, target) {
    const padding = align(byteOffset)
    if (padding > 0) {
      chunks.push(Buffer.alloc(padding))
      byteOffset += padding
    }
    const viewIndex = bufferViews.length
    bufferViews.push({ buffer: 0, byteLength: buffer.length, byteOffset, target })
    chunks.push(buffer)
    byteOffset += buffer.length
    return viewIndex
  }

  meshes.forEach((mesh, index) => {
    const positionView = appendBuffer(floatBuffer(mesh.positions), 34962)
    const normalView = appendBuffer(floatBuffer(mesh.normals), 34962)
    const bounds = minMaxVec3(mesh.positions)
    const positionAccessor = accessors.length
    accessors.push({
      bufferView: positionView,
      componentType: 5126,
      count: mesh.positions.length / 3,
      max: bounds.max,
      min: bounds.min,
      type: 'VEC3',
    })
    const normalAccessor = accessors.length
    accessors.push({
      bufferView: normalView,
      componentType: 5126,
      count: mesh.normals.length / 3,
      type: 'VEC3',
    })
    meshDefs.push({
      name: mesh.name,
      primitives: [
        {
          attributes: {
            NORMAL: normalAccessor,
            POSITION: positionAccessor,
          },
          material: mesh.material,
          mode: 4,
        },
      ],
    })
    nodes.push({ mesh: index, name: mesh.name })
  })

  const bin = Buffer.concat(chunks)
  const json = {
    accessors,
    asset: { generator: 'wmctf challenge model generator', version: '2.0' },
    bufferViews,
    buffers: [{ byteLength: bin.length }],
    materials: [
      {
        alphaMode: 'BLEND',
        doubleSided: true,
        emissiveFactor: [0.08, 0.8, 0.86],
        name: 'cyan_alloy',
        pbrMetallicRoughness: { baseColorFactor: cyan, metallicFactor: 0.48, roughnessFactor: 0.28 },
      },
      {
        alphaMode: 'BLEND',
        doubleSided: true,
        emissiveFactor: [0.84, 0.62, 0.08],
        name: 'gold_alloy',
        pbrMetallicRoughness: { baseColorFactor: gold, metallicFactor: 0.46, roughnessFactor: 0.3 },
      },
      {
        alphaMode: 'BLEND',
        doubleSided: true,
        emissiveFactor: [0.42, 0.52, 0.58],
        name: 'white_alloy',
        pbrMetallicRoughness: { baseColorFactor: white, metallicFactor: 0.36, roughnessFactor: 0.34 },
      },
      {
        alphaMode: 'BLEND',
        doubleSided: true,
        emissiveFactor: [0.1, 0.16, 0.18],
        name: 'dim_alloy',
        pbrMetallicRoughness: { baseColorFactor: dim, metallicFactor: 0.18, roughnessFactor: 0.42 },
      },
    ],
    meshes: meshDefs,
    nodes,
    scene: 0,
    scenes: [{ nodes: nodes.map((_, index) => index) }],
  }

  const jsonBuffer = Buffer.from(JSON.stringify(json))
  const jsonPadding = align(jsonBuffer.length)
  const binPadding = align(bin.length)
  const jsonChunk = Buffer.concat([jsonBuffer, Buffer.alloc(jsonPadding, 0x20)])
  const binChunk = Buffer.concat([bin, Buffer.alloc(binPadding)])
  const totalLength = 12 + 8 + jsonChunk.length + 8 + binChunk.length
  const header = Buffer.alloc(12)
  header.writeUInt32LE(0x46546c67, 0)
  header.writeUInt32LE(2, 4)
  header.writeUInt32LE(totalLength, 8)
  const jsonHeader = Buffer.alloc(8)
  jsonHeader.writeUInt32LE(jsonChunk.length, 0)
  jsonHeader.writeUInt32LE(0x4e4f534a, 4)
  const binHeader = Buffer.alloc(8)
  binHeader.writeUInt32LE(binChunk.length, 0)
  binHeader.writeUInt32LE(0x004e4942, 4)
  writeFileSync(resolve(outDir, fileName), Buffer.concat([header, jsonHeader, jsonChunk, binHeader, binChunk]))
}

mkdirSync(outDir, { recursive: true })
writeGlb('core-shell.glb', createCoreMeshes())
writeGlb('category-landmarks.glb', createLandmarkMeshes())
writeGlb('data-shards.glb', createShardMeshes())
