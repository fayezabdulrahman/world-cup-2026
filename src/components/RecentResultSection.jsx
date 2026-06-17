import { useEffect, useState } from 'react'
import { findMatchEvent, getScoreboardDateRange } from '../lib/espn'

const ESPN_BASE = '/api/espn'
const SUMMARY_STATS = [
  { name: 'totalShots', label: 'Shots' },
  { name: 'shotsOnTarget', label: 'On target' },
  { name: 'possessionPct', label: 'Possession', suffix: '%' },
  { name: 'totalPasses', label: 'Passes' },
  { name: 'passPct', label: 'Pass accuracy', ratio: true },
  { name: 'wonCorners', label: 'Corners' },
]

function getTeamStats(team) {
  return Object.fromEntries(
    (team?.statistics || []).map((stat) => [stat.name, stat.displayValue]),
  )
}

function formatValue(value, stat) {
  if (value == null) return '–'
  if (stat.ratio) return `${Math.round(Number(value) * 100)}%`
  if (stat.suffix) return `${Math.round(Number(value))}${stat.suffix}`
  return value
}

function getGoalScorerName(event) {
  const participant = event.participants?.find(
    (entry) =>
      entry.type === 'athlete' ||
      entry.athlete?.displayName ||
      entry.displayName,
  )
  const athlete = event.athletes?.[0] || participant?.athlete
  const name =
    athlete?.displayName ||
    athlete?.shortName ||
    participant?.displayName ||
    participant?.athlete?.displayName

  if (name) return name

  const text = event.shortText || event.text || ''
  return text.split(/goal/i)[0].replace(/^\s*\d+'\s*/, '').trim() || 'Goal'
}

function getGoalMinute(event) {
  const displayValue = event.clock?.displayValue || event.displayTime
  if (displayValue) return displayValue

  if (Number.isFinite(event.clock?.value)) {
    return `${Math.ceil(event.clock.value)}'`
  }

  return '–'
}

function getTeamSide(event, match) {
  const teamId = String(event.team?.id || event.teamId || '')
  const teamName = String(event.team?.displayName || event.team?.name || '')
    .toLowerCase()

  if (teamId && teamId === String(match.home_team_id)) return 'home'
  if (teamId && teamId === String(match.away_team_id)) return 'away'
  if (teamName && teamName === match.home_team_name_en.toLowerCase()) return 'home'
  if (teamName && teamName === match.away_team_name_en.toLowerCase()) return 'away'

  return undefined
}

function getGoalScorers(summary, match) {
  return (summary?.keyEvents || [])
    .filter((event) => event.type?.type === 'goal' || event.scoringPlay)
    .map((event) => ({
      id: event.id || `${event.clock?.value}-${event.shortText}`,
      minute: getGoalMinute(event),
      name: getGoalScorerName(event),
      side: getTeamSide(event, match),
    }))
    .filter((goal) => goal.side)
    .sort((left, right) => {
      const leftMinute = Number.parseFloat(left.minute)
      const rightMinute = Number.parseFloat(right.minute)
      return (leftMinute || 0) - (rightMinute || 0)
    })
}

function RecentResultSection({
  compact = false,
  hideSpoilers = false,
  match,
  onOpenResult,
  stadium,
  teamMap,
}) {
  const [summary, setSummary] = useState(null)

  useEffect(() => {
    if (!match) return undefined

    let active = true

    async function loadSummary() {
      try {
        let eventId = match.espn_event_id

        if (!eventId) {
          const scoreboardResponse = await fetch(
            `${ESPN_BASE}/scoreboard?dates=${getScoreboardDateRange(match.date)}`,
          )
          const scoreboard = await scoreboardResponse.json()
          eventId = findMatchEvent(scoreboard.events, match)?.id
        }
        if (!eventId) return

        const summaryResponse = await fetch(
          `${ESPN_BASE}/summary?event=${eventId}`,
        )
        const payload = await summaryResponse.json()
        if (active) setSummary(payload)
      } catch {
        // The final score remains available from the tournament feed.
      }
    }

    loadSummary()
    return () => {
      active = false
    }
  }, [match])

  if (!match) {
    if (!compact) return null

    return (
      <section className="card recent-result-card compact-result result-pending">
        <div>
          <p className="eyebrow">Latest result</p>
          <h2>The first full-time result will appear here.</h2>
        </div>
        <span className="status-pill">Awaiting result</span>
      </section>
    )
  }

  const homeTeam = teamMap[String(match.home_team_id)]
  const awayTeam = teamMap[String(match.away_team_id)]
  const homeStats = getTeamStats(
    summary?.boxscore?.teams?.find((team) => team.homeAway === 'home'),
  )
  const awayStats = getTeamStats(
    summary?.boxscore?.teams?.find((team) => team.homeAway === 'away'),
  )
  const goalScorers = hideSpoilers ? [] : getGoalScorers(summary, match)
  const homeScorers = goalScorers.filter((goal) => goal.side === 'home')
  const awayScorers = goalScorers.filter((goal) => goal.side === 'away')

  return (
    <section
      className={`card recent-result-card ${compact ? 'compact-result' : ''}`}
    >
      <div className="section-head">
        <div>
          <p className="eyebrow">Latest result</p>
          <h2>{hideSpoilers ? 'Result hidden' : 'Final Score'}</h2>
        </div>
        <div className="result-header-actions">
          <span className="status-pill">
            {hideSpoilers ? 'Spoiler-free' : 'Full-time'}
          </span>
          {compact && onOpenResult && (
            <button
              type="button"
              className="result-details-cta"
              onClick={() => onOpenResult(match)}
            >
              View match details
              <span aria-hidden="true">→</span>
            </button>
          )}
        </div>
      </div>

      <div className="result-scoreline">
        <article>
          <img src={homeTeam?.flag || match.home_team_flag} alt="" />
          <strong className="truncate-name">{match.home_team_name_en}</strong>
        </article>
        <div className="result-score">
          <strong>
            {hideSpoilers ? 'Hidden' : `${match.home_score} – ${match.away_score}`}
          </strong>
          <span className="result-meta">
            {hideSpoilers
              ? 'Score hidden until you turn spoiler-free mode off'
              : `Group ${match.group} · ${stadium?.fifa_name || match.stadium_name}`}
          </span>
        </div>
        <article>
          <img src={awayTeam?.flag || match.away_team_flag} alt="" />
          <strong className="truncate-name">{match.away_team_name_en}</strong>
        </article>
      </div>

      {compact && !hideSpoilers && goalScorers.length ? (
        <div className="compact-goal-scorers" aria-label="Goal scorers">
          <div>
            <span>{match.home_team_name_en}</span>
            {homeScorers.length ? (
              homeScorers.map((goal) => (
                <p key={goal.id}>
                  <strong>{goal.name}</strong>
                  <small>{goal.minute}</small>
                </p>
              ))
            ) : (
              <p className="no-goals">No goals</p>
            )}
          </div>
          <div>
            <span>{match.away_team_name_en}</span>
            {awayScorers.length ? (
              awayScorers.map((goal) => (
                <p key={goal.id}>
                  <strong>{goal.name}</strong>
                  <small>{goal.minute}</small>
                </p>
              ))
            ) : (
              <p className="no-goals">No goals</p>
            )}
          </div>
        </div>
      ) : null}

      {!compact && hideSpoilers ? (
        <p className="muted">Final statistics are hidden in spoiler-free mode.</p>
      ) : !compact && summary?.boxscore?.teams?.length ? (
        <div className="result-stats">
          {SUMMARY_STATS.map((stat) => (
            <article key={stat.name}>
              <strong>{formatValue(homeStats[stat.name], stat)}</strong>
              <span>{stat.label}</span>
              <strong>{formatValue(awayStats[stat.name], stat)}</strong>
            </article>
          ))}
        </div>
      ) : !compact ? (
        <p className="muted">Detailed final statistics are loading.</p>
      ) : null}
    </section>
  )
}

export default RecentResultSection
