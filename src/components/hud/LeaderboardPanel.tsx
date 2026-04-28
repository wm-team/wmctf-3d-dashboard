import type { CtfSnapshot } from '@/types/ctf'

type Props = {
  snapshot: CtfSnapshot
}

export function LeaderboardPanel({ snapshot }: Props) {
  return (
    <section className="hud-panel hud-board" aria-label="排行榜">
      <h2 className="hud-panel__heading">实时榜 TOP</h2>
      <ol className="hud-board__list">
        {snapshot.topTeams.map((row) => (
          <li key={row.rank} className="hud-board__row">
            <span className="hud-board__rank">#{row.rank}</span>
            <span className="hud-board__name">{row.name}</span>
            <span className="hud-board__score">{row.score}</span>
            <span className="hud-board__solves">{row.solves} 题</span>
          </li>
        ))}
      </ol>
    </section>
  )
}
