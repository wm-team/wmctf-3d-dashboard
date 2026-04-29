import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  ShaderMaterial,
  TubeGeometry,
  Vector3,
  type Group,
} from 'three'
import {
  COLORS,
  categoryNodes,
  focusTerrainHeight,
  terrainHeight,
  terrainRadius,
  type CategoryKey,
  type CategorySceneNode,
} from './coreSceneConfig'

function makeTerrainGeometry(activeCategory: CategoryKey | null) {
  const ringCount = 56
  const segments = 192
  const positions: number[] = [0, terrainHeight(0, 0), 0]
  const baseHeights: number[] = [terrainHeight(0, 0)]
  const focusHeights: number[] = [focusTerrainHeight(0, 0, activeCategory)]
  const indices: number[] = []

  for (let ring = 1; ring <= ringCount; ring += 1) {
    const radius = (ring / ringCount) * terrainRadius
    for (let segment = 0; segment < segments; segment += 1) {
      const angle = (segment / segments) * Math.PI * 2
      const x = Math.cos(angle) * radius
      const z = Math.sin(angle) * radius
      const y = terrainHeight(x, z)
      positions.push(x, y, z)
      baseHeights.push(y)
      focusHeights.push(focusTerrainHeight(x, z, activeCategory))
    }
  }

  for (let segment = 0; segment < segments; segment += 1) {
    indices.push(0, 1 + segment, 1 + ((segment + 1) % segments))
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
      indices.push(previousA, currentA, previousB, currentA, currentB, previousB)
    }
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('aBaseHeight', new Float32BufferAttribute(baseHeights, 1))
  geometry.setAttribute('aFocusHeight', new Float32BufferAttribute(focusHeights, 1))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function makeFocusHeightAttribute(activeCategory: CategoryKey | null) {
  const ringCount = 56
  const segments = 192
  const heights: number[] = [focusTerrainHeight(0, 0, activeCategory)]

  for (let ring = 1; ring <= ringCount; ring += 1) {
    const radius = (ring / ringCount) * terrainRadius
    for (let segment = 0; segment < segments; segment += 1) {
      const angle = (segment / segments) * Math.PI * 2
      heights.push(focusTerrainHeight(Math.cos(angle) * radius, Math.sin(angle) * radius, activeCategory))
    }
  }

  return new Float32BufferAttribute(heights, 1)
}

function makeContourGeometry(seed: CategorySceneNode, level: number) {
  const points: Vector3[] = []
  const radius = 0.3 + level * 0.16
  const stretchX = 1.1 + Math.sin(seed.phase * 0.8) * 0.28
  const stretchZ = 0.88 + Math.cos(seed.phase * 0.7) * 0.2
  const rotation = seed.phase * 0.42
  const cosR = Math.cos(rotation)
  const sinR = Math.sin(rotation)

  for (let index = 0; index <= 128; index += 1) {
    const angle = (index / 128) * Math.PI * 2
    const warp =
      Math.sin(angle * 3 + seed.phase) * 0.1 +
      Math.cos(angle * 5 - seed.phase * 0.8) * 0.045 +
      Math.sin(angle * 9 + level) * 0.022
    const localX = Math.cos(angle) * (radius + warp) * stretchX
    const localZ = Math.sin(angle) * (radius + warp) * stretchZ
    const x = seed.x + localX * cosR - localZ * sinR
    const z = seed.z + localX * sinR + localZ * cosR
    points.push(new Vector3(x, terrainHeight(x, z) + 0.038 + level * 0.004, z))
  }

  return new TubeGeometry(new CatmullRomCurve3(points, true), 128, level % 3 === 0 ? 0.009 : 0.006, 5, true)
}

const vertexShader = `
  attribute float aBaseHeight;
  attribute float aFocusHeight;
  uniform float uFocusStrength;
  varying float vHeight;
  varying vec3 vLocalPos;

  void main() {
    float height = mix(aBaseHeight, aFocusHeight, uFocusStrength);
    vec3 transformed = vec3(position.x, height, position.z);
    vHeight = height;
    vLocalPos = transformed;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
  }
`

const fragmentShader = `
  uniform float uTime;
  uniform float uContourInterval;
  uniform float uContourWidth;
  uniform float uMajorWidth;
  uniform vec3 uBase;
  uniform vec3 uDeep;
  uniform vec3 uCyan;
  uniform vec3 uYellow;
  uniform float uFocusStrength;
  varying float vHeight;
  varying vec3 vLocalPos;

  void main() {
    float radius = length(vLocalPos.xz);
    float edge = smoothstep(4.62, 3.42, radius);
    float pulse = sin(uTime * 0.58 + vLocalPos.x * 1.5 + vLocalPos.z * 0.82) * 0.006;
    float h = vHeight + pulse;

    float band = abs(fract(h / uContourInterval) - 0.5);
    float line = 1.0 - smoothstep(uContourWidth, uContourWidth + 0.018, band);

    float majorBand = abs(fract(h / (uContourInterval * 4.0)) - 0.5);
    float majorLine = 1.0 - smoothstep(uMajorWidth, uMajorWidth + 0.016, majorBand);

    float grid = (sin(vLocalPos.x * 15.0 + uTime * 0.28) * sin(vLocalPos.z * 15.0 - uTime * 0.18) + 1.0) * 0.5;
    float centerGlow = 1.0 - smoothstep(0.2, 2.45, radius);
    float rimGlow = smoothstep(3.65, 4.54, radius) * edge;
    float breathe = 0.82 + sin(uTime * 0.72) * 0.08;

    vec3 color = mix(uDeep, uBase, edge);
    color += uCyan * line * (0.62 + uFocusStrength * 0.18) * breathe;
    color += uYellow * majorLine * (0.92 + uFocusStrength * 0.22);
    color += uCyan * grid * 0.025 * edge;
    color += uYellow * centerGlow * 0.16;
    color += uCyan * rimGlow * 0.16;

    float alpha = (0.55 + line * 0.23 + majorLine * 0.34 + centerGlow * 0.08 + uFocusStrength * 0.08) * edge;
    gl_FragColor = vec4(color, alpha);
  }
`

function useTerrainMaterial() {
  return useMemo(
    () =>
      new ShaderMaterial({
        vertexShader,
        fragmentShader,
        transparent: true,
        side: DoubleSide,
        depthWrite: true,
        uniforms: {
          uTime: { value: 0 },
          uContourInterval: { value: 0.072 },
          uContourWidth: { value: 0.055 },
          uMajorWidth: { value: 0.038 },
          uFocusStrength: { value: 0 },
          uBase: { value: new Color(COLORS.terrainBase) },
          uDeep: { value: new Color(COLORS.terrainDeep) },
          uCyan: { value: new Color(COLORS.cyan) },
          uYellow: { value: new Color(COLORS.yellow) },
        },
      }),
    [],
  )
}

export function TechTerrain({
  activeCategory,
}: {
  activeCategory: CategoryKey | null
}) {
  const terrainGeometry = useMemo(() => makeTerrainGeometry(null), [])
  const terrainGeometryRef = useRef(terrainGeometry)
  const terrainMaterial = useTerrainMaterial()
  const terrainMaterialRef = useRef(terrainMaterial)
  const focusStrength = useRef(0)
  const contourGeometries = useMemo(
    () =>
      categoryNodes.flatMap((node) =>
        Array.from({ length: 4 }, (_, level) => ({
          color: level === 2 && (node.name === 'Web' || node.name === 'Pwn') ? COLORS.yellow : node.color,
          geometry: makeContourGeometry(node, level),
          opacity: 0.2 - level * 0.025,
        })),
      ),
    [],
  )
  const terrainRef = useRef<Group>(null)

  useEffect(() => {
    terrainGeometryRef.current.setAttribute('aFocusHeight', makeFocusHeightAttribute(activeCategory))
    focusStrength.current *= activeCategory ? 0.38 : 1
  }, [activeCategory])

  useFrame((state) => {
    terrainMaterialRef.current.uniforms.uTime.value = state.clock.elapsedTime
    focusStrength.current += ((activeCategory ? 1 : 0) - focusStrength.current) * 0.08
    terrainMaterialRef.current.uniforms.uFocusStrength.value = focusStrength.current
    if (terrainRef.current) terrainRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.18) * 0.018
  })

  useEffect(
    () => () => {
      terrainGeometryRef.current.dispose()
      terrainMaterial.dispose()
      contourGeometries.forEach(({ geometry }) => geometry.dispose())
    },
    [contourGeometries, terrainGeometry, terrainMaterial],
  )

  return (
    <group ref={terrainRef}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.105, 0]}>
        <circleGeometry args={[4.92, 192]} />
        <meshBasicMaterial color={COLORS.bg} transparent opacity={0.68} side={DoubleSide} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.086, 0]}>
        <ringGeometry args={[0.68, 4.9, 192]} />
        <meshBasicMaterial
          color={COLORS.cyanSoft}
          transparent
          opacity={0.12}
          side={DoubleSide}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <mesh position={[0, 0, 0]}>
        <primitive attach="geometry" object={terrainGeometry} />
        <primitive attach="material" object={terrainMaterial} />
      </mesh>

      <mesh position={[0, 0.035, 0]}>
        <primitive attach="geometry" object={terrainGeometry} />
        <meshBasicMaterial
          color={COLORS.cyanSoft}
          wireframe
          transparent
          opacity={0.022}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <mesh position={[0, terrainHeight(0, 0) + 0.038, 0]}>
        <cylinderGeometry args={[0.82, 1.02, 0.11, 96, 1, true]} />
        <meshBasicMaterial
          color={COLORS.yellow}
          transparent
          opacity={0.16}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, terrainHeight(0, 0) + 0.104, 0]}>
        <torusGeometry args={[0.86, 0.014, 8, 128]} />
        <meshBasicMaterial
          color={COLORS.yellow}
          transparent
          opacity={0.58}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.048, 0]}>
        <torusGeometry args={[terrainRadius, 0.018, 8, 256]} />
        <meshBasicMaterial
          color={COLORS.cyan}
          transparent
          opacity={0.36}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.066, 0]}>
        <torusGeometry args={[terrainRadius + 0.08, 0.011, 8, 256]} />
        <meshBasicMaterial
          color={COLORS.yellow}
          transparent
          opacity={0.28}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {contourGeometries.map(({ color, geometry, opacity }, index) => (
        <mesh key={`contour-${index}`} geometry={geometry}>
          <meshBasicMaterial
            color={color}
            transparent
            opacity={opacity}
            blending={AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  )
}
