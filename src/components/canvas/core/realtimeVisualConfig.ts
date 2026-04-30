export const realtimeVisualConfig = {
  lighting: {
    ambientIntensity: 0.18,
    centerGlowIntensity: 1.18,
    cyanSweepIntensity: 1.32,
    goldSweepIntensity: 0.98,
    hemisphereIntensity: 0.24,
    keyLightIntensity: 0.64,
  },
  motion: {
    focusDampen: 0.34,
    idleFloat: 0.016,
    idlePitch: 0.006,
    rotatePeriodSeconds: 180,
    idleYaw: 0.016,
  },
  postprocessing: {
    bloomRadius: 0.28,
    bloomStrength: 0.34,
    bloomThreshold: 0.82,
  },
  terrain: {
    contourInterval: 0.096,
    contourWidth: 0.013,
    majorWidth: 0.022,
    scanOpacity: 0.11,
    skirtOpacity: 0.024,
    hotspotOpacity: 0.16,
  },
} as const
