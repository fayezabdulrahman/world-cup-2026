import { startTransition, useEffect, useRef, useState } from 'react'
import fifaConfirmedSquads from './data/fifaConfirmedSquads.json'
import fixtureSnapshot from './data/fixtureSnapshot'
import teamPredictionProfiles from './data/teamPredictionProfiles.json'
import './App.css'
import FixturesSection from './components/FixturesSection'
import GroupsSection from './components/GroupsSection'
import HeroSection from './components/HeroSection'
import LiveMatchPage from './components/LiveMatchPage'
import LoadingState from './components/LoadingState'
import PredictorSection from './components/PredictorSection'
import SquadSection from './components/SquadSection'
import SiteNav from './components/SiteNav'
import TeamSnapshotCard from './components/TeamSnapshotCard'
import { buildPredictionRows } from './lib/predictions'
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
      date: parseMatchDate(
        game.local_date,
        getStadiumTimeZone(game.stadium_id),
      ),
    }))
    .sort((left, right) => left.date - right.date)
}

function App() {
  const [dashboard, setDashboard] = useState({
    groups: [],
    games: normalizeGames(fixtureSnapshot),
    stadiums: [],
    teams: [],
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [dataWarning, setDataWarning] = useState('')
  const [currentTime, setCurrentTime] = useState(() => Date.now())
  const hasDashboardData = useRef(true)
  const [selectedMatchId, setSelectedMatchId] = useState('')
  const [selectedTeamId, setSelectedTeamId] = useState('')
  const [page, setPage] = useState(() => {
    const hash = window.location.hash.slice(1)
    return ['live', 'predictions', 'squads'].includes(hash) ? hash : 'dashboard'
  })

  useEffect(() => {
    let active = true
    let gamesRefreshTimer

    async function loadDashboard(isInitialLoad = false) {
      try {
        setError('')

        const endpoints = [
          ['teams', fetchJson(`${WORLD_CUP_BASE}/get/teams`)],
          ['stadiums', fetchJson(`${WORLD_CUP_BASE}/get/stadiums`)],
          ['groups', fetchJson(`${WORLD_CUP_BASE}/get/groups`)],
        ]
        const responses = await Promise.allSettled(
          endpoints.map(([, request]) => request),
        )

        if (!active) return

        const successfulData = Object.fromEntries(
          responses.flatMap((result, index) =>
            result.status === 'fulfilled'
              ? [[endpoints[index][0], result.value]]
              : [],
          ),
        )
        const failedEndpoints = responses.flatMap((result, index) =>
          result.status === 'rejected' ? [endpoints[index][0]] : [],
        )

        if (responses.every((result) => result.status === 'rejected')) {
          throw new Error('All dashboard feeds failed')
        }

        setDashboard((current) => ({
          games: current.games,
          teams: successfulData.teams?.teams || current.teams,
          stadiums: successfulData.stadiums?.stadiums || current.stadiums,
          groups: successfulData.groups?.groups || current.groups,
        }))
        hasDashboardData.current = true
        setDataWarning(
          failedEndpoints.length
            ? `Some data could not be loaded (${failedEndpoints.join(', ')}). Refresh the page to try again.`
            : '',
        )

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
          timeoutMs: 60000,
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
        }))
        setCurrentTime(Date.now())
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

    loadDashboard(true)
    refreshGames()

    return () => {
      active = false
      window.clearTimeout(gamesRefreshTimer)
    }
  }, [])

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1)
      setPage(['live', 'predictions', 'squads'].includes(hash) ? hash : 'dashboard')
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

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

  const teamMap = Object.fromEntries(
    dashboard.teams.map((team) => [String(team.id), team]),
  )
  const stadiumMap = Object.fromEntries(
    dashboard.stadiums.map((stadium) => [String(stadium.id), stadium]),
  )
  const confirmedSquadMap = Object.fromEntries(
    fifaConfirmedSquads.squads.map((squad) => [squad.fifaCode, squad]),
  )

  const upcomingFixtures = dashboard.games.filter(
    (game) => String(game.finished).toLowerCase() !== 'true',
  )
  const latestCompletedMatch =
    dashboard.games
      .filter((game) => String(game.finished).toLowerCase() === 'true')
      .sort((left, right) => right.date - left.date)[0] || null
  const recentCompletedMatch =
    latestCompletedMatch &&
    currentTime - latestCompletedMatch.date.getTime() < 12 * 60 * 60 * 1000
      ? latestCompletedMatch
      : null
  const selectedMatch =
    dashboard.games.find((game) => game.id === selectedMatchId) ||
    upcomingFixtures[0] ||
    null
  const liveMatch =
    dashboard.games.find((game) => isMatchInPlay(game)) ||
    recentCompletedMatch ||
    selectedMatch

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

  const predictionRows = buildPredictionRows(
    dashboard.teams,
    groupTableRows,
    teamPredictionProfiles,
  ).map((row) => ({
    ...row,
    group: row.team.groups,
  }))

  const championPick = predictionRows[0]
  const totalMatchesPlayed = predictionRows.reduce(
    (sum, item) => sum + item.matchesPlayed,
    0,
  )
  const predictionMode =
    totalMatchesPlayed > 0
      ? 'FIFA ranking, qualifier form, and live World Cup form are all influencing the title probabilities.'
      : 'Title probabilities are currently driven by FIFA ranking position and qualifier-form profiles.'

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

  if (loading) {
    return <LoadingState />
  }

  if (error) {
    return <LoadingState error={error} />
  }

  if (page === 'live') {
    return (
      <div className="page-shell">
        <div className="ambient ambient-left" />
        <div className="ambient ambient-right" />
        <LiveMatchPage
          groups={groupTableRows}
          match={liveMatch}
          onBack={() => {
            window.location.hash = ''
          }}
          stadium={stadiumMap[String(liveMatch?.stadium_id)]}
          teamMap={teamMap}
        />
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
                  ? 'AI Winner Guess'
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
        spotlightMatch={liveMatch}
        spotlightStadium={stadiumMap[String(liveMatch?.stadium_id)]}
        teamMap={teamMap}
      />

      <main className="dashboard">
        {dataWarning && <p className="data-warning">{dataWarning}</p>}
        <section className="feature-grid">
          <FixturesSection
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
    </div>
  )
}

export default App
