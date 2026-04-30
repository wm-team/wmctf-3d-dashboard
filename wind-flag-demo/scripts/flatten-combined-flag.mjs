import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const sourceModelPath = path.join(root, "public/models/flag-model.glb");
const texturePath = path.join(root, "public/textures/flag-texture.png");
const outputModelPath = path.join(root, "public/models/combined-flag.glb");

const GLB_MAGIC = 0x46546c67;
const GLB_VERSION = 2;
const JSON_CHUNK = 0x4e4f534a;
const BIN_CHUNK = 0x004e4942;
const FLOAT = 5126;
const UINT = 5125;
const ARRAY_BUFFER = 34962;
const ELEMENT_ARRAY_BUFFER = 34963;
const GRID_X = 128;
const GRID_Y = 72;
const CLOTH_THICKNESS = 0.01;

const source = readGlb(fs.readFileSync(sourceModelPath));
const texture = fs.readFileSync(texturePath);
const sourcePrimitive = source.json.meshes[0].primitives[0];
const sourcePositions = readFloatAccessor(source.json, source.bin, sourcePrimitive.attributes.POSITION, 3);
const sourceIndices = readIndexAccessor(source.json, source.bin, sourcePrimitive.indices);
const sourceBounds = attributeBounds(sourcePositions, 3);
const flagCut = getFlagCutBounds(sourceBounds);
const flagRect = getFlagRectBounds(flagCut, sourceBounds);
const pole = createPoleWithoutFlag(sourcePositions, sourceIndices, flagCut);
const flag = createRectangularFlag(flagRect);
const glb = createCombinedGlb(pole, flag, texture, flagCut, flagRect);

fs.writeFileSync(outputModelPath, glb);

console.log(
  JSON.stringify(
    {
      source: sourceModelPath,
      output: outputModelPath,
      removedFlagRegion: flagCut,
      flagRect,
      poleTriangles: pole.indices.length / 3,
      flagTriangles: flag.indices.length / 3,
      bytes: glb.byteLength,
    },
    null,
    2,
  ),
);

function getFlagCutBounds(bounds) {
  const width = bounds.max[0] - bounds.min[0];
  const height = bounds.max[1] - bounds.min[1];

  return {
    x0: bounds.min[0] + width * 0.195,
    x1: bounds.max[0] + 0.002,
    y0: bounds.min[1] + height * 0.455,
    y1: bounds.min[1] + height * 0.872,
    zAbs: 0.08,
    bottomHardwareBand: 0.056,
    topHardwareBand: 0.048,
  };
}

function getFlagRectBounds(cut, bounds) {
  return {
    x0: cut.x0 + 0.014,
    x1: bounds.max[0] - 0.012,
    y0: cut.y0 + 0.066,
    y1: cut.y1 - 0.055,
    z: 0.014,
  };
}

function createPoleWithoutFlag(sourcePositions, sourceIndices, cut) {
  const remap = new Map();
  const keptIndices = [];
  const nextIndexFor = (oldIndex) => {
    let next = remap.get(oldIndex);
    if (next === undefined) {
      next = remap.size;
      remap.set(oldIndex, next);
    }
    return next;
  };

  for (let i = 0; i < sourceIndices.length; i += 3) {
    const a = sourceIndices[i];
    const b = sourceIndices[i + 1];
    const c = sourceIndices[i + 2];
    const cx = (sourcePositions[a * 3] + sourcePositions[b * 3] + sourcePositions[c * 3]) / 3;
    const cy = (sourcePositions[a * 3 + 1] + sourcePositions[b * 3 + 1] + sourcePositions[c * 3 + 1]) / 3;
    const cz = (sourcePositions[a * 3 + 2] + sourcePositions[b * 3 + 2] + sourcePositions[c * 3 + 2]) / 3;
    const inFlagRegion =
      cx > cut.x0 &&
      cx < cut.x1 &&
      cy > cut.y0 &&
      cy < cut.y1 &&
      Math.abs(cz) < cut.zAbs;
    const keepHardware =
      inFlagRegion &&
      (cy < cut.y0 + cut.bottomHardwareBand || cy > cut.y1 - cut.topHardwareBand);

    if (inFlagRegion && !keepHardware) {
      continue;
    }

    keptIndices.push(nextIndexFor(a), nextIndexFor(b), nextIndexFor(c));
  }

  const positions = new Float32Array(remap.size * 3);
  const colors = new Float32Array(remap.size * 3);
  const indices = new Uint32Array(keptIndices);

  for (const [oldIndex, newIndex] of remap.entries()) {
    const y = sourcePositions[oldIndex * 3 + 1];
    const t = Math.max(0, Math.min(1, y / 0.985));

    positions[newIndex * 3] = sourcePositions[oldIndex * 3];
    positions[newIndex * 3 + 1] = sourcePositions[oldIndex * 3 + 1];
    positions[newIndex * 3 + 2] = sourcePositions[oldIndex * 3 + 2];
    colors[newIndex * 3] = 0.34 + t * 0.1;
    colors[newIndex * 3 + 1] = 0.42 + t * 0.12;
    colors[newIndex * 3 + 2] = 0.5 + t * 0.16;
  }

  return {
    positions,
    normals: computeNormals(positions, indices),
    colors,
    indices,
  };
}

function createRectangularFlag(rect) {
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  const halfThickness = CLOTH_THICKNESS * 0.5;
  const frontStart = addSurface(1);
  const backStart = addSurface(-1);

  addSurfaceIndices(frontStart, false);
  addSurfaceIndices(backStart, true);
  addEdgeStrip("left");
  addEdgeStrip("right");
  addEdgeStrip("bottom");
  addEdgeStrip("top");

  return {
    positions: new Float32Array(positions),
    normals: computeNormals(new Float32Array(positions), new Uint32Array(indices)),
    uvs: new Float32Array(uvs),
    indices: new Uint32Array(indices),
  };

  function addSurface(normalZ) {
    const start = positions.length / 3;

    for (let y = 0; y <= GRID_Y; y += 1) {
      const v = y / GRID_Y;
      for (let x = 0; x <= GRID_X; x += 1) {
        const u = x / GRID_X;
        const z = clothZ(u, v) + halfThickness * normalZ;

        positions.push(lerp(rect.x0, rect.x1, u), lerp(rect.y0, rect.y1, v), z);
        normals.push(0, 0, normalZ);
        uvs.push(u, 1 - v);
      }
    }

    return start;
  }

  function addSurfaceIndices(start, reverse) {
    const stride = GRID_X + 1;

    for (let y = 0; y < GRID_Y; y += 1) {
      for (let x = 0; x < GRID_X; x += 1) {
        const a = start + y * stride + x;
        const b = a + 1;
        const c = a + stride;
        const d = c + 1;

        if (reverse) {
          indices.push(a, b, c, b, d, c);
        } else {
          indices.push(a, c, b, b, c, d);
        }
      }
    }
  }

  function addEdgeStrip(edge) {
    const segments = edge === "left" || edge === "right" ? GRID_Y : GRID_X;
    const start = positions.length / 3;
    const normal =
      edge === "left" ? [-1, 0, 0] : edge === "right" ? [1, 0, 0] : edge === "bottom" ? [0, -1, 0] : [0, 1, 0];

    for (let i = 0; i <= segments; i += 1) {
      const t = i / segments;
      const u = edge === "left" ? 0 : edge === "right" ? 1 : t;
      const v = edge === "bottom" ? 0 : edge === "top" ? 1 : t;
      const x = edge === "left" ? rect.x0 : edge === "right" ? rect.x1 : lerp(rect.x0, rect.x1, t);
      const y = edge === "bottom" ? rect.y0 : edge === "top" ? rect.y1 : lerp(rect.y0, rect.y1, t);
      const z = clothZ(u, v);

      positions.push(x, y, z + halfThickness, x, y, z - halfThickness);
      normals.push(...normal, ...normal);
      uvs.push(u, 1 - v, u, 1 - v);
    }

    for (let i = 0; i < segments; i += 1) {
      const a = start + i * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;

      if (edge === "left" || edge === "top") {
        indices.push(a, b, c, b, d, c);
      } else {
        indices.push(a, c, b, b, c, d);
      }
    }
  }

  function clothZ(u, v) {
    const pin = smoothstep(0.06, 0.22, u);
    const vertical = 0.35 + Math.sin(v * Math.PI) * 0.65;
    return rect.z + Math.sin(u * Math.PI * 2.25 - 0.55) * 0.007 * pin * vertical;
  }
}

function createCombinedGlb(pole, flag, texture, flagCut, flagRect) {
  const chunks = [];
  const bufferViews = [];
  const accessors = [];

  const pushView = (bytes, target) => {
    const source = bytes.buffer ? Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength) : Buffer.from(bytes);
    const byteOffset = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const view = { buffer: 0, byteOffset, byteLength: source.byteLength };

    if (target) {
      view.target = target;
    }

    chunks.push(source);
    bufferViews.push(view);

    const padding = (4 - (source.byteLength % 4)) % 4;
    if (padding) {
      chunks.push(Buffer.alloc(padding));
    }

    return bufferViews.length - 1;
  };

  const pushAccessor = (array, itemSize, type, componentType, target, minMax = true) => {
    const bufferView = pushView(array, target);
    const accessor = {
      bufferView,
      byteOffset: 0,
      componentType,
      normalized: false,
      count: array.length / itemSize,
      type,
    };

    if (minMax) {
      const bounds = attributeBounds(array, itemSize);
      accessor.min = bounds.min;
      accessor.max = bounds.max;
    }

    accessors.push(accessor);
    return accessors.length - 1;
  };

  const polePositionAccessor = pushAccessor(pole.positions, 3, "VEC3", FLOAT, ARRAY_BUFFER);
  const poleNormalAccessor = pushAccessor(pole.normals, 3, "VEC3", FLOAT, ARRAY_BUFFER, false);
  const poleColorAccessor = pushAccessor(pole.colors, 3, "VEC3", FLOAT, ARRAY_BUFFER, false);
  const poleIndexAccessor = pushAccessor(pole.indices, 1, "SCALAR", UINT, ELEMENT_ARRAY_BUFFER);
  const flagPositionAccessor = pushAccessor(flag.positions, 3, "VEC3", FLOAT, ARRAY_BUFFER);
  const flagNormalAccessor = pushAccessor(flag.normals, 3, "VEC3", FLOAT, ARRAY_BUFFER, false);
  const flagUvAccessor = pushAccessor(flag.uvs, 2, "VEC2", FLOAT, ARRAY_BUFFER);
  const flagIndexAccessor = pushAccessor(flag.indices, 1, "SCALAR", UINT, ELEMENT_ARRAY_BUFFER);
  const textureView = pushView(texture);
  const bin = Buffer.concat(chunks);
  const json = {
    asset: {
      generator: "codex-clean-flag-demo",
      version: "2.0",
      extras: {
        removedEmbossedFlag: true,
        rectangularFlagGeometry: true,
        flagCut,
        flagRect,
      },
    },
    scene: 0,
    scenes: [{ nodes: [0, 1] }],
    nodes: [
      { name: "OriginalPole", mesh: 0 },
      { name: "ReplacementFlag", mesh: 1 },
    ],
    meshes: [
      {
        name: "OriginalPoleMesh",
        primitives: [
          {
            attributes: {
              POSITION: polePositionAccessor,
              NORMAL: poleNormalAccessor,
              COLOR_0: poleColorAccessor,
            },
            indices: poleIndexAccessor,
            material: 0,
            mode: 4,
          },
        ],
      },
      {
        name: "ReplacementFlagMesh",
        primitives: [
          {
            attributes: {
              POSITION: flagPositionAccessor,
              NORMAL: flagNormalAccessor,
              TEXCOORD_0: flagUvAccessor,
            },
            indices: flagIndexAccessor,
            material: 1,
            mode: 4,
          },
        ],
      },
    ],
    materials: [
      {
        name: "PoleMetal",
        doubleSided: true,
        pbrMetallicRoughness: {
          baseColorFactor: [0.62, 0.73, 0.84, 1],
          metallicFactor: 0.18,
          roughnessFactor: 0.36,
        },
      },
      {
        name: "FlagTexture",
        doubleSided: true,
        pbrMetallicRoughness: {
          baseColorTexture: { index: 0 },
          metallicFactor: 0.03,
          roughnessFactor: 0.5,
        },
      },
    ],
    samplers: [{ magFilter: 9729, minFilter: 9987, wrapS: 33071, wrapT: 33071 }],
    textures: [{ sampler: 0, source: 0 }],
    images: [{ mimeType: "image/png", bufferView: textureView }],
    buffers: [{ byteLength: bin.byteLength }],
    bufferViews,
    accessors,
  };

  return writeGlb(json, bin);
}

function computeNormals(positions, indices) {
  const normals = new Float32Array(positions.length);

  for (let i = 0; i < indices.length; i += 3) {
    const ia = indices[i] * 3;
    const ib = indices[i + 1] * 3;
    const ic = indices[i + 2] * 3;
    const ax = positions[ia];
    const ay = positions[ia + 1];
    const az = positions[ia + 2];
    const bx = positions[ib];
    const by = positions[ib + 1];
    const bz = positions[ib + 2];
    const cx = positions[ic];
    const cy = positions[ic + 1];
    const cz = positions[ic + 2];
    const abx = bx - ax;
    const aby = by - ay;
    const abz = bz - az;
    const acx = cx - ax;
    const acy = cy - ay;
    const acz = cz - az;
    const nx = aby * acz - abz * acy;
    const ny = abz * acx - abx * acz;
    const nz = abx * acy - aby * acx;

    normals[ia] += nx;
    normals[ia + 1] += ny;
    normals[ia + 2] += nz;
    normals[ib] += nx;
    normals[ib + 1] += ny;
    normals[ib + 2] += nz;
    normals[ic] += nx;
    normals[ic + 1] += ny;
    normals[ic + 2] += nz;
  }

  for (let i = 0; i < normals.length; i += 3) {
    const nx = normals[i];
    const ny = normals[i + 1];
    const nz = normals[i + 2];
    const length = Math.hypot(nx, ny, nz) || 1;

    normals[i] = nx / length;
    normals[i + 1] = ny / length;
    normals[i + 2] = nz / length;
  }

  return normals;
}

function readGlb(buffer) {
  if (buffer.readUInt32LE(0) !== GLB_MAGIC || buffer.readUInt32LE(4) !== GLB_VERSION) {
    throw new Error("Not a GLB 2.0 file");
  }

  let offset = 12;
  let json;
  let bin;

  while (offset < buffer.byteLength) {
    const chunkLength = buffer.readUInt32LE(offset);
    const chunkType = buffer.readUInt32LE(offset + 4);
    const chunk = buffer.subarray(offset + 8, offset + 8 + chunkLength);

    if (chunkType === JSON_CHUNK) {
      json = JSON.parse(chunk.toString("utf8").trim());
    } else if (chunkType === BIN_CHUNK) {
      bin = chunk;
    }

    offset += 8 + chunkLength;
  }

  if (!json || !bin) {
    throw new Error("GLB must contain JSON and BIN chunks");
  }

  return { json, bin };
}

function writeGlb(json, binChunk) {
  const jsonBuffer = Buffer.from(JSON.stringify(json));
  const paddedJson = padBuffer(jsonBuffer, 0x20);
  const paddedBin = padBuffer(binChunk, 0);
  const output = Buffer.alloc(12 + 8 + paddedJson.length + 8 + paddedBin.length);
  let offset = 0;

  output.writeUInt32LE(GLB_MAGIC, offset);
  output.writeUInt32LE(GLB_VERSION, offset + 4);
  output.writeUInt32LE(output.length, offset + 8);
  offset += 12;

  output.writeUInt32LE(paddedJson.length, offset);
  output.writeUInt32LE(JSON_CHUNK, offset + 4);
  paddedJson.copy(output, offset + 8);
  offset += 8 + paddedJson.length;

  output.writeUInt32LE(paddedBin.length, offset);
  output.writeUInt32LE(BIN_CHUNK, offset + 4);
  paddedBin.copy(output, offset + 8);

  return output;
}

function padBuffer(buffer, fill) {
  const padding = (4 - (buffer.length % 4)) % 4;
  return padding ? Buffer.concat([buffer, Buffer.alloc(padding, fill)]) : buffer;
}

function readFloatAccessor(json, bin, accessorIndex, itemSize) {
  const accessor = json.accessors[accessorIndex];
  if (accessor.componentType !== FLOAT) {
    throw new Error(`Accessor ${accessorIndex} is not float`);
  }

  const view = json.bufferViews[accessor.bufferView];
  const byteStride = view.byteStride ?? itemSize * 4;
  const output = new Float32Array(accessor.count * itemSize);
  const base = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);

  for (let i = 0; i < accessor.count; i += 1) {
    for (let component = 0; component < itemSize; component += 1) {
      output[i * itemSize + component] = bin.readFloatLE(base + i * byteStride + component * 4);
    }
  }

  return output;
}

function readIndexAccessor(json, bin, accessorIndex) {
  const accessor = json.accessors[accessorIndex];
  const view = json.bufferViews[accessor.bufferView];
  const base = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
  const output = new Uint32Array(accessor.count);

  if (accessor.componentType === 5123) {
    for (let i = 0; i < accessor.count; i += 1) {
      output[i] = bin.readUInt16LE(base + i * 2);
    }
  } else if (accessor.componentType === UINT) {
    for (let i = 0; i < accessor.count; i += 1) {
      output[i] = bin.readUInt32LE(base + i * 4);
    }
  } else {
    throw new Error(`Unsupported index component type ${accessor.componentType}`);
  }

  return output;
}

function attributeBounds(values, itemSize) {
  const min = Array(itemSize).fill(Number.POSITIVE_INFINITY);
  const max = Array(itemSize).fill(Number.NEGATIVE_INFINITY);

  for (let i = 0; i < values.length; i += itemSize) {
    for (let component = 0; component < itemSize; component += 1) {
      const value = values[i + component];
      min[component] = Math.min(min[component], value);
      max[component] = Math.max(max[component], value);
    }
  }

  return { min, max };
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function smoothstep(edge0, edge1, value) {
  const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}
