export type TeamDebugSettings = {
  autoEventFocusEnabled: boolean
  cameraX: number
  cameraY: number
  cameraZ: number
  clearFocusStep: number
  enabled: boolean
  eventNonce: number
  focusDirection: number
  focusOffsetX: number
  focusOffsetZ: number
  focusScale: number
  focusStep: number
  fov: number
  lookAtX: number
  lookAtY: number
  lookAtZ: number
  mapScale: number
  rotateSpeed: number
}

export type TeamFocusMotionMode = 'idle' | 'enter' | 'switch'

export type TeamDebugStatus = {
  cameraFov: number
  cameraPosition: [number, number, number]
  changedTeams: number
  demotedTeams: number
  eventCycle: number
  eventTeam: string
  eventTone: string
  focusPhase: 'overview' | 'dive' | 'skim' | 'hero' | 'switch'
  focusProgress: number
  focusRank: number
  focusTeam: string
  mapRotationY: number
  mapScale: number
  motionMode: TeamFocusMotionMode
  promotedTeams: number
  rankDelta: number
  scoreOnlyTeams: number
}

export const defaultTeamDebugSettings: TeamDebugSettings = {
  autoEventFocusEnabled: true,
  cameraX: 0,
  cameraY: 3.48,
  cameraZ: 9.35,
  clearFocusStep: 0,
  enabled: true,
  eventNonce: 0,
  focusDirection: 1,
  focusOffsetX: 0,
  focusOffsetZ: 0,
  focusScale: 1.44,
  focusStep: 0,
  fov: 42,
  lookAtX: 0,
  lookAtY: 0.08,
  lookAtZ: 0.04,
  mapScale: 0.96,
  rotateSpeed: 1,
}

export const defaultTeamDebugStatus: TeamDebugStatus = {
  cameraFov: defaultTeamDebugSettings.fov,
  cameraPosition: [
    defaultTeamDebugSettings.cameraX,
    defaultTeamDebugSettings.cameraY,
    defaultTeamDebugSettings.cameraZ,
  ],
  changedTeams: 0,
  demotedTeams: 0,
  eventCycle: 0,
  eventTeam: '-',
  eventTone: '-',
  focusPhase: 'overview',
  focusProgress: 0,
  focusRank: 0,
  focusTeam: '-',
  mapRotationY: 0,
  mapScale: defaultTeamDebugSettings.mapScale,
  motionMode: 'idle',
  promotedTeams: 0,
  rankDelta: 0,
  scoreOnlyTeams: 0,
}
