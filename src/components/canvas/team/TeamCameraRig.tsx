import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { MathUtils, PerspectiveCamera, Vector3 } from 'three'
import type { TeamRank } from '@/types/ctf'
import type { TeamDebugSettings } from './teamDebug'
import type { TeamDemoEvent } from './teamDemo'
import { getRankSlot } from './teamRankLayout'

function smoothstep01(value: number) {
  const t = MathUtils.clamp(value, 0, 1)
  return t * t * t * (t * (t * 6 - 15) + 10)
}

function segment(value: number, start: number, end: number) {
  return smoothstep01((value - start) / Math.max(end - start, 0.0001))
}

export function TeamCameraRig({
  debugSettings,
  event,
  selectedTeamId,
  teams,
}: {
  debugSettings: TeamDebugSettings
  event: TeamDemoEvent | null
  selectedTeamId: string | null
  teams: TeamRank[]
}) {
  const lookAt = useRef(new Vector3(debugSettings.lookAtX, debugSettings.lookAtY, debugSettings.lookAtZ))
  const focusMotion = useRef({ id: null as string | null, startedAt: 0 })
  const targetPosition = useMemo(() => new Vector3(), [])
  const targetLookAt = useMemo(() => new Vector3(), [])

  useFrame((state) => {
    const camera = state.camera as PerspectiveCamera
    const selectedTeam = selectedTeamId ? teams.find((team) => team.teamId === selectedTeamId) : null
    const eventTeam = !selectedTeam && debugSettings.autoEventFocusEnabled && event ? teams.find((team) => team.teamId === event.teamId) : null
    const focusTeam = selectedTeam ?? eventTeam
    const slot = focusTeam ? getRankSlot(focusTeam.rank) : null
    const focus = slot ? new Vector3(...slot.position) : null
    const edgeX = focus ? MathUtils.clamp(focus.x / 3.7, -1, 1) : 0
    const edgeZ = focus ? MathUtils.clamp(focus.z / 3.7, -1, 1) : 0
    const pointerX = state.pointer.x
    const pointerY = state.pointer.y
    if (focusMotion.current.id !== selectedTeamId) {
      const wasFocused = Boolean(focusMotion.current.id)
      const hasNextFocus = Boolean(selectedTeamId)
      focusMotion.current.id = selectedTeamId
      focusMotion.current.startedAt =
        wasFocused && hasNextFocus
          ? state.clock.elapsedTime - 1.58
          : state.clock.elapsedTime
    }
    const focusProgress = selectedTeam ? MathUtils.clamp((state.clock.elapsedTime - focusMotion.current.startedAt) / 1.58, 0, 1) : 0
    const hero = selectedTeam ? segment(focusProgress, 0.66, 1) : 0

    if (focus && eventTeam) {
      targetPosition.set(
        debugSettings.cameraX + pointerX * 0.18 + focus.x * 0.055,
        debugSettings.cameraY + pointerY * 0.08 + 0.03,
        debugSettings.cameraZ - pointerY * 0.05,
      )
      targetLookAt.set(
        debugSettings.lookAtX + focus.x * 0.16 + pointerX * 0.08,
        debugSettings.lookAtY + focus.y * 0.12 + pointerY * 0.04,
        debugSettings.lookAtZ + focus.z * 0.12,
      )
      camera.fov += (debugSettings.fov - 1.2 - camera.fov) * 0.07
    } else {
      targetPosition.set(
        debugSettings.cameraX + pointerX * 0.08 + edgeX * 0.22 * hero,
        debugSettings.cameraY + pointerY * 0.05 - 1.06 * hero,
        debugSettings.cameraZ - pointerY * 0.04 - 1.34 * hero + Math.abs(edgeX) * 0.18 * hero,
      )
      targetLookAt.set(
        debugSettings.lookAtX + pointerX * 0.04 + edgeX * 0.08 * hero,
        debugSettings.lookAtY + pointerY * 0.03 + (0.78 + (focus?.y ?? 0) * 0.1) * hero,
        debugSettings.lookAtZ + edgeZ * 0.07 * hero,
      )
      camera.fov += (debugSettings.fov - hero * 2.4 - camera.fov) * 0.08
    }

    camera.position.lerp(targetPosition, 0.08)
    lookAt.current.lerp(targetLookAt, 0.08)
    camera.lookAt(lookAt.current)
    camera.updateProjectionMatrix()
  })

  return null
}
