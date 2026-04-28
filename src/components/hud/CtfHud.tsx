import { useEffect, useRef, type CSSProperties } from 'react'
import { SceneCanvas } from '@/components/canvas/SceneCanvas'
import type { CtfSnapshot, TimelinePoint } from '@/types/ctf'

type Props = {
  snapshot: CtfSnapshot
}

const tabs = ['实时态势', '战队视图', '题目视图', '攻击视图']
const rankMedals = ['GOLD', 'SILVER', 'BRONZE']
const chartPadding = { left: 54, right: 28, top: 28, bottom: 38 }
const chartSize = { width: 700, height: 250 }
const chartInnerWidth = chartSize.width - chartPadding.left - chartPadding.right
const chartInnerHeight = chartSize.height - chartPadding.top - chartPadding.bottom
const numberFormat = new Intl.NumberFormat('en-US')

type TimelineKey = 'current' | 'previous'

function buildDonutGradient(categories: CtfSnapshot['categories']) {
  let cursor = 0
  return categories
    .map((category) => {
      const start = cursor
      cursor += category.percent
      return `${category.color} ${start}% ${cursor}%`
    })
    .join(', ')
}

function pointFor(
  timeline: TimelinePoint[],
  index: number,
  key: TimelineKey,
  maxValue: number,
) {
  const denominator = Math.max(timeline.length - 1, 1)
  const x = chartPadding.left + (index / denominator) * chartInnerWidth
  const y =
    chartPadding.top +
    chartInnerHeight -
    (timeline[index][key] / maxValue) * chartInnerHeight
  return [x, y] as const
}

function linePoints(
  timeline: TimelinePoint[],
  key: TimelineKey,
  maxValue: number,
) {
  return timeline
    .map((_, index) => pointFor(timeline, index, key, maxValue).join(','))
    .join(' ')
}

function heatCellStyle(value: number): CSSProperties {
  if (value >= 0.42) {
    return {
      backgroundColor: `rgba(246, 210, 82, ${0.22 + value * 0.72})`,
      boxShadow: `0 0 ${Math.round(8 + value * 14)}px rgba(246, 210, 82, ${
        value * 0.34
      })`,
    }
  }

  return {
    backgroundColor: `rgba(105, 122, 132, ${0.22 + value * 0.92})`,
  }
}

export function CtfHud({ snapshot }: Props) {
  const screenRef = useRef<HTMLDivElement>(null)
  const donutStyle: CSSProperties = {
    background: `conic-gradient(${buildDonutGradient(snapshot.categories)})`,
  }
  const metrics = [
    { label: '战队总数', value: snapshot.totalTeams, unit: 'TEAMS', icon: 'TEAM' },
    {
      label: '题目总数',
      value: snapshot.totalChallenges,
      unit: 'CHALLENGES',
      icon: 'TASK',
    },
    {
      label: '已解出题目',
      value: snapshot.solvedChallenges,
      unit: 'SOLVES',
      icon: 'DONE',
    },
    {
      label: '每分钟提交数',
      value: snapshot.submissionsPerMinute,
      unit: 'SUBMISSIONS / MIN',
      icon: 'RATE',
    },
  ]
  const maxTimelineValue = Math.max(
    ...snapshot.timeline.flatMap((point) => [point.current, point.previous]),
    1,
  )
  const currentLine = linePoints(snapshot.timeline, 'current', maxTimelineValue)
  const previousLine = linePoints(snapshot.timeline, 'previous', maxTimelineValue)
  const highlightedIndex = snapshot.timeline.findIndex((point) => point.highlight)
  const activeIndex =
    highlightedIndex >= 0 ? highlightedIndex : snapshot.timeline.length - 1
  const [markerX, markerY] = pointFor(
    snapshot.timeline,
    activeIndex,
    'current',
    maxTimelineValue,
  )
  const activePoint = snapshot.timeline[activeIndex]

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
      const shiftX = (x - 0.5) * 14
      const shiftY = (y - 0.5) * 10
      const tiltX = (0.5 - y) * 2.8
      const tiltY = (x - 0.5) * 3.6

      screen.style.setProperty('--panel-shift-x', `${shiftX.toFixed(2)}px`)
      screen.style.setProperty('--panel-shift-y', `${shiftY.toFixed(2)}px`)
      screen.style.setProperty('--panel-shift-x-sm', `${(shiftX * 0.72).toFixed(2)}px`)
      screen.style.setProperty('--panel-shift-y-sm', `${(shiftY * 0.7).toFixed(2)}px`)
      screen.style.setProperty('--panel-shift-x-xs', `${(shiftX * 0.26).toFixed(2)}px`)
      screen.style.setProperty('--panel-shift-y-xs', `${(shiftY * 0.44).toFixed(2)}px`)
      screen.style.setProperty('--panel-shift-x-xxs', `${(shiftX * 0.15).toFixed(2)}px`)
      screen.style.setProperty('--panel-shift-y-xxs', `${(shiftY * 0.18).toFixed(2)}px`)
      screen.style.setProperty('--panel-tilt-x', `${tiltX.toFixed(3)}deg`)
      screen.style.setProperty('--panel-tilt-y', `${tiltY.toFixed(3)}deg`)
      screen.style.setProperty('--panel-tilt-x-sm', `${(tiltX * 0.55).toFixed(3)}deg`)
      screen.style.setProperty('--panel-tilt-y-sm', `${(tiltY * 0.5).toFixed(3)}deg`)
      screen.style.setProperty('--panel-tilt-x-md', `${(tiltX * 0.42).toFixed(3)}deg`)
      screen.style.setProperty('--panel-tilt-y-md', `${(tiltY * 0.4).toFixed(3)}deg`)
      screen.style.setProperty('--panel-tilt-x-xs', `${(tiltX * 0.35).toFixed(3)}deg`)
      screen.style.setProperty('--panel-tilt-y-xs', `${(tiltY * 0.18).toFixed(3)}deg`)
      screen.style.setProperty('--panel-tilt-x-xxs', `${(tiltX * 0.25).toFixed(3)}deg`)
      screen.style.setProperty('--panel-tilt-y-xxs', `${(tiltY * 0.16).toFixed(3)}deg`)
    }

    const handlePointerMove = (event: PointerEvent) => {
      updatePointerVars(event.clientX, event.clientY)
    }

    updatePointerVars(window.innerWidth / 2, window.innerHeight / 2)
    window.addEventListener('pointermove', handlePointerMove)
    return () => window.removeEventListener('pointermove', handlePointerMove)
  }, [])

  return (
    <div className="ctf-screen" ref={screenRef}>
      <header className="screen-header">
        <div className="screen-brand">
          <h1>{snapshot.eventName}</h1>
          <div className="screen-brand__sub">
            <span>{snapshot.subtitle}</span>
            <i aria-hidden />
          </div>
        </div>

        <nav className="screen-tabs" aria-label="大屏视图">
          {tabs.map((tab) => (
            <button
              key={tab}
              className={tab === snapshot.phase ? 'is-active' : undefined}
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

      <div className="screen-grid">
        <section className="panel panel-rank">
          <div className="panel-title">
            <strong>实时排名</strong>
            <span>LIVE RANKING</span>
          </div>
          <div className="rank-table__head">
            <span>排名</span>
            <span>战队</span>
            <span>总分</span>
            <span>已解题</span>
          </div>
          <ol className="rank-list">
            {snapshot.topTeams.map((team) => (
              <li key={team.rank} className={`rank-row rank-row--${team.rank}`}>
                <span className="rank-row__rank">
                  {team.rank <= 3 ? (
                    <i>{rankMedals[team.rank - 1]}</i>
                  ) : (
                    team.rank
                  )}
                </span>
                <strong>{team.name}</strong>
                <span>{team.score}</span>
                <span>{team.solves}</span>
              </li>
            ))}
          </ol>
          <button className="panel-more" type="button">
            查看完整排名
          </button>
        </section>

        <main className="center-console">
          <section className="round-strip">
            <div>
              <span>当前轮次</span>
              <strong>
                {String(snapshot.currentRound).padStart(2, '0')}
                <em>/ {String(snapshot.totalRounds).padStart(2, '0')}</em>
              </strong>
              <b>{snapshot.roundStatus}</b>
            </div>
            <div className="round-strip__timer">
              <span>本轮剩余时间</span>
              <strong>{snapshot.remainingTime}</strong>
              <small>
                <i>HOURS</i>
                <i>MINUTES</i>
                <i>SECONDS</i>
              </small>
            </div>
            <div>
              <span>下一轮开始</span>
              <strong className="round-strip__next">
                {snapshot.nextRoundTime}
              </strong>
            </div>
          </section>

          <section className="metric-grid" aria-label="核心指标">
            {metrics.map((metric) => (
              <article key={metric.label} className="metric-card">
                <div className="metric-card__icon">{metric.icon}</div>
                <div>
                  <span>{metric.label}</span>
                  <small>{metric.unit}</small>
                  <strong>{numberFormat.format(metric.value)}</strong>
                </div>
              </article>
            ))}
          </section>

          <section className="core-stage" aria-label="题目类别分布">
            <div className="core-stage__ripples" aria-hidden>
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
            <div className="core-stage__canvas-shell" aria-hidden>
              <div className="core-stage__canvas">
                <SceneCanvas />
              </div>
            </div>
            <div className="core-platform core-platform--outer" aria-hidden />
            <div className="core-platform core-platform--inner" aria-hidden />
            <div className="core-beam" aria-hidden />
            {snapshot.categories.map((category, index) => (
              <div
                key={category.name}
                className={`core-category core-category--${index}`}
                style={{ '--category-color': category.color } as CSSProperties}
              >
                <span>{category.name}</span>
                <strong>
                  {category.solved}
                  <small>题</small>
                </strong>
                <em>{category.percent}%</em>
              </div>
            ))}
            <div className="core-caption">
              <span>题目类别分布</span>
              <em>CATEGORY DISTRIBUTION</em>
            </div>
          </section>
        </main>

        <section className="panel panel-solves">
          <div className="panel-title panel-title--action">
            <div>
              <strong>最新解题动态</strong>
              <span>RECENT SOLVES</span>
            </div>
            <button type="button">查看更多</button>
          </div>
          <ul className="solve-list">
            {snapshot.recentSolves.map((solve) => (
              <li key={`${solve.time}-${solve.team}-${solve.challenge}`}>
                <time>{solve.time}</time>
                <div className="solve-list__badge">
                  {solve.badge ? <b>FIRST BLOOD</b> : <i />}
                </div>
                <div className="solve-list__main">
                  <strong>{solve.team}</strong>
                  <span>
                    解出 <em>{solve.category}</em> | {solve.challenge}
                  </span>
                </div>
                <mark>+{solve.points}</mark>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel panel-donut">
          <div className="panel-title">
            <strong>题目类别分布</strong>
            <span>CATEGORY DISTRIBUTION</span>
          </div>
          <div className="donut-layout">
            <div className="donut" style={donutStyle}>
              <div>
                <strong>{snapshot.totalChallenges}</strong>
                <span>总题目数</span>
              </div>
            </div>
            <ul className="category-legend">
              {snapshot.categories.map((category) => (
                <li key={category.name}>
                  <i style={{ backgroundColor: category.color }} />
                  <span>{category.name}</span>
                  <strong>
                    {category.solved} <em>({category.percent}%)</em>
                  </strong>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="panel panel-line">
          <div className="panel-title panel-title--legend">
            <div>
              <strong>解题趋势（本轮）</strong>
              <span>SOLVES OVER TIME</span>
            </div>
            <div className="line-legend">
              <i className="line-legend__current" />
              <span>本轮累计解出</span>
              <i className="line-legend__previous" />
              <span>对比：上一轮同期</span>
            </div>
          </div>
          <svg
            className="line-chart"
            viewBox={`0 0 ${chartSize.width} ${chartSize.height}`}
            role="img"
            aria-label="解题趋势折线图"
          >
            <defs>
              <linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="rgba(246,210,82,.32)" />
                <stop offset="100%" stopColor="rgba(246,210,82,0)" />
              </linearGradient>
            </defs>
            {[0, 1, 2, 3, 4].map((line) => {
              const y = chartPadding.top + (line / 4) * chartInnerHeight
              return (
                <g key={line}>
                  <line
                    x1={chartPadding.left}
                    x2={chartSize.width - chartPadding.right}
                    y1={y}
                    y2={y}
                  />
                  <text x="16" y={y + 4}>
                    {Math.round(maxTimelineValue - (line / 4) * maxTimelineValue)}
                  </text>
                </g>
              )
            })}
            <polygon
              className="line-chart__area"
              points={`${currentLine} ${chartSize.width - chartPadding.right},${
                chartSize.height - chartPadding.bottom
              } ${chartPadding.left},${chartSize.height - chartPadding.bottom}`}
            />
            <polyline className="line-chart__previous" points={previousLine} />
            <polyline className="line-chart__current" points={currentLine} />
            <line
              className="line-chart__marker"
              x1={markerX}
              x2={markerX}
              y1={chartPadding.top}
              y2={chartSize.height - chartPadding.bottom}
            />
            <circle cx={markerX} cy={markerY} r="7" />
            <g
              className="line-chart__tip"
              transform={`translate(${markerX + 24} ${markerY - 24})`}
            >
              <rect width="112" height="56" rx="2" />
              <text x="12" y="22">
                当前解出
              </text>
              <text x="82" y="22">
                {activePoint.current}
              </text>
              <text x="12" y="42">
                上一轮同期
              </text>
              <text x="82" y="42">
                {activePoint.previous}
              </text>
            </g>
            {snapshot.timeline.map((point, index) => {
              const [x] = pointFor(
                snapshot.timeline,
                index,
                'current',
                maxTimelineValue,
              )
              return (
                <text key={point.time} className="line-chart__tick" x={x} y="238">
                  {point.time}
                </text>
              )
            })}
          </svg>
        </section>

        <section className="panel panel-heat">
          <div className="panel-title panel-title--legend">
            <div>
              <strong>战队活跃度（提交数/分钟）</strong>
              <span>TEAM ACTIVITY (SUBS / MIN)</span>
            </div>
            <div className="heat-scale">
              <span>低</span>
              <i />
              <span>高</span>
            </div>
          </div>
          <div className="heatmap">
            {snapshot.activity.map((row) => (
              <div key={row.team} className="heatmap__row">
                <span>{row.team}</span>
                {row.buckets.map((bucket, index) => (
                  <i
                    key={`${row.team}-${index}`}
                    style={heatCellStyle(bucket)}
                    aria-label={`${row.team} ${index + 1}: ${bucket}`}
                  />
                ))}
              </div>
            ))}
            <div className="heatmap__ticks">
              <span />
              {snapshot.heatmapTicks.map((tick) => (
                <em key={tick}>{tick}</em>
              ))}
            </div>
          </div>
        </section>
      </div>

      <footer className="screen-footer">
        <span>数据每 5 秒更新一次</span>
        <span>数据来源：CTF 计分系统</span>
        <span>延迟：2.3s</span>
      </footer>
    </div>
  )
}
