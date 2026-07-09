import { useEffect, useMemo, useState } from 'react'
import SiteNav from './SiteNav'
import {
  formatViewerTime,
  getPlayerDisplayName,
  getPlayerFullName,
  isMatchInPlay,
  normalizePosition,
} from '../lib/worldCup'

const WATCHLIST_KEY = 'world-cup-2026-player-watchlist-v1'
const ESPN_BASE = '/api/espn'

function readWatchlist() {
  try {
    const value = JSON.parse(localStorage.getItem(WATCHLIST_KEY))
    return Array.isArray(value) ? value.map(String) : []
  } catch {
    return []
  }
}

function normalizeName(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function getPlayerId(player, squad) {
  return `${squad.fifaCode}-${player.number}-${normalizeName(player.playerName)}`
}

function getStatValue(stats, name) {
  return Number(stats?.find((stat) => stat.name === name)?.value || 0)
}

function getEventMinute(event) {
  if (Number.isFinite(event?.clock?.value)) {
    return Math.max(0, Math.ceil(event.clock.value / 60))
  }

  const minute = Number.parseInt(event?.clock?.displayValue, 10)
  return Number.isFinite(minute) ? minute : 0
}

function formatGoalMinute(event) {
  const displayValue = event?.clock?.displayValue || event?.displayTime
  if (displayValue) return displayValue

  const minute = getEventMinute(event)
  return minute ? `${minute}'` : 'Goal'
}

function getMatchDuration(summary) {
  const eventMinutes = (summary?.keyEvents || []).map(getEventMinute)
  const maxEventMinute = Math.max(90, ...eventMinutes)

  return maxEventMinute > 105 ? 120 : 90
}

function findSubstitutionMinute(summary, athleteId, participantIndex) {
  const event = (summary?.keyEvents || []).find(
    (entry) =>
      entry.type?.type === 'substitution' &&
      String(entry.participants?.[participantIndex]?.athlete?.id) ===
        String(athleteId),
  )

  return event ? getEventMinute(event) : null
}

function getEstimatedMinutes(rosterPlayer, summary) {
  const athleteId = rosterPlayer?.athlete?.id
  if (!athleteId) return 0

  const matchDuration = getMatchDuration(summary)
  if (rosterPlayer.starter) {
    const subbedOffAt = findSubstitutionMinute(summary, athleteId, 1)
    return Math.max(0, Math.min(subbedOffAt || matchDuration, matchDuration))
  }

  const subbedOnAt = findSubstitutionMinute(summary, athleteId, 0)
  return subbedOnAt == null
    ? 0
    : Math.max(0, Math.min(matchDuration - subbedOnAt, matchDuration))
}

function matchesPlayer(localPlayer, rosterPlayer) {
  const playerNames = [
    localPlayer.displayName,
    localPlayer.fullName,
    localPlayer.shirtName,
    localPlayer.playerName,
  ]
    .map(normalizeName)
    .filter(Boolean)
  const athleteNames = [
    rosterPlayer?.athlete?.displayName,
    rosterPlayer?.athlete?.fullName,
    rosterPlayer?.athlete?.shortName,
  ]
    .map(normalizeName)
    .filter(Boolean)

  return athleteNames.some((athleteName) =>
    playerNames.some(
      (playerName) =>
        athleteName === playerName ||
        athleteName.includes(playerName) ||
        playerName.includes(athleteName),
    ),
  )
}

function eventBelongsToPlayerTeam(event, player) {
  const teamId = String(event?.team?.id || event?.teamId || '')
  const teamNames = [
    event?.team?.displayName,
    event?.team?.name,
    event?.team?.shortDisplayName,
  ]
    .map(normalizeName)
    .filter(Boolean)

  if (teamId && teamId === String(player.team?.id)) return true
  return teamNames.some(
    (teamName) =>
      teamName === normalizeName(player.teamName) ||
      teamName === normalizeName(player.teamCode),
  )
}

function eventMatchesPlayer(player, event) {
  const playerNames = [
    player.displayName,
    player.fullName,
    player.shirtName,
    player.playerName,
  ]
    .map(normalizeName)
    .filter(Boolean)
  const participants = [
    ...(event?.participants || []),
    ...(event?.athletes || []).map((athlete) => ({ athlete })),
  ]
  const eventNames = participants
    .flatMap((participant) => [
      participant?.displayName,
      participant?.athlete?.displayName,
      participant?.athlete?.fullName,
      participant?.athlete?.shortName,
    ])
    .map(normalizeName)
    .filter(Boolean)

  if (!eventNames.length) {
    const eventText = normalizeName(event?.shortText || event?.text)
    return playerNames.some((playerName) => eventText.includes(playerName))
  }

  return eventNames.some((eventName) =>
    playerNames.some(
      (playerName) =>
        eventName === playerName ||
        eventName.includes(playerName) ||
        playerName.includes(eventName),
    ),
  )
}

function getOpponentLabel(player, match) {
  const opponent = getOpponent(player, match)
  return opponent?.code || opponent?.name || 'opponent'
}

function getPlayerGoalEvents(player, summary, match) {
  return (summary?.keyEvents || [])
    .filter((event) => event.type?.type === 'goal' || event.scoringPlay)
    .filter((event) => eventBelongsToPlayerTeam(event, player))
    .filter((event) => eventMatchesPlayer(player, event))
    .map((event) => ({
      id: `${match.id}-${event.id || event.clock?.value || event.shortText}`,
      label: `${formatGoalMinute(event)} goal`,
      match,
      minute: getEventMinute(event),
      opponent: getOpponentLabel(player, match),
    }))
    .sort((left, right) => left.minute - right.minute)
}

function summarizePlayerMatches(player, summariesByMatchId, games) {
  return games.reduce(
    (summary, match) => {
      const matchSummary = summariesByMatchId[String(match.id)]
      const rosterPlayer = matchSummary?.rosters
        ?.flatMap((roster) => roster.roster || [])
        .find((entry) => matchesPlayer(player, entry))

      if (!rosterPlayer) return summary

      const stats = rosterPlayer.stats || []
      const yellowCards = getStatValue(stats, 'yellowCards')
      const redCards = getStatValue(stats, 'redCards')
      const goals = getStatValue(stats, 'totalGoals')
      const goalEvents = getPlayerGoalEvents(player, matchSummary, match).slice(
        0,
        goals,
      )

      summary.appearances += getStatValue(stats, 'appearances') || 1
      summary.goals += goals
      summary.assists += getStatValue(stats, 'goalAssists')
      summary.yellowCards += yellowCards
      summary.redCards += redCards
      summary.minutes += getEstimatedMinutes(rosterPlayer, matchSummary)
      summary.shots += getStatValue(stats, 'totalShots')
      summary.shotsOnTarget += getStatValue(stats, 'shotsOnTarget')
      summary.foulsCommitted += getStatValue(stats, 'foulsCommitted')
      summary.foulsSuffered += getStatValue(stats, 'foulsSuffered')
      summary.saves += getStatValue(stats, 'saves')
      summary.offsides += getStatValue(stats, 'offsides')
      summary.goalEvents.push(
        ...goalEvents,
        ...Array.from({
          length: Math.max(0, goals - goalEvents.length),
        }).map((_, index) => ({
          id: `${match.id}-${rosterPlayer.athlete?.id}-goal-${index}`,
          label: 'Goal',
          match,
          minute: 0,
          opponent: getOpponentLabel(player, match),
        })),
      )

      if (yellowCards || redCards) {
        summary.recentEvents.push({
          id: `${match.id}-${rosterPlayer.athlete?.id}`,
          label: [
            yellowCards ? `${yellowCards} yellow` : '',
            redCards ? `${redCards} red` : '',
          ]
            .filter(Boolean)
            .join(' · '),
          match,
        })
      }

      return summary
    },
    {
      appearances: 0,
      assists: 0,
      goals: 0,
      goalEvents: [],
      minutes: 0,
      foulsCommitted: 0,
      foulsSuffered: 0,
      offsides: 0,
      recentEvents: [],
      redCards: 0,
      saves: 0,
      shots: 0,
      shotsOnTarget: 0,
      yellowCards: 0,
    },
  )
}

function getNextFixture(player, games) {
  return games
    .filter(
      (game) =>
        (String(game.home_team_id) === String(player.team?.id) ||
          String(game.away_team_id) === String(player.team?.id)) &&
        String(game.finished).toLowerCase() !== 'true' &&
        (isMatchInPlay(game) || game.date.getTime() > Date.now()),
    )
    .sort((left, right) => left.date - right.date)[0]
}

function getOpponent(player, match) {
  if (!match) return null

  const isHome = String(match.home_team_id) === String(player.team?.id)
  return {
    code: isHome ? match.away_team_code : match.home_team_code,
    flag: isHome ? match.away_team_flag : match.home_team_flag,
    name: isHome ? match.away_team_name_en : match.home_team_name_en,
  }
}

function getSecondaryStats(player, stats) {
  const baseStats = [
    { label: 'Shots', value: stats.shots },
    { label: 'On target', value: stats.shotsOnTarget },
    { label: 'Fouls', value: stats.foulsCommitted },
    { label: 'Won', value: stats.foulsSuffered },
  ]

  if (normalizePosition(player.position) === 'GK') {
    return [
      { label: 'Saves', value: stats.saves },
      { label: 'Fouls', value: stats.foulsCommitted },
      { label: 'Won', value: stats.foulsSuffered },
      { label: 'Apps', value: stats.appearances },
    ]
  }

  if (normalizePosition(player.position) === 'FW') {
    return [
      ...baseStats.slice(0, 3),
      { label: 'Offside', value: stats.offsides },
    ]
  }

  return baseStats
}

function PlayerWatchlistPage({ games, onOpenResult, squads, teams }) {
  const [followedPlayerIds, setFollowedPlayerIds] = useState(readWatchlist)
  const [query, setQuery] = useState('')
  const [summariesByMatchId, setSummariesByMatchId] = useState({})
  const [feedStatus, setFeedStatus] = useState('idle')

  const teamByCode = useMemo(
    () => Object.fromEntries(teams.map((team) => [team.fifa_code, team])),
    [teams],
  )
  const players = useMemo(
    () =>
      squads.flatMap((squad) =>
        squad.players.map((player) => ({
          ...player,
          displayName: getPlayerDisplayName(player),
          fullName: getPlayerFullName(player),
          id: getPlayerId(player, squad),
          team: teamByCode[squad.fifaCode] || null,
          teamCode: squad.fifaCode,
          teamName: squad.teamName,
        })),
      ),
    [squads, teamByCode],
  )
  const followedIdSet = useMemo(
    () => new Set(followedPlayerIds),
    [followedPlayerIds],
  )
  const followedPlayers = useMemo(
    () => players.filter((player) => followedIdSet.has(player.id)),
    [followedIdSet, players],
  )
  const followedTeamIds = useMemo(
    () =>
      new Set(
        followedPlayers.map((player) => String(player.team?.id)).filter(Boolean),
      ),
    [followedPlayers],
  )
  const trackedMatches = useMemo(
    () =>
      games.filter(
        (game) =>
          (followedTeamIds.has(String(game.home_team_id)) ||
            followedTeamIds.has(String(game.away_team_id))) &&
          (String(game.finished).toLowerCase() === 'true' || isMatchInPlay(game)),
      ),
    [followedTeamIds, games],
  )
  const effectiveFeedStatus = trackedMatches.length ? feedStatus : 'idle'

  useEffect(() => {
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(followedPlayerIds))
  }, [followedPlayerIds])

  useEffect(() => {
    if (!trackedMatches.length) {
      return undefined
    }

    let active = true
    async function loadSummaries() {
      setFeedStatus('loading')
      const missingMatches = trackedMatches.filter(
        (match) => !summariesByMatchId[String(match.id)],
      )

      if (!missingMatches.length) {
        setFeedStatus('ready')
        return
      }

      const results = await Promise.allSettled(
        missingMatches.map(async (match) => {
          const response = await fetch(`${ESPN_BASE}/summary?event=${match.espn_event_id || match.id}`)
          if (!response.ok) throw new Error('Summary request failed')
          return [String(match.id), await response.json()]
        }),
      )

      if (!active) return

      const nextSummaries = {}
      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          nextSummaries[result.value[0]] = result.value[1]
        }
      })

      setSummariesByMatchId((current) => ({ ...current, ...nextSummaries }))
      setFeedStatus(results.some((result) => result.status === 'fulfilled') ? 'ready' : 'error')
    }

    loadSummaries()
    return () => {
      active = false
    }
  }, [summariesByMatchId, trackedMatches])

  const filteredPlayers = useMemo(() => {
    const search = normalizeName(query)
    const source = search ? players : followedPlayers.length ? followedPlayers : players
    const filtered = !search
      ? source
      : source.filter((player) =>
          [
            player.displayName,
            player.fullName,
            player.playerName,
            player.teamName,
            player.teamCode,
            player.position,
            player.club,
          ]
            .map(normalizeName)
            .some((value) => value.includes(search)),
        )

    return filtered.slice(0, search ? 18 : 12)
  }, [followedPlayers, players, query])

  const togglePlayer = (playerId) => {
    setFollowedPlayerIds((current) =>
      current.includes(playerId)
        ? current.filter((id) => id !== playerId)
        : [...current, playerId],
    )
  }

  return (
    <main className="detail-page player-watchlist-page">
      <SiteNav activePage="players" />

      <header className="player-watchlist-hero">
        <div>
          <p className="eyebrow">Player watchlist</p>
          <h1>Follow the players who shape the tournament</h1>
          <p>
            Search confirmed squads, save players on this device, and track
            match-feed goals, assists, cards, minutes, and their next fixture.
          </p>
        </div>
        <div className="player-watchlist-summary">
          <span>Following</span>
          <strong>{followedPlayers.length}</strong>
          <small>
            {effectiveFeedStatus === 'loading'
              ? 'Refreshing match feed'
              : 'Saved locally'}
          </small>
        </div>
      </header>

      <section className="player-watchlist-toolbar">
        <label>
          <span>Search players</span>
          <input
            aria-label="Search players"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name, team, position, club"
            type="search"
            value={query}
          />
        </label>
        <p>
          Player names come from the confirmed squad list. Live stats are read
          from ESPN match summaries when a match has lineups and box-score data.
        </p>
      </section>

      <section className="player-search-results" aria-label="Player search results">
        {filteredPlayers.map((player) => {
          const isFollowed = followedIdSet.has(player.id)
          return (
            <button
              aria-pressed={isFollowed}
              className={`player-search-card ${isFollowed ? 'active' : ''}`}
              key={player.id}
              onClick={() => togglePlayer(player.id)}
              type="button"
            >
              <span className="player-number">{player.number}</span>
              <span>
                <strong>{player.displayName}</strong>
                <small>
                  {normalizePosition(player.position)} · {player.teamName}
                </small>
              </span>
              <b>{isFollowed ? 'Following' : '+'}</b>
            </button>
          )
        })}
      </section>

      <section className="player-watchlist-feed">
        <div className="section-head">
          <div>
            <p className="eyebrow">Saved players</p>
            <h2>Your watchlist</h2>
          </div>
          {effectiveFeedStatus === 'error' && (
            <p className="muted">Match summary data is temporarily unavailable.</p>
          )}
        </div>

        {!followedPlayers.length ? (
          <div className="empty-personal-feed">
            <strong>Add players to start tracking them.</strong>
            <span>Use the search bar above and your watchlist will stay here.</span>
          </div>
        ) : (
          <div className="player-watchlist-grid">
            {followedPlayers.map((player) => {
              const stats = summarizePlayerMatches(player, summariesByMatchId, trackedMatches)
              const nextFixture = getNextFixture(player, games)
              const opponent = getOpponent(player, nextFixture)
              const secondaryStats = getSecondaryStats(player, stats)

              return (
                <article className="player-watch-card" key={player.id}>
                  <header>
                    <div>
                      <span className="player-number">{player.number}</span>
                      {player.team?.flag && <img alt="" src={player.team.flag} />}
                    </div>
                    <button onClick={() => togglePlayer(player.id)} type="button">
                      Remove
                    </button>
                  </header>
                  <h3>{player.displayName}</h3>
                  <p>
                    {normalizePosition(player.position)} · {player.teamName}
                    {player.club ? ` · ${player.club}` : ''}
                  </p>
                  <dl className="player-stat-grid">
                    <div>
                      <dt>Goals</dt>
                      <dd>{stats.goals}</dd>
                    </div>
                    <div>
                      <dt>Assists</dt>
                      <dd>{stats.assists}</dd>
                    </div>
                    <div>
                      <dt>Cards</dt>
                      <dd>
                        {stats.yellowCards}
                        <span>Y</span> {stats.redCards}
                        <span>R</span>
                      </dd>
                    </div>
                    <div>
                      <dt>Minutes</dt>
                      <dd>{stats.minutes}</dd>
                    </div>
                  </dl>
                  <dl className="player-extra-stat-grid">
                    {secondaryStats.map((stat) => (
                      <div key={stat.label}>
                        <dt>{stat.label}</dt>
                        <dd>{stat.value}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="player-next-fixture">
                    <span>Next fixture</span>
                    {nextFixture ? (
                      <div>
                        {opponent?.flag && <img alt="" src={opponent.flag} />}
                        <strong>vs {opponent?.name || opponent?.code}</strong>
                        <small>{formatViewerTime(nextFixture.date)}</small>
                      </div>
                    ) : (
                      <strong>Awaiting fixture</strong>
                    )}
                  </div>
                  {stats.recentEvents.length > 0 && (
                    <div className="player-recent-events">
                      {stats.recentEvents.map((event) => (
                        <small key={event.id}>
                          {event.label} · {event.match.home_team_code} vs{' '}
                          {event.match.away_team_code}
                        </small>
                      ))}
                    </div>
                  )}
                  {stats.goalEvents.length > 0 && (
                    <details className="player-goal-log">
                      <summary>
                        <span>Goal log</span>
                        <strong>
                          {stats.goalEvents.length}{' '}
                          {stats.goalEvents.length === 1 ? 'goal' : 'goals'}
                        </strong>
                      </summary>
                      <div>
                        {stats.goalEvents.map((goal) => (
                          <button
                            key={goal.id}
                            type="button"
                            onClick={() => onOpenResult?.(goal.match)}
                          >
                            <span>{goal.label}</span>
                            <strong>
                              vs {goal.opponent}
                            </strong>
                            <small>
                              {goal.match.home_team_code} {goal.match.home_score}
                              {' - '}
                              {goal.match.away_score} {goal.match.away_team_code}
                            </small>
                          </button>
                        ))}
                      </div>
                    </details>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}

export default PlayerWatchlistPage
