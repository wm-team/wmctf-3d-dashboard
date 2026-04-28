import { useEffect, useState } from 'react'
import { CtfHud } from '@/components/hud/CtfHud'
import type { CtfSnapshot } from '@/types/ctf'

type Props = {
  snapshot: CtfSnapshot
}

export function DashboardShell({ snapshot }: Props) {
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const updateScale = () => {
      setScale(Math.min(window.innerWidth / 1920, window.innerHeight / 1080))
    }

    updateScale()
    window.addEventListener('resize', updateScale)
    return () => window.removeEventListener('resize', updateScale)
  }, [])

  return (
    <div className="dashboard">
      <div
        className="dashboard__stage"
        style={{ transform: `translate(-50%, -50%) scale(${scale})` }}
      >
        <div className="dashboard__hud">
          <CtfHud snapshot={snapshot} />
        </div>
      </div>
    </div>
  )
}
