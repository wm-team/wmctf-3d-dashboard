export type ChallengeDebugSettings = {
  autoFocusEnabled: boolean
  cameraX: number
  cameraY: number
  cameraZ: number
  clearFocusStep: number
  enabled: boolean
  focusOffsetX: number
  focusOffsetZ: number
  focusScale: number
  focusDirection: number
  focusStep: number
  fov: number
  lookAtX: number
  lookAtY: number
  lookAtZ: number
  mapScale: number
  rotateSpeed: number
  solveFxNonce: number
}

export const defaultChallengeDebugSettings: ChallengeDebugSettings = {
  autoFocusEnabled: true,
  cameraX: 0,
  cameraY: 3.62,
  cameraZ: 9.48,
  clearFocusStep: 0,
  enabled: true,
  focusOffsetX: 0,
  focusOffsetZ: 0,
  focusScale: 1.56,
  focusDirection: 1,
  focusStep: 0,
  fov: 41,
  lookAtX: 0,
  lookAtY: 0.08,
  lookAtZ: -0.08,
  mapScale: 0.96,
  rotateSpeed: 1,
  solveFxNonce: 0,
}
