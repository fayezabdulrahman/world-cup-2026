import { startTransition, useEffect, useRef, useState } from 'react'
import { Analytics } from '@vercel/analytics/react'
import fifaConfirmedSquads from './data/fifaConfirmedSquads.json'
import teamPredictionProfiles from './data/teamPredictionProfiles.json'
import './App.css'
import FixturesSection from './components/FixturesSection'
import GroupsSection from './components/GroupsSection'
import HeroSection from './components/HeroSection'
import LiveMatchPage from './components/LiveMatchPage'
import LoadingState from './components/LoadingState'
import KnockoutPage from './components/KnockoutPage'
import MyWorldCupPage from './components/MyWorldCupPage'
import PlayerWatchlistPage from './components/PlayerWatchlistPage'
import PredictorSection from './components/PredictorSection'
import SquadSection from './components/SquadSection'
import SiteNav from './components/SiteNav'
import TeamSnapshotCard from './components/TeamSnapshotCard'
import { buildPredictionRows } from './lib/predictions'
import { buildKnockoutProjection } from './lib/knockout'
import { buildMatchImplications } from './lib/qualification'
import { buildGroupStandings } from './lib/standings'
import {
  buildSquadShape,
  fetchJson,
  getAgeOnTournamentStart,
  getStadiumTimeZone,
  getTeamFormation,
  isMatchInPlay,
  normalizePosition,
  parseMatchDate,
  WORLD_CUP_BASE,
} from './lib/worldCup'

function normalizeGames(games) {
  return games
    .map((game) => ({
      ...game,
      date: game.date
        ? new Date(game.date)
        : parseMatchDate(
            game.local_date,
            getStadiumTimeZone(game.stadium_id),
          ),
    }))
    .filter((game) => game.date && !Number.isNaN(game.date.getTime()))
    .sort((left, right) => left.date - right.date)
}

const DASHBOARD_CACHE_KEY = 'world-cup-2026-dashboard-v3'
const SPOILER_FREE_KEY = 'world-cup-2026-spoiler-free-v1'

function readSpoilerFreePreference() {
  try {
    return localStorage.getItem(SPOILER_FREE_KEY) === 'true'
  } catch {
    return false
  }
}

function readCachedDashboard() {
  try {
    const cached = JSON.parse(localStorage.getItem(DASHBOARD_CACHE_KEY))
    if (!cached?.games?.length || !cached?.teams?.length) return null

    return {
      groups: cached.groups || [],
      games: normalizeGames(cached.games),
      stadiums: cached.stadiums || [],
      teams: cached.teams || [],
    }
  } catch {
    return null
  }
}

function App() {
  const [initialDashboard] = useState(readCachedDashboard)
  const [dashboard, setDashboard] = useState(
    initialDashboard || {
      groups: [],
      games: [],
      stadiums: [],
      teams: [],
    },
  )
  const [loading, setLoading] = useState(!initialDashboard)
  const [error, setError] = useState('')
  const [dataWarning, setDataWarning] = useState('')
  const [hideSpoilers, setHideSpoilers] = useState(readSpoilerFreePreference)
  const hasDashboardData = useRef(Boolean(initialDashboard))
  const [currentTime, setCurrentTime] = useState(() => Date.now())
  const [selectedMatchId, setSelectedMatchId] = useState('')
  const [selectedCompletedMatchId, setSelectedCompletedMatchId] = useState('')
  const [selectedTeamId, setSelectedTeamId] = useState('')
  const [page, setPage] = useState(() => {
    const hash = window.location.hash.slice(1)
    return [
      'live',
      'results',
      'predictions',
      'knockout',
      'players',
      'squads',
      'my-world-cup',
    ].includes(hash)
      ? hash
      : 'dashboard'
  })

  useEffect(() => {
    let active = true
    let gamesRefreshTimer

    async function loadDashboard(isInitialLoad = false) {
      try {
        setError('')
        const payload = await fetchJson(`${WORLD_CUP_BASE}/get/games`, {
          timeoutMs: 12000,
        })
        if (!active) return

        const nextDashboard = {
          games: normalizeGames(payload.games || []),
          teams: payload.teams || [],
          stadiums: payload.stadiums || [],
          groups: payload.groups || [],
        }
        if (!nextDashboard.games.length || !nextDashboard.teams.length) {
          throw new Error('The tournament feed returned incomplete data')
        }

        setDashboard(nextDashboard)
        localStorage.setItem(
          DASHBOARD_CACHE_KEY,
          JSON.stringify({
            ...nextDashboard,
            games: payload.games,
            updatedAt: payload.updatedAt,
          }),
        )
        hasDashboardData.current = true
        setDataWarning('')
      } catch {
        if (!active) return
        if (hasDashboardData.current) {
          setDataWarning(
            'The data providers are responding slowly. Showing the latest available data.',
          )
        } else {
          setError(
            'The live data feed could not be reached right now. Try again in a moment.',
          )
        }
      } finally {
        if (active && isInitialLoad) setLoading(false)
      }
    }

    async function refreshGames(keepPollingOnFailure = false) {
      try {
        const gamesResponse = await fetchJson(`${WORLD_CUP_BASE}/get/games`, {
          timeoutMs: 12000,
        })
        if (!active) return

        const normalizedGames = normalizeGames(gamesResponse.games || [])
        const nextMatch = normalizedGames.find(
          (game) => String(game.finished).toLowerCase() !== 'true',
        )
        const hasLiveMatch = normalizedGames.some(
          (game) => String(game.time_elapsed).toLowerCase() === 'live',
        )

        setDashboard((current) => ({
          ...current,
          games: normalizedGames.length ? normalizedGames : current.games,
          groups: gamesResponse.groups || current.groups,
          stadiums: gamesResponse.stadiums || current.stadiums,
          teams: gamesResponse.teams || current.teams,
        }))
        localStorage.setItem(
          DASHBOARD_CACHE_KEY,
          JSON.stringify(gamesResponse),
        )
        setDataWarning('')

        if (nextMatch) {
          setSelectedMatchId((current) => current || nextMatch.id)
          setSelectedTeamId((current) => current || nextMatch.home_team_id)
        }

        if (hasLiveMatch && active) {
          gamesRefreshTimer = window.setTimeout(
            () => refreshGames(true),
            5000,
          )
        }
      } catch {
        if (active) {
          setDataWarning(
            keepPollingOnFailure
              ? 'Live match updates are delayed. Retrying while the match is in play.'
              : 'Match data could not be refreshed. Refresh the page to try again.',
          )

          if (keepPollingOnFailure) {
            gamesRefreshTimer = window.setTimeout(
              () => refreshGames(true),
              5000,
            )
          }
        }
      }
    }

    loadDashboard(true).then(() => {
      if (active) refreshGames()
    })

    return () => {
      active = false
      window.clearTimeout(gamesRefreshTimer)
    }
  }, [])

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1)
      setPage(
        [
          'live',
          'results',
          'predictions',
          'knockout',
          'players',
          'squads',
          'my-world-cup',
        ].includes(hash)
          ? hash
          : 'dashboard',
      )
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  useEffect(() => {
    const clockTimer = window.setInterval(() => {
      setCurrentTime(Date.now())
    }, 30_000)

    return () => window.clearInterval(clockTimer)
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(SPOILER_FREE_KEY, String(hideSpoilers))
    } catch {
      // Preference persistence is optional when storage is unavailable.
    }
  }, [hideSpoilers])

  if (loading) {
    return <LoadingState />
  }

  if (error) {
    return <LoadingState error={error} />
  }

  const handleSelectMatch = (fixture) => {
    startTransition(() => {
      setSelectedMatchId(fixture.id)
      setSelectedTeamId(fixture.home_team_id)
    })
  }

  const handleSelectTeam = (teamId) => {
    startTransition(() => {
      setSelectedTeamId(teamId)
    })
  }

  const handleSelectCompletedMatch = (fixture) => {
    startTransition(() => {
      setSelectedCompletedMatchId(fixture.id)
    })
  }

  const handleOpenLatestResult = (fixture) => {
    setSelectedCompletedMatchId(fixture.id)
    window.location.hash = 'results'
  }

  const teamMap = Object.fromEntries(
    dashboard.teams.map((team) => [String(team.id), team]),
  )
  const stadiumMap = Object.fromEntries(
    dashboard.stadiums.map((stadium) => [String(stadium.id), stadium]),
  )
  const confirmedSquadMap = Object.fromEntries(
    fifaConfirmedSquads.squads.map((squad) => [squad.fifaCode, squad]),
  )

  const upcomingFixtures = dashboard.games.filter((game) => {
    if (String(game.finished).toLowerCase() === 'true') return false
    return isMatchInPlay(game) || game.date.getTime() > currentTime
  })
  const completedMatches = dashboard.games
    .filter((game) => String(game.finished).toLowerCase() === 'true')
    .sort((left, right) => right.date - left.date)
  const latestCompletedMatch = completedMatches[0] || null
  const completedMatchIds = new Set(
    dashboard.games
      .filter((game) => String(game.finished).toLowerCase() === 'true')
      .map((game) => String(game.id)),
  )
  const selectedMatch =
    upcomingFixtures.find((game) => game.id === selectedMatchId) ||
    upcomingFixtures[0] ||
    null
  const activeLiveMatch =
    dashboard.games.find(
      (game) =>
        !completedMatchIds.has(String(game.id)) &&
        isMatchInPlay(game),
    ) || null
  const spotlightMatch = activeLiveMatch || selectedMatch
  const selectedCompletedMatch =
    completedMatches.find((game) => game.id === selectedCompletedMatchId) ||
    completedMatches[0] ||
    null

  const selectedTeam =
    teamMap[String(selectedTeamId)] ||
    teamMap[String(selectedMatch?.home_team_id)] ||
    dashboard.teams[0] ||
    null

  const selectedStadium = selectedMatch
    ? stadiumMap[String(selectedMatch.stadium_id)]
    : null
  const confirmedSquad = selectedTeam
    ? confirmedSquadMap[selectedTeam.fifa_code] || null
    : null

  const groupTableRows = buildGroupStandings(
    dashboard.groups,
    dashboard.games,
    teamMap,
  )
  const spotlightImplications = buildMatchImplications(
    spotlightMatch,
    groupTableRows,
    dashboard.games,
    teamMap,
  )
  const activeLiveImplications = buildMatchImplications(
    activeLiveMatch,
    groupTableRows,
    dashboard.games,
    teamMap,
  )
  const selectedCompletedImplications = buildMatchImplications(
    selectedCompletedMatch,
    groupTableRows,
    dashboard.games,
    teamMap,
  )

  const predictionRows = buildPredictionRows(
    dashboard.teams,
    groupTableRows,
    teamPredictionProfiles,
  ).map((row) => ({
    ...row,
    group: row.team.groups,
  }))
  const knockoutProjection = buildKnockoutProjection(
    groupTableRows,
    predictionRows,
  )
  const completedGroupMatches = dashboard.games.filter(
    (game) =>
      game.type === 'group' &&
      String(game.finished).toLowerCase() === 'true',
  ).length

  const championPick = predictionRows[0]
  const totalMatchesPlayed = predictionRows.reduce(
    (sum, item) => sum + item.matchesPlayed,
    0,
  )
  const predictionMode =
    totalMatchesPlayed > 0
      ? 'The model starts with FIFA ranking and qualifying form, then updates each team using its World Cup results as the tournament progresses.'
      : 'Before tournament results are available, the model uses FIFA ranking and qualifying form to create its starting prediction.'

  const teamFormation = getTeamFormation(selectedTeam)
  const confirmedPlayers = confirmedSquad?.players || []
  const squadShape = buildSquadShape(confirmedPlayers, teamFormation)

  const getTeamSnapshot = (teamId, fallbackTeam) => {
    const team = teamMap[String(teamId)] || fallbackTeam
    const squad = team ? confirmedSquadMap[team.fifa_code] || null : null
    const players = squad?.players || []
    const formation = getTeamFormation(team)
    const shape = buildSquadShape(players, formation)
    const counts = players.reduce(
      (result, player) => {
        result[normalizePosition(player.position)] += 1
        return result
      },
      { GK: 0, DF: 0, MF: 0, FW: 0 },
    )

    return {
      team,
      confirmedSquad: squad,
      confirmedPlayers: players,
      formation,
      starters: shape.starters,
      positionCounts: counts,
      averageAge: players.length
        ? (
            players.reduce(
              (sum, player) =>
                sum + getAgeOnTournamentStart(player.dateOfBirth),
              0,
            ) / players.length
          ).toFixed(1)
        : null,
      averageHeight: players.length
        ? Math.round(
            players.reduce((sum, player) => sum + player.heightCm, 0) /
              players.length,
          )
        : null,
      clubsRepresented: new Set(
        players.map((player) => player.club).filter(Boolean),
      ).size,
    }
  }

  const fixtureTeamSnapshots = selectedMatch
    ? [
        getTeamSnapshot(selectedMatch.home_team_id, {
          id: selectedMatch.home_team_id,
          fifa_code: selectedMatch.home_team_code,
          flag: selectedMatch.home_team_flag,
          groups: selectedMatch.group,
          name_en: selectedMatch.home_team_name_en,
        }),
        getTeamSnapshot(selectedMatch.away_team_id, {
          id: selectedMatch.away_team_id,
          fifa_code: selectedMatch.away_team_code,
          flag: selectedMatch.away_team_flag,
          groups: selectedMatch.group,
          name_en: selectedMatch.away_team_name_en,
        }),
      ]
    : []

  if (page === 'live') {
    return (
      <div className="page-shell">
        <div className="ambient ambient-left" />
        <div className="ambient ambient-right" />
        <LiveMatchPage
          key={activeLiveMatch?.id || 'live-empty'}
          groups={groupTableRows}
          hideSpoilers={hideSpoilers}
          implications={activeLiveImplications}
          match={activeLiveMatch}
          onBack={() => {
            window.location.hash = ''
          }}
          onToggleSpoilers={setHideSpoilers}
          stadium={stadiumMap[String(activeLiveMatch?.stadium_id)]}
          teamMap={teamMap}
        />
        <Analytics />
      </div>
    )
  }

  if (page === 'results') {
    return (
      <div className="page-shell">
        <div className="ambient ambient-left" />
        <div className="ambient ambient-right" />
        <LiveMatchPage
          activePage="results"
          groups={groupTableRows}
          historical
          hideSpoilers={hideSpoilers}
          implications={selectedCompletedImplications}
          key={selectedCompletedMatch?.id || 'results-empty'}
          match={selectedCompletedMatch}
          matchOptions={completedMatches}
          onBack={() => {
            window.location.hash = ''
          }}
          onSelectMatch={handleSelectCompletedMatch}
          onToggleSpoilers={setHideSpoilers}
          stadium={stadiumMap[String(selectedCompletedMatch?.stadium_id)]}
          teamMap={teamMap}
        />
        <Analytics />
      </div>
    )
  }

  if (page === 'knockout') {
    return (
      <div className="page-shell">
        <div className="ambient ambient-left" />
        <div className="ambient ambient-right" />
        <KnockoutPage
          completedGroupMatches={completedGroupMatches}
          projection={knockoutProjection}
        />
        <Analytics />
      </div>
    )
  }

  if (page === 'my-world-cup') {
    return (
      <div className="page-shell">
        <div className="ambient ambient-left" />
        <div className="ambient ambient-right" />
        <MyWorldCupPage
          games={dashboard.games}
          stadiumMap={stadiumMap}
          teams={dashboard.teams}
        />
        <Analytics />
      </div>
    )
  }

  if (page === 'players') {
    return (
      <div className="page-shell">
        <div className="ambient ambient-left" />
        <div className="ambient ambient-right" />
        <PlayerWatchlistPage
          games={dashboard.games}
          squads={fifaConfirmedSquads.squads}
          teams={dashboard.teams}
        />
        <Analytics />
      </div>
    )
  }

  if (page === 'predictions' || page === 'squads') {
    return (
      <div className="page-shell">
        <div className="ambient ambient-left" />
        <div className="ambient ambient-right" />
        <main className="detail-page">
          <SiteNav activePage={page} />
          <header className="detail-page-header">
            <a className="back-link" href="#overview">
              Back to overview
            </a>
            <div>
              <p className="eyebrow">World Cup 2026</p>
              <h1>
                {page === 'predictions'
                  ? 'AI Winner Prediction'
                  : 'Confirmed Squads'}
              </h1>
            </div>
          </header>

          {page === 'predictions' ? (
            <PredictorSection
              championPick={championPick}
              predictionMode={predictionMode}
              predictionRows={predictionRows}
            />
          ) : (
            <SquadSection
              confirmedSquad={confirmedSquad}
              dashboardTeams={dashboard.teams}
              onSelectTeam={handleSelectTeam}
              selectedTeam={selectedTeam}
              squadShape={squadShape}
              teamFormation={teamFormation}
            />
          )}
        </main>
        <Analytics />
      </div>
    )
  }

  return (
    <div className="page-shell">
      <div className="ambient ambient-left" />
      <div className="ambient ambient-right" />

      <HeroSection
        latestCompletedMatch={latestCompletedMatch}
        latestCompletedStadium={
          stadiumMap[String(latestCompletedMatch?.stadium_id)]
        }
        hideSpoilers={hideSpoilers}
        onOpenLatestResult={handleOpenLatestResult}
        spotlightImplications={spotlightImplications}
        spotlightMatch={spotlightMatch}
        spotlightStadium={stadiumMap[String(spotlightMatch?.stadium_id)]}
        teamMap={teamMap}
      />

      <main className="dashboard">
        <section className="spoiler-mode-panel" aria-label="Spoiler-free mode">
          <div>
            <strong>Spoiler-free mode</strong>
            <span>Hide live scores and results while you browse fixtures.</span>
          </div>
          <label className="spoiler-mode-toggle">
            <input
              type="checkbox"
              checked={hideSpoilers}
              onChange={(event) => setHideSpoilers(event.target.checked)}
            />
            <span aria-hidden="true" />
            {hideSpoilers ? 'On' : 'Off'}
          </label>
        </section>
        {dataWarning && <p className="data-warning">{dataWarning}</p>}
        <section className="feature-grid">
          <FixturesSection
            hideSpoilers={hideSpoilers}
            upcomingFixtures={upcomingFixtures}
            selectedMatch={selectedMatch}
            selectedStadium={selectedStadium}
            stadiumMap={stadiumMap}
            teamMap={teamMap}
            onSelectMatch={handleSelectMatch}
          />
          <TeamSnapshotCard
            fifaSourceUrl={fifaConfirmedSquads.sourceArticle}
            selectedMatch={selectedMatch}
            teamSnapshots={fixtureTeamSnapshots}
          />
        </section>

        <GroupsSection
          groupTableRows={groupTableRows}
          onSelectTeam={handleSelectTeam}
        />
      </main>
      <Analytics />
    </div>
  )
}

export default App
