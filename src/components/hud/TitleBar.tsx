import type { CtfSnapshot } from '@/types/ctf'

type Props = {
  snapshot: CtfSnapshot
}

export function TitleBar({ snapshot }: Props) {
  return (
    <header className="hud-title">
      <div className="hud-title__glow" aria-hidden />
      <div className="hud-title__row">
        <h1 className="hud-title__name">{snapshot.eventName}</h1>
        <span className="hud-title__phase">{snapshot.phase}</span>
      </div>
      <div className="hud-title__meta">
        <span className="hud-chip">已进行 {snapshot.elapsedLabel}</span>
      </div>
    </header>
  )
}
