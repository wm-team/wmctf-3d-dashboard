import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { AdditiveBlending, MeshBasicMaterial, type Mesh } from 'three'
import { getCategoryMeta } from './challengeData'
import type { Challenge } from './challengeTypes'

function bloodLine(label: string, value: string | undefined) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 2 }}>
      <span style={{ color: 'rgba(200, 222, 232, 0.72)', fontSize: 10, fontWeight: 700 }}>{label}</span>
      <span style={{ color: value ? '#f4fbff' : 'rgba(160, 182, 192, 0.55)', fontSize: 10, fontWeight: 800 }}>{value ?? '—'}</span>
    </div>
  )
}

export function ChallengeNodeBillboard({
  accent,
  challenge,
  visible,
}: {
  accent: string
  challenge: Challenge
  visible: boolean
}) {
  const group = useRef<HTMLDivElement>(null)
  const opacityRef = useRef(0)
  const yRef = useRef(0)

  useFrame((_state, delta) => {
    const el = group.current
    if (!el) return
    const targetOp = visible ? 1 : 0
    opacityRef.current += (targetOp - opacityRef.current) * Math.min(1, delta * 6)
    const targetY = visible ? 0 : -6
    yRef.current += (targetY - yRef.current) * Math.min(1, delta * 7)
    el.style.opacity = String(opacityRef.current)
    el.style.transform = `translateY(${yRef.current}px)`
  })

  useEffect(() => {
    if (visible) opacityRef.current = 0
  }, [visible, challenge.id])

  const meta = getCategoryMeta(challenge.category)
  const b = challenge.bloods
  const fb = b?.first ?? challenge.firstBloodTeam

  return (
    <Html
      center
      distanceFactor={2.6}
      position={[0, 0.42, 0]}
      style={{ pointerEvents: 'none', width: 220 }}
      zIndexRange={[40, 0]}
    >
      <div
        ref={group}
        style={{
          background: 'linear-gradient(165deg, rgba(8, 22, 28, 0.92) 0%, rgba(4, 12, 16, 0.88) 100%)',
          border: `1px solid ${accent}`,
          borderRadius: 6,
          boxShadow: '0 0 18px rgba(105, 246, 255, 0.12), inset 0 0 0 1px rgba(255, 210, 31, 0.08)',
          padding: '10px 12px',
          opacity: 0,
          fontFamily: '"PingFang SC","Microsoft YaHei",sans-serif',
          minWidth: 200,
        }}
      >
        <div style={{ color: '#f4fbff', fontSize: 13, fontWeight: 900, marginBottom: 6, letterSpacing: 0.4 }}>{challenge.title}</div>
        {bloodLine('类别', meta.label.toUpperCase())}
        {bloodLine('分值', String(challenge.points))}
        {bloodLine('1st Blood', fb)}
        {bloodLine('2nd Blood', b?.second)}
        {bloodLine('3rd Blood', b?.third)}
      </div>
    </Html>
  )
}

type SolveFxProps = {
  accent: string
  playToken: number
}

/** Pulse ring + upward sparks when a challenge is solved */
export function ChallengeSolveFx({ accent, playToken }: SolveFxProps) {
  const ringMat = useMemo(
    () =>
      new MeshBasicMaterial({
        color: accent,
        transparent: true,
        opacity: 0,
        blending: AdditiveBlending,
        depthWrite: false,
      }),
    [accent],
  )
  const materialRef = useRef(ringMat)
  useEffect(() => {
    materialRef.current = ringMat
  }, [ringMat])
  const meshRef = useRef<Mesh>(null)
  const tRef = useRef(0)
  const activeRef = useRef(false)

  useEffect(() => () => ringMat.dispose(), [ringMat])

  useEffect(() => {
    if (playToken > 0) {
      activeRef.current = true
      tRef.current = 0
    }
  }, [playToken])

  useFrame((_state, delta) => {
    if (!activeRef.current) return
    tRef.current += delta
    const u = Math.min(1, tRef.current / 1.2)
    const scale = 0.85 + u * 2.4
    const mat = materialRef.current
    mat.opacity = (1 - u) * 0.5
    if (meshRef.current) {
      meshRef.current.scale.setScalar(scale)
    }
    if (u >= 1) {
      activeRef.current = false
      mat.opacity = 0
    }
  })

  return (
    <group position={[0, 0.22, 0]}>
      <mesh ref={meshRef} rotation={[Math.PI / 2, 0, 0]} renderOrder={20} material={ringMat}>
        <ringGeometry args={[0.12, 0.22, 32]} />
      </mesh>
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2
        return (
          <mesh key={i} position={[Math.cos(a) * 0.06, 0.28 + i * 0.035, Math.sin(a) * 0.06]} renderOrder={21}>
            <boxGeometry args={[0.018, 0.055, 0.018]} />
            <meshBasicMaterial color="#ffd21f" transparent opacity={0.72} blending={AdditiveBlending} depthWrite={false} />
          </mesh>
        )
      })}
    </group>
  )
}
