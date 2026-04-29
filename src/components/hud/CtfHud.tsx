import { useEffect, useRef, useState } from 'react'
import { SceneCanvas, type DashboardViewMode } from '@/components/canvas/SceneCanvas'
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

      <main className="immersive-stage" aria-label="CTF 赛事三维态势界面">
        <SceneCanvas snapshot={snapshot} viewMode={viewMode} />
      </main>

      <footer className="screen-footer">
        <span>数据每 5 秒更新一次</span>
        <span>数据来源：CTF 计分系统</span>
        <span>延迟：2.3s</span>
      </footer>
    </div>
  )
}
