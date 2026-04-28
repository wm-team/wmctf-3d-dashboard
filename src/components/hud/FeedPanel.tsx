import type { CtfSnapshot } from '@/types/ctf'

type Props = {
  snapshot: CtfSnapshot
}

export function FeedPanel({ snapshot }: Props) {
  return (
    <section className="hud-panel hud-feed" aria-label="一血动态">
      <h2 className="hud-panel__heading">一血速递</h2>
      <ul className="hud-feed__list">
        {snapshot.firstBloodRecent.map((line) => (
          <li key={line} className="hud-feed__item">
            {line}
          </li>
        ))}
      </ul>
    </section>
  )
}
