import type { CtfSnapshot } from '@/types/ctf'

type Props = {
  snapshot: CtfSnapshot
}

export function StatGrid({ snapshot }: Props) {
  const items = [
    { label: '参赛队伍', value: snapshot.totalTeams },
    { label: '题目总数', value: snapshot.totalChallenges },
    { label: '累计解题', value: snapshot.solvedChallenges },
  ]

  return (
    <section className="hud-panel hud-stats" aria-label="赛况概览">
      <h2 className="hud-panel__heading">赛况概览</h2>
      <ul className="hud-stats__list">
        {items.map((item) => (
          <li key={item.label} className="hud-stat">
            <span className="hud-stat__label">{item.label}</span>
            <span className="hud-stat__value">{item.value}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
