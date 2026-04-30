import { useEffect, useRef, useState } from 'react'
import { SceneCanvas, type DashboardViewMode } from '@/components/canvas/SceneCanvas'
import {
  defaultChallengeDebugSettings,
  type ChallengeDebugSettings,
} from '@/components/canvas/challenge/challengeDebug'
import { WmctfLogo } from '@/components/hud/WmctfLogo'
import type { CtfSnapshot } from '@/types/ctf'

type Props = {
  snapshot: CtfSnapshot
}

const tabs: DashboardViewMode[] = ['实时态势', '战队视图', '题目视图', '攻击视图']

export function CtfHud({ snapshot }: Props) {
  const screenRef = useRef<HTMLDivElement>(null)
  const [viewMode, setViewMode] = useState<DashboardViewMode>(
    tabs.includes(snapshot.phase as DashboardViewMode) ? (snapshot.phase as DashboardViewMode) : '实时态势',
  )
  const [challengeDebug, setChallengeDebug] = useState<ChallengeDebugSettings>(defaultChallengeDebugSettings)

  const updateChallengeDebug = (key: keyof ChallengeDebugSettings, value: number | boolean) => {
    setChallengeDebug((current) => ({ ...current, [key]: value }))
  }

  const stepChallengeFocus = (direction: -1 | 1) => {
    setChallengeDebug((current) => ({
      ...current,
      focusDirection: direction,
      focusStep: Date.now(),
    }))
  }

  const clearChallengeFocusView = () => {
    setChallengeDebug((current) => ({
      ...current,
      clearFocusStep: Date.now(),
    }))
  }

  useEffect(() => {
    const screen = screenRef.current
    if (!screen) return

    const updatePointerVars = (clientX: number, clientY: number) => {
      const rect = screen.getBoundingClientRect()
      const x = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1)
      const y = Math.min(Math.max((clientY - rect.top) / rect.height, 0), 1)

      screen.style.setProperty('--cursor-x', `${(x * 100).toFixed(2)}%`)
      screen.style.setProperty('--cursor-y', `${(y * 100).toFixed(2)}%`)
      screen.style.setProperty('--holo-x', (x - 0.5).toFixed(4))
      screen.style.setProperty('--holo-y', (y - 0.5).toFixed(4))
    }

    const handlePointerMove = (event: PointerEvent) => {
      updatePointerVars(event.clientX, event.clientY)
    }

    updatePointerVars(window.innerWidth / 2, window.innerHeight / 2)
    window.addEventListener('pointermove', handlePointerMove)
    return () => window.removeEventListener('pointermove', handlePointerMove)
  }, [])

  return (
    <div className="ctf-screen ctf-screen--immersive" ref={screenRef}>
      <header className="screen-header">
        <div className="screen-brand">
          <div className="screen-brand__identity">
            <WmctfLogo />
            <div className="screen-brand__copy">
              <h1>{snapshot.eventName}</h1>
              <div className="screen-brand__sub">
                <span>{snapshot.subtitle}</span>
                <i aria-hidden />
              </div>
            </div>
          </div>
        </div>

        <nav className="screen-tabs" aria-label="大屏视图">
          {tabs.map((tab) => (
            <button
              key={tab}
              className={tab === viewMode ? 'is-active' : undefined}
              onClick={() => setViewMode(tab)}
              type="button"
            >
              {tab}
            </button>
          ))}
        </nav>

        <div className="screen-clock">
          <span>{snapshot.currentTime}</span>
          <strong>{snapshot.systemStatus}</strong>
        </div>
      </header>

      {viewMode === '题目视图' && (
        <aside className="challenge-debug-menu" aria-label="题目视图调试菜单">
          <div className="challenge-debug-menu__head">
            <span>CHALLENGE DEBUG</span>
            <div className="challenge-debug-menu__toggles">
              <label>
                <input
                  checked={challengeDebug.autoFocusEnabled}
                  onChange={(event) => updateChallengeDebug('autoFocusEnabled', event.target.checked)}
                  type="checkbox"
                />
                自动聚焦
              </label>
              <label>
                <input
                  checked={challengeDebug.enabled}
                  onChange={(event) => updateChallengeDebug('enabled', event.target.checked)}
                  type="checkbox"
                />
                显示
              </label>
            </div>
          </div>
          {challengeDebug.enabled && (
            <>
              <div className="challenge-debug-grid">
                {[
                  ['cameraX', 'Cam X', -3, 3, 0.05],
                  ['cameraY', 'Cam Y', 2.4, 5.2, 0.05],
                  ['cameraZ', 'Cam Z', 6.8, 11.5, 0.05],
                  ['lookAtX', 'Look X', -1.5, 1.5, 0.05],
                  ['lookAtY', 'Look Y', -0.6, 1.2, 0.05],
                  ['lookAtZ', 'Look Z', -1.4, 1.2, 0.05],
                  ['fov', 'FOV', 30, 52, 1],
                  ['mapScale', 'Map', 0.72, 1.24, 0.02],
                  ['focusScale', 'Focus', 0.9, 1.72, 0.02],
                  ['rotateSpeed', 'Rotate', 0, 2, 0.05],
                  ['focusOffsetX', 'Focus X', -1.2, 1.2, 0.05],
                  ['focusOffsetZ', 'Focus Z', -1.2, 1.2, 0.05],
                ].map(([key, label, min, max, step]) => (
                  <label key={key} className="challenge-debug-field">
                    <span>{label}</span>
                    <input
                      max={Number(max)}
                      min={Number(min)}
                      onChange={(event) => updateChallengeDebug(key as keyof ChallengeDebugSettings, Number(event.target.value))}
                      step={Number(step)}
                      type="range"
                      value={Number(challengeDebug[key as keyof ChallengeDebugSettings])}
                    />
                    <strong>{Number(challengeDebug[key as keyof ChallengeDebugSettings]).toFixed(Number(step) >= 1 ? 0 : 2)}</strong>
                  </label>
                ))}
              </div>
              <div className="challenge-debug-actions">
                <button
                  onClick={() => stepChallengeFocus(-1)}
                  type="button"
                >
                  上一个聚焦
                </button>
                <button
                  onClick={() => stepChallengeFocus(1)}
                  type="button"
                >
                  下一个聚焦
                </button>
                <button
                  onClick={() => setChallengeDebug(defaultChallengeDebugSettings)}
                  type="button"
                >
                  重置视角
                </button>
                <button
                  onClick={clearChallengeFocusView}
                  type="button"
                >
                  退出聚焦
                </button>
                <button
                  onClick={() => updateChallengeDebug('solveFxNonce', Date.now())}
                  type="button"
                >
                  触发解题特效
                </button>
              </div>
            </>
          )}
        </aside>
      )}

      <main className="immersive-stage" aria-label="CTF 赛事三维态势界面">
        <SceneCanvas challengeDebug={challengeDebug} snapshot={snapshot} viewMode={viewMode} />
      </main>

      <footer className="screen-footer">
        <span>数据每 5 秒更新一次</span>
        <span>数据来源：CTF 计分系统</span>
        <span>延迟：2.3s</span>
      </footer>
    </div>
  )
}
