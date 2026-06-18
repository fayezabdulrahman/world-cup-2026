import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
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
import { findMatchEvent, getScoreboardDateRange } from '../lib/espn'
import MatchImplicationsCard from './MatchImplicationsCard'
import MatchOdds from './MatchOdds'
import SiteNav from './SiteNav'

const ESPN_BASE = '/api/espn'
const REFRESH_INTERVAL = 5000

function formatResultDate(date) {
  if (!date) return 'Date TBD'

  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

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

function getTimelineEventLabel(event) {
  const type = event.type?.type || ''
  const text = `${event.text || ''} ${event.shortText || ''}`.toLowerCase()

  if (type === 'start-delay' && text.includes('drinks break')) {
    return 'Hydration break'
  }
  if (type === 'end-delay') return 'Play resumes'

  return event.type?.text || 'Match update'
}

function normalizeTimeline(events) {
  return (events || []).reduce((normalized, event) => {
    const eventType = event.type?.type
    const isDelayBoundary =
      eventType === 'start-delay' || eventType === 'end-delay'

    if (isDelayBoundary && !event.text?.trim()) return normalized

    const duplicateIndex = normalized.findIndex(
      (candidate) =>
        candidate.type?.type === event.type?.type &&
        candidate.period?.number === event.period?.number &&
        candidate.clock?.value === event.clock?.value &&
        (!candidate.text || !event.text),
    )

    if (duplicateIndex === -1) {
      normalized.push(event)
      return normalized
    }

    const current = normalized[duplicateIndex]
    const currentDetailScore =
      Number(Boolean(current.text)) +
      Number(Boolean(current.shortText)) +
      (current.participants?.length || 0)
    const eventDetailScore =
      Number(Boolean(event.text)) +
      Number(Boolean(event.shortText)) +
      (event.participants?.length || 0)

    if (eventDetailScore > currentDetailScore) normalized[duplicateIndex] = event
    return normalized
  }, [])
}

function getFreshestScore(match, liveHomeScore, liveAwayScore) {
  if (liveHomeScore == null || liveAwayScore == null) {
    return {
      home_score: match?.home_score,
      away_score: match?.away_score,
    }
  }

  const feedTotal =
    numberValue(match?.home_score) + numberValue(match?.away_score)
  const summaryTotal =
    numberValue(liveHomeScore) + numberValue(liveAwayScore)

  if (feedTotal > summaryTotal) {
    return {
      home_score: match?.home_score,
      away_score: match?.away_score,
    }
  }

  return {
    home_score: liveHomeScore,
    away_score: liveAwayScore,
  }
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

function LiveMatchPage({
  activePage = 'live',
  groups,
  historical = false,
  hideSpoilers = false,
  implications,
  match,
  matchOptions = [],
  onBack,
  onSelectMatch,
  onToggleSpoilers,
  stadium,
  teamMap,
}) {
  const [activeTab, setActiveTab] = useState('stats')
  const [liveSummary, setLiveSummary] = useState(null)
  const [stats, setStats] = useState([])
  const [timeline, setTimeline] = useState([])
  const [lastUpdated, setLastUpdated] = useState(null)
  const [feedError, setFeedError] = useState(false)
  const selectedMatchRef = useRef(null)
  const matchEventId = match?.espn_event_id || ''
  const matchDateTime = match?.date?.getTime()
  const matchHomeName = match?.home_team_name_en
  const matchAwayName = match?.away_team_name_en
  const matchTimeElapsed = match?.time_elapsed

  useLayoutEffect(() => {
    if (!historical) return

    selectedMatchRef.current?.scrollIntoView({
      block: 'nearest',
      inline: 'nearest',
    })
  }, [historical, match?.id])

  useEffect(() => {
    if (!matchDateTime || !matchHomeName || !matchAwayName) return undefined

    let active = true
    let eventId = matchEventId
    let refreshTimer
    const feedMatch = {
      home_team_name_en: matchHomeName,
      away_team_name_en: matchAwayName,
    }

    async function loadLiveDetails() {
      try {
        if (!eventId) {
          const scoreboardResponse = await fetch(
            `${ESPN_BASE}/scoreboard?dates=${getScoreboardDateRange(new Date(matchDateTime))}`,
            { cache: 'no-store' },
          )
          if (!scoreboardResponse.ok) throw new Error('Scoreboard lookup failed')

          const scoreboard = await scoreboardResponse.json()
          const event = findMatchEvent(scoreboard.events, feedMatch)
          eventId = event?.id || ''
        }

        if (!eventId) throw new Error('Live event not found')

        const summaryResponse = await fetch(
          `${ESPN_BASE}/summary?event=${eventId}`,
          { cache: 'no-store' },
        )
        if (!summaryResponse.ok) throw new Error('Live summary failed')
        const summary = await summaryResponse.json()

        if (!active) return
        setLiveSummary(summary)
        setStats(normalizeStats(summary))
        setTimeline(normalizeTimeline(summary.keyEvents))
        setLastUpdated(new Date())
        setFeedError(false)

        if (summary.header?.competitions?.[0]?.status?.type?.state === 'in') {
          refreshTimer = window.setTimeout(loadLiveDetails, REFRESH_INTERVAL)
        }
      } catch {
        if (!active) return

        setFeedError(true)
        if (String(matchTimeElapsed).toLowerCase() === 'live') {
          refreshTimer = window.setTimeout(loadLiveDetails, REFRESH_INTERVAL)
        }
      }
    }

    loadLiveDetails()

    return () => {
      active = false
      window.clearTimeout(refreshTimer)
    }
  }, [
    matchAwayName,
    matchDateTime,
    matchEventId,
    matchHomeName,
    matchTimeElapsed,
  ])

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
  const effectiveMatch = useMemo(() => {
    const score = getFreshestScore(match, liveHome?.score, liveAway?.score)

    return {
      ...match,
      ...score,
    }
  }, [liveAway?.score, liveHome?.score, match])
  const matchGroup = groups.find((group) => group.name === match?.group)
  const liveStandings = useMemo(
    () =>
      buildLiveStandings(
        matchGroup,
        hideSpoilers
          ? { ...effectiveMatch, time_elapsed: 'hidden' }
          : effectiveMatch,
        teamMap,
      ),
    [effectiveMatch, hideSpoilers, matchGroup, teamMap],
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
        <SiteNav activePage={activePage} />
        <section className="card live-empty">
          <p className="eyebrow">
            {historical ? 'Past fixtures' : 'Live match centre'}
          </p>
          <h1>
            {historical
              ? 'No completed matches yet.'
              : 'No live game currently.'}
          </h1>
          {historical ? (
            <p>Completed fixtures will appear here once the final whistle goes.</p>
          ) : (
            <>
              <p>
                There is no World Cup match in play right now. You can revisit
                completed games, scores, lineups, timelines, and match stats.
              </p>
              <a className="live-match-cta" href="#results">
                View past fixtures
              </a>
            </>
          )}
        </section>
      </main>
    )
  }

  return (
    <main className="live-page">
      <SiteNav activePage={activePage} />

      {historical && (
        <section className="card past-fixtures-card">
          <div className="live-panel-head">
            <div>
              <p className="eyebrow">Past fixtures</p>
              <h1>Completed matches</h1>
            </div>
            <span>{matchOptions.length} results</span>
          </div>
          <div
            className="compact-past-fixture-list"
            role="region"
            aria-label="Completed match results"
            tabIndex="0"
          >
            {matchOptions.map((fixture) => {
              const fixtureHome = teamMap[String(fixture.home_team_id)]
              const fixtureAway = teamMap[String(fixture.away_team_id)]

              return (
                <button
                  key={fixture.id}
                  ref={fixture.id === match.id ? selectedMatchRef : undefined}
                  type="button"
                  className={fixture.id === match.id ? 'active' : ''}
                  onClick={() => onSelectMatch?.(fixture)}
                >
                  <span className="compact-past-date">
                    <strong>{formatResultDate(fixture.date)}</strong>
                    <small>Matchday {fixture.matchday || 'TBD'}</small>
                  </span>
                  <span className="compact-past-teams">
                    <span>
                      <img
                        src={fixtureHome?.flag || fixture.home_team_flag}
                        alt=""
                        loading="lazy"
                      />
                      <strong>{fixture.home_team_name_en}</strong>
                    </span>
                    <span>
                      <img
                        src={fixtureAway?.flag || fixture.away_team_flag}
                        alt=""
                        loading="lazy"
                      />
                      <strong>{fixture.away_team_name_en}</strong>
                    </span>
                  </span>
                  <span className="compact-past-score">
                    <strong>
                      {hideSpoilers
                        ? 'Hidden'
                        : `${fixture.home_score} – ${fixture.away_score}`}
                    </strong>
                    <small>{hideSpoilers ? 'Spoiler-free' : `Group ${fixture.group}`}</small>
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      )}

      <section className="card live-score-card">
        <div className="live-card-actions">
          <button type="button" className="back-link" onClick={onBack}>
            Back to dashboard
          </button>
          <div className="live-refresh">
            <span className={isLive ? 'live-dot' : 'live-dot idle'} />
            {isLive
              ? 'Live Updates'
              : historical
                ? 'Completed match'
                : 'Match centre'}
            {lastUpdated && (
              <small>Last update {lastUpdated.toLocaleTimeString()}</small>
            )}
          </div>
          <label className="spoiler-mode-toggle compact">
            <input
              type="checkbox"
              checked={hideSpoilers}
              onChange={(event) => onToggleSpoilers?.(event.target.checked)}
            />
            <span aria-hidden="true" />
            Spoiler-free {hideSpoilers ? 'on' : 'off'}
          </label>
        </div>

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
            <strong>{hideSpoilers ? '–' : effectiveMatch.home_score}</strong>
            <span>–</span>
            <strong>{hideSpoilers ? '–' : effectiveMatch.away_score}</strong>
            <small>
              {hideSpoilers
                ? 'Score hidden'
                : isLive && !isBreak && liveStatus?.displayClock
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
        {!historical && (
          <MatchImplicationsCard implications={implications} />
        )}
      </section>

      {!historical && isLive && !hideSpoilers && (
        <MatchOdds isLive liveMinute={matchMinute} match={match} />
      )}

      {!historical && !hideSpoilers && <section className="card probability-card">
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
      </section>}

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
          {hideSpoilers ? (
            <p className="live-message">
              Timeline events are hidden in spoiler-free mode.
            </p>
          ) : timeline.length ? (
            <div className="timeline-list">
              {[...timeline].reverse().map((event) => {
                const isGoal = event.type?.type === 'goal' || event.scoringPlay
                const eventLabel = getTimelineEventLabel(event)

                return (
                  <article
                    key={event.id}
                    className={`timeline-event${isGoal ? ' goal' : ''}`}
                  >
                    <strong>{event.clock?.displayValue || '–'}</strong>
                    <span className="timeline-emoji" aria-hidden="true">
                      {getTimelineEmoji(event)}
                    </span>
                    <div>
                      <div className="timeline-event-meta">
                        {(event.shortText || isGoal) && <span>{eventLabel}</span>}
                        {isGoal && event.team?.displayName && (
                          <strong className="timeline-goal-team">
                            {event.team.displayName}
                          </strong>
                        )}
                      </div>
                      <h3>{event.shortText || eventLabel}</h3>
                      {(event.text || (!isGoal && event.team?.displayName)) && (
                        <small>{event.text || event.team.displayName}</small>
                      )}
                    </div>
                  </article>
                )
              })}
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
              <h2>{historical ? 'Final match numbers' : 'Live match numbers'}</h2>
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
                ? historical
                  ? 'The detailed stats feed is unavailable for this completed match.'
                  : 'The detailed stats feed is temporarily unavailable. Score and standings will keep updating.'
                : historical
                  ? 'Final statistics are loading from the match feed.'
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
              <span className="standing-mp">MP</span>
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
                      {hideSpoilers
                        ? 'Score hidden'
                        : String(entry.team_id) === String(match.home_team_id)
                          ? `${effectiveMatch.home_score}-${effectiveMatch.away_score}`
                          : `${effectiveMatch.away_score}-${effectiveMatch.home_score}`}
                    </small>
                  )}
                </span>
                <span className="standing-mp">{entry.mp}</span>
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
              {hideSpoilers
                ? 'In-play score details are hidden in spoiler-free mode.'
                : 'The current score is applied provisionally. The official table replaces it after full time.'}
            </p>
          )}
        </section>
      )}
    </main>
  )
}

export default LiveMatchPage
