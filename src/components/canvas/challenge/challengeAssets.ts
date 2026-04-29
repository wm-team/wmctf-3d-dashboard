/**
 * Optional GLB paths for category props — add files under public/assets/models/challenge/
 * when assets are available. Currently unused to avoid missing-file runtime errors.
 */
export const challengeCategoryModelPaths = {
  web: '/assets/models/challenge/web.glb',
  pwn: '/assets/models/challenge/pwn.glb',
  rev: '/assets/models/challenge/rev.glb',
  crypto: '/assets/models/challenge/crypto.glb',
  misc: '/assets/models/challenge/misc.glb',
  forensics: '/assets/models/challenge/forensics.glb',
} as const

export const challengeAssetsLoaded = false
