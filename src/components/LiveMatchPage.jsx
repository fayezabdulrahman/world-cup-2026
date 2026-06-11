import { useEffect, useMemo, useState } from 'react'
import teamPredictionProfiles from '../data/teamPredictionProfiles.json'
import {
  calculateLiveWinProbability,
  getMatchMinute,
  getReadableMatchStatus,
} from '../lib/liveProbability'
import {
  formatViewerTime,
  getViewerTimeZoneLabel,
  numberValue,
} from '../lib/worldCup'

const ESPN_BASE = '/api/espn'
const REFRESH_INTERVAL = 5000

const DISPLAY_STATS = [
  { name: 'totalShots', label: 'Shots' },
  { name: 'shotsOnTarget', label: 'Shots on target' },
  { name: 'possessionPct', label: 'Possession', suffix: '%' },
  { name: 'totalPasses', label: 'Passes' },
  { name: 'passPct', label: 'Pass accuracy', percentRatio: true },
  { name: 'foulsCommitted', label: 'Fouls' },
  { name: 'yellowCards', label: 'Yellow cards' },
  { name: 'redCards', label: 'Red cards' },
  { name: 'offsides', label: 'Offsides' },
  { name: 'wonCorners', label: 'Corners' },
]

function getDateKey(date) {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('')
}

function getTeamStats(team) {
  return Object.fromEntries(
    (team?.statistics || []).map((stat) => [stat.name, stat.displayValue]),
  )
}

function formatStatValue(value, definition) {
  if (value == null || value === '') return '–'
  if (definition.percentRatio) return `${Math.round(Number(value) * 100)}%`
  if (definition.suffix) return `${Math.round(Number(value))}${definition.suffix}`
  return value
}

function normalizeStats(summary) {
  const homeStats = getTeamStats(
    summary?.boxscore?.teams?.find((team) => team.homeAway === 'home'),
  )
  const awayStats = getTeamStats(
    summary?.boxscore?.teams?.find((team) => team.homeAway === 'away'),
  )

  return DISPLAY_STATS.map((definition) => ({
    ...definition,
    home: homeStats[definition.name],
    away: awayStats[definition.name],
  }))
}

function getTimelineEmoji(event) {
  const eventType = event.type?.type || ''
  const eventText = `${event.type?.text || ''} ${event.shortText || ''}`.toLowerCase()

  if (eventType === 'goal' || event.scoringPlay) return '⚽'
  if (eventType === 'yellow-card' || eventText.includes('yellow card')) return '🟨'
  if (eventType === 'red-card' || eventText.includes('red card')) return '🟥'
  if (eventType.includes('substitution') || eventText.includes('substitution')) {
    return '🔄'
  }
  if (eventType.includes('penalty') || eventText.includes('penalty')) return '🥅'
  if (eventType.includes('var') || eventText.includes('var')) return '📺'
  if (eventType.includes('delay') || eventText.includes('delay')) return '⏸️'
  if (eventType === 'kickoff' || eventText.includes('kickoff')) return '▶️'
  if (eventType.includes('half') || eventText.includes('half-time')) return '⏱️'
  if (eventType.includes('corner') || eventText.includes('corner')) return '🚩'
  if (eventType.includes('shot') || eventText.includes('attempt')) return '🎯'

  return '•'
}

function LiveLineup({ roster }) {
  const starters = (roster?.roster || [])
    .filter((player) => player.starter)
    .sort(
      (left, right) =>
        Number(left.formationPlace || 99) - Number(right.formationPlace || 99),
    )
  const substitutes = (roster?.roster || []).filter((player) => !player.starter)

  return (
    <article className="lineup-team-card">
      <header className="lineup-team-head">
        <div>
          <img src={roster?.team?.logos?.[0]?.href} alt="" />
          <div>
            <strong>{roster?.team?.displayName}</strong>
            <span>Official match lineup</span>
          </div>
        </div>
        <b>{roster?.formation || 'Formation TBD'}</b>
      </header>

      <div className="lineup-list">
        <p>Starting XI</p>
        {starters.map((player) => (
          <article key={player.athlete?.id}>
            <strong>#{player.jersey}</strong>
            <span>{player.athlete?.displayName}</span>
            <small>{player.position?.displayName}</small>
            {player.subbedOut && <em>Subbed off</em>}
          </article>
        ))}
      </div>

      <details className="lineup-subs">
        <summary>
          Substitutes <b>{substitutes.length}</b>
        </summary>
        <div className="lineup-list">
          {substitutes.map((player) => (
            <article key={player.athlete?.id}>
              <strong>#{player.jersey}</strong>
              <span>{player.athlete?.displayName}</span>
              <small>{player.subbedIn ? 'Entered match' : 'Substitute'}</small>
            </article>
          ))}
        </div>
      </details>
    </article>
  )
}

function sortStandings(left, right) {
  return (
    right.pts - left.pts ||
    right.gd - left.gd ||
    right.gf - left.gf ||
    left.team.name_en.localeCompare(right.team.name_en)
  )
}

function buildLiveStandings(group, match, teamMap) {
  if (!group) return []

  const rows = group.teams.map((entry) => ({
    ...entry,
    mp: numberValue(entry.mp),
    w: numberValue(entry.w),
    d: numberValue(entry.d),
    l: numberValue(entry.l),
    gf: numberValue(entry.gf),
    ga: numberValue(entry.ga),
    gd: numberValue(entry.gd),
    pts: numberValue(entry.pts),
    team: teamMap[String(entry.team_id)],
    isPlaying: false,
  }))

  if (match?.time_elapsed !== 'live') return rows.sort(sortStandings)

  const home = rows.find((entry) => String(entry.team_id) === String(match.home_team_id))
  const away = rows.find((entry) => String(entry.team_id) === String(match.away_team_id))
  if (!home || !away) return rows.sort(sortStandings)

  const homeScore = numberValue(match.home_score)
  const awayScore = numberValue(match.away_score)

  home.mp += 1
  away.mp += 1
  home.gf += homeScore
  home.ga += awayScore
  away.gf += awayScore
  away.ga += homeScore
  home.gd = home.gf - home.ga
  away.gd = away.gf - away.ga
  home.isPlaying = true
  away.isPlaying = true

  if (homeScore > awayScore) {
    home.w += 1
    home.pts += 3
    away.l += 1
  } else if (awayScore > homeScore) {
    away.w += 1
    away.pts += 3
    home.l += 1
  } else {
    home.d += 1
    away.d += 1
    home.pts += 1
    away.pts += 1
  }

  return rows.sort(sortStandings)
}

function LiveMatchPage({ groups, match, onBack, stadium, teamMap }) {
  const [activeTab, setActiveTab] = useState('stats')
  const [liveSummary, setLiveSummary] = useState(null)
  const [stats, setStats] = useState([])
  const [timeline, setTimeline] = useState([])
  const [lastUpdated, setLastUpdated] = useState(null)
  const [feedError, setFeedError] = useState(false)

  useEffect(() => {
    if (!match) return undefined

    let active = true
    let eventId = ''

    async function loadLiveDetails() {
      try {
        if (!eventId) {
          const scoreboardResponse = await fetch(
            `${ESPN_BASE}/scoreboard?dates=${getDateKey(match.date)}`,
          )
          if (!scoreboardResponse.ok) throw new Error('Scoreboard lookup failed')

          const scoreboard = await scoreboardResponse.json()
          const event = scoreboard.events?.find((candidate) => {
            const names = candidate.competitions?.[0]?.competitors?.map(
              (entry) => entry.team?.displayName,
            )

            return (
              names?.includes(match.home_team_name_en) &&
              names?.includes(match.away_team_name_en)
            )
          })
          eventId = event?.id || ''
        }

        if (!eventId) throw new Error('Live event not found')

        const summaryResponse = await fetch(`${ESPN_BASE}/summary?event=${eventId}`)
        if (!summaryResponse.ok) throw new Error('Live summary failed')
        const summary = await summaryResponse.json()

        if (!active) return
        setLiveSummary(summary)
        setStats(normalizeStats(summary))
        setTimeline(summary.keyEvents || [])
        setLastUpdated(new Date())
        setFeedError(false)
      } catch {
        if (active) setFeedError(true)
      }
    }

    loadLiveDetails()
    const refreshTimer = window.setInterval(loadLiveDetails, REFRESH_INTERVAL)

    return () => {
      active = false
      window.clearInterval(refreshTimer)
    }
  }, [match])

  const homeTeam = teamMap[String(match?.home_team_id)]
  const awayTeam = teamMap[String(match?.away_team_id)]
  const liveCompetition = liveSummary?.header?.competitions?.[0]
  const liveStatus = liveCompetition?.status
  const liveHome = liveCompetition?.competitors?.find(
    (team) => team.homeAway === 'home',
  )
  const liveAway = liveCompetition?.competitors?.find(
    (team) => team.homeAway === 'away',
  )
  const effectiveMatch = useMemo(
    () => ({
      ...match,
      home_score: liveHome?.score ?? match.home_score,
      away_score: liveAway?.score ?? match.away_score,
    }),
    [liveAway?.score, liveHome?.score, match],
  )
  const matchGroup = groups.find((group) => group.name === match?.group)
  const liveStandings = useMemo(
    () => buildLiveStandings(matchGroup, effectiveMatch, teamMap),
    [matchGroup, effectiveMatch, teamMap],
  )
  const viewerTimeZone = getViewerTimeZoneLabel()
  const isLive =
    liveStatus?.type?.state === 'in' || match?.time_elapsed === 'live'
  const readableStatus = getReadableMatchStatus(match, liveStatus)
  const matchMinute = getMatchMinute(liveStatus)
  const isBreak =
    liveStatus?.type?.state !== 'in' ||
    ['STATUS_HALFTIME', 'STATUS_EXTRA_TIME_BREAK'].includes(
      liveStatus?.type?.name,
    )
  const winProbability = useMemo(
    () =>
      calculateLiveWinProbability({
        homeProfile: teamPredictionProfiles[homeTeam?.fifa_code],
        awayProfile: teamPredictionProfiles[awayTeam?.fifa_code],
        match: effectiveMatch,
        minute: matchMinute,
        stats,
      }),
    [awayTeam?.fifa_code, effectiveMatch, homeTeam?.fifa_code, matchMinute, stats],
  )

  if (!match) {
    return (
      <main className="live-page">
        <button type="button" className="back-link" onClick={onBack}>
          Back to dashboard
        </button>
        <section className="card live-empty">
          <p className="eyebrow">Live match centre</p>
          <h1>No match is available yet.</h1>
        </section>
      </main>
    )
  }

  return (
    <main className="live-page">
      <header className="live-topbar">
        <button type="button" className="back-link" onClick={onBack}>
          Back to dashboard
        </button>
        <div className="live-refresh">
          <span className={isLive ? 'live-dot' : 'live-dot idle'} />
          {isLive ? 'Updating every 5 seconds' : 'Match centre'}
          {lastUpdated && <small>Last update {lastUpdated.toLocaleTimeString()}</small>}
        </div>
      </header>

      <section className="card live-score-card">
        <div className="live-title-row">
          <div>
            <p className="eyebrow">FIFA World Cup 2026</p>
            <strong>
              Group stage · Group {match.group} · Matchday {match.matchday}
            </strong>
          </div>
          <span className={isLive ? 'status-pill live' : 'status-pill'}>
            {readableStatus || formatViewerTime(match.date)}
          </span>
        </div>

        <div className="live-scoreboard">
          <article className="live-team home">
            <img src={homeTeam?.flag} alt="" />
            <strong>{match.home_team_name_en}</strong>
            <span>{homeTeam?.fifa_code}</span>
          </article>

          <div className="live-score">
            <strong>{effectiveMatch.home_score}</strong>
            <span>–</span>
            <strong>{effectiveMatch.away_score}</strong>
            <small>
              {isLive && !isBreak && liveStatus?.displayClock
                ? `${liveStatus.displayClock} · live clock`
                : !isLive
                  ? `${formatViewerTime(match.date)} · ${viewerTimeZone}`
                  : null}
            </small>
          </div>

          <article className="live-team away">
            <img src={awayTeam?.flag} alt="" />
            <strong>{match.away_team_name_en}</strong>
            <span>{awayTeam?.fifa_code}</span>
          </article>
        </div>

        <div className="match-venue-line">
          <span>{stadium?.fifa_name || stadium?.name_en}</span>
          <span>{stadium?.city_en}</span>
        </div>
      </section>

      <section className="card probability-card">
        <div className="probability-head">
          <div>
            <p className="eyebrow">Live win probability</p>
            <h2>Likely match outcome</h2>
          </div>
          <span>Model estimate</span>
        </div>
        <div className="probability-labels">
          <article>
            <strong>{match.home_team_name_en}</strong>
            <span>{winProbability.home}%</span>
          </article>
          <article>
            <strong>Draw</strong>
            <span>{winProbability.draw}%</span>
          </article>
          <article>
            <strong>{match.away_team_name_en}</strong>
            <span>{winProbability.away}%</span>
          </article>
        </div>
        <div className="probability-bar" aria-label="Live win probability">
          <span
            className="home"
            style={{ width: `${winProbability.home}%` }}
          />
          <span
            className="draw"
            style={{ width: `${winProbability.draw}%` }}
          />
          <span
            className="away"
            style={{ width: `${winProbability.away}%` }}
          />
        </div>
        <p className="probability-note">
          Based on team strength, recent form, home advantage, current score,
          official live clock, and available live shot data.
        </p>
      </section>

      <nav className="live-tabs" aria-label="Live match sections">
        {['timeline', 'lineups', 'stats', 'standings'].map((tab) => (
          <button
            key={tab}
            type="button"
            className={activeTab === tab ? 'active' : ''}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </nav>

      {activeTab === 'timeline' && (
        <section className="card live-panel">
          <div className="live-panel-head">
            <div>
              <p className="eyebrow">Match timeline</p>
              <h2>Key moments</h2>
            </div>
            <span>{timeline.length} events</span>
          </div>
          {timeline.length ? (
            <div className="timeline-list">
              {[...timeline].reverse().map((event) => (
                <article key={event.id} className="timeline-event">
                  <strong>{event.clock?.displayValue || '–'}</strong>
                  <span className="timeline-emoji" aria-hidden="true">
                    {getTimelineEmoji(event)}
                  </span>
                  <div>
                    <span>{event.type?.text}</span>
                    <h3>{event.shortText || event.type?.text}</h3>
                    <small>{event.text || event.team?.displayName}</small>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="live-message">
              Timeline events will appear here as the live feed publishes them.
            </p>
          )}
        </section>
      )}

      {activeTab === 'lineups' && (
        <section className="card live-panel">
          <div className="live-panel-head">
            <div>
              <p className="eyebrow">Official lineups</p>
              <h2>Starting XI and substitutes</h2>
            </div>
            <span>Match feed</span>
          </div>
          {liveSummary?.rosters?.length ? (
            <div className="live-lineups">
              {liveSummary.rosters
                .slice()
                .sort((left, right) =>
                  left.homeAway === right.homeAway
                    ? 0
                    : left.homeAway === 'home'
                      ? -1
                      : 1,
                )
                .map((roster) => (
                  <LiveLineup key={roster.team?.id} roster={roster} />
                ))}
            </div>
          ) : (
            <p className="live-message">
              Official lineups will appear here when the match feed publishes them.
            </p>
          )}
        </section>
      )}

      {activeTab === 'stats' && (
        <section className="card live-panel">
          <div className="live-panel-head">
            <div>
              <p className="eyebrow">Team stats</p>
              <h2>Live match numbers</h2>
            </div>
            <div className="stat-team-flags">
              <img src={homeTeam?.flag} alt="" />
              <img src={awayTeam?.flag} alt="" />
            </div>
          </div>
          {stats.length ? (
            <div className="live-stat-list">
              {stats.map((stat) => {
                const homeValue = numberValue(stat.home)
                const awayValue = numberValue(stat.away)
                const total = Math.max(homeValue + awayValue, 1)

                return (
                  <article key={stat.name} className="live-stat-row">
                    <div className="stat-values">
                      <strong>{formatStatValue(stat.home, stat)}</strong>
                      <span>{stat.label}</span>
                      <strong>{formatStatValue(stat.away, stat)}</strong>
                    </div>
                    <div className="stat-bar" aria-hidden="true">
                      <span style={{ width: `${(homeValue / total) * 100}%` }} />
                      <span style={{ width: `${(awayValue / total) * 100}%` }} />
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <p className="live-message">
              {feedError
                ? 'The detailed stats feed is temporarily unavailable. Score and standings will keep updating.'
                : 'Live statistics are loading from the match feed.'}
            </p>
          )}
        </section>
      )}

      {activeTab === 'standings' && (
        <section className="card live-panel">
          <div className="live-panel-head">
            <div>
              <p className="eyebrow">Live standings</p>
              <h2>Group {match.group}</h2>
            </div>
            {isLive && <span className="status-pill live">In-play table</span>}
          </div>
          <div className="live-standings">
            <div className="live-standing-row heading">
              <span>#</span>
              <span>Team</span>
              <span>MP</span>
              <span>W</span>
              <span>D</span>
              <span>L</span>
              <span>GD</span>
              <span>Pts</span>
            </div>
            {liveStandings.map((entry, index) => (
              <article
                key={entry._id}
                className={`live-standing-row ${entry.isPlaying ? 'playing' : ''}`}
              >
                <strong>{index + 1}</strong>
                <span className="standing-team">
                  <img src={entry.team?.flag} alt="" />
                  <strong>{entry.team?.name_en}</strong>
                  {entry.isPlaying && (
                    <small>
                      {String(entry.team_id) === String(match.home_team_id)
                        ? `${effectiveMatch.home_score}-${effectiveMatch.away_score}`
                        : `${effectiveMatch.away_score}-${effectiveMatch.home_score}`}
                    </small>
                  )}
                </span>
                <span>{entry.mp}</span>
                <span>{entry.w}</span>
                <span>{entry.d}</span>
                <span>{entry.l}</span>
                <span>{entry.gd}</span>
                <strong>{entry.pts}</strong>
              </article>
            ))}
          </div>
          {isLive && (
            <p className="standings-note">
              The current score is applied provisionally. The official table replaces it
              after full time.
            </p>
          )}
        </section>
      )}
    </main>
  )
}

export default LiveMatchPage
