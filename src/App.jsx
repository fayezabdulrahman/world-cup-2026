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
import RecentResultSection from './components/RecentResultSection'
import SquadSection from './components/SquadSection'
import TeamSnapshotCard from './components/TeamSnapshotCard'
import { buildPredictionRows } from './lib/predictions'
import { buildGroupStandings } from './lib/standings'
import {
  buildSquadShape,
  fetchJson,
  getAgeOnTournamentStart,
  getStadiumTimeZone,
  getTeamFormation,
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
  const hasDashboardData = useRef(true)
  const [selectedMatchId, setSelectedMatchId] = useState('')
  const [selectedTeamId, setSelectedTeamId] = useState('')
  const [page, setPage] = useState(
    window.location.hash === '#live' ? 'live' : 'dashboard',
  )

  useEffect(() => {
    let active = true

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
            ? `Some live data is delayed (${failedEndpoints.join(', ')}). Retrying automatically.`
            : '',
        )

      } catch {
        if (!active) return
        if (hasDashboardData.current) {
          setDataWarning(
            'The live providers are responding slowly. Showing the latest available data and retrying automatically.',
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

    async function refreshGames() {
      try {
        const gamesResponse = await fetchJson(`${WORLD_CUP_BASE}/get/games`, {
          timeoutMs: 60000,
        })
        if (!active) return

        const normalizedGames = normalizeGames(gamesResponse.games || [])
        const nextMatch = normalizedGames.find(
          (game) => String(game.finished).toLowerCase() !== 'true',
        )

        setDashboard((current) => ({
          ...current,
          games: normalizedGames.length ? normalizedGames : current.games,
        }))
        setDataWarning('')

        if (nextMatch) {
          setSelectedMatchId((current) => current || nextMatch.id)
          setSelectedTeamId((current) => current || nextMatch.home_team_id)
        }
      } catch {
        if (active) {
          setDataWarning(
            'Live match updates are delayed. Showing the latest bundled fixtures and retrying automatically.',
          )
        }
      }
    }

    loadDashboard(true)
    refreshGames()
    const dashboardRefreshTimer = window.setInterval(loadDashboard, 300000)
    const gamesRefreshTimer = window.setInterval(refreshGames, 30000)

    return () => {
      active = false
      window.clearInterval(dashboardRefreshTimer)
      window.clearInterval(gamesRefreshTimer)
    }
  }, [])

  useEffect(() => {
    const handleHashChange = () => {
      setPage(window.location.hash === '#live' ? 'live' : 'dashboard')
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
  const selectedMatch =
    dashboard.games.find((game) => game.id === selectedMatchId) ||
    upcomingFixtures[0] ||
    null
  const liveMatch =
    dashboard.games.find((game) => game.time_elapsed === 'live') || selectedMatch

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

  const openingMatch = dashboard.games[0]
  const hostCities =
    new Set(dashboard.stadiums.map((stadium) => stadium.city_en)).size || 16

  const teamFormation = getTeamFormation(selectedTeam)
  const confirmedPlayers = confirmedSquad?.players || []
  const squadShape = buildSquadShape(confirmedPlayers, teamFormation)
  const positionCounts = confirmedPlayers.reduce(
    (counts, player) => {
      counts[normalizePosition(player.position)] += 1
      return counts
    },
    { GK: 0, DF: 0, MF: 0, FW: 0 },
  )
  const averageAge = confirmedPlayers.length
    ? (
        confirmedPlayers.reduce(
          (sum, player) => sum + getAgeOnTournamentStart(player.dateOfBirth),
          0,
        ) / confirmedPlayers.length
      ).toFixed(1)
    : null
  const averageHeight = confirmedPlayers.length
    ? Math.round(
        confirmedPlayers.reduce((sum, player) => sum + player.heightCm, 0) /
          confirmedPlayers.length,
      )
    : null
  const clubsRepresented = new Set(
    confirmedPlayers.map((player) => player.club).filter(Boolean),
  ).size

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

  return (
    <div className="page-shell">
      <div className="ambient ambient-left" />
      <div className="ambient ambient-right" />

      <HeroSection
        openingMatch={openingMatch}
        hostCities={hostCities}
        selectedMatch={selectedMatch}
        selectedStadium={selectedStadium}
        teamCount={dashboard.teams.length || 48}
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
          <PredictorSection
            championPick={championPick}
            predictionMode={predictionMode}
            predictionRows={predictionRows}
          />
        </section>

        <RecentResultSection
          match={latestCompletedMatch}
          stadium={stadiumMap[String(latestCompletedMatch?.stadium_id)]}
          teamMap={teamMap}
        />

        <section className="command-grid">
          <SquadSection
            confirmedSquad={confirmedSquad}
            dashboardTeams={dashboard.teams}
            onSelectTeam={handleSelectTeam}
            selectedTeam={selectedTeam}
            squadShape={squadShape}
            teamFormation={teamFormation}
          />
          <TeamSnapshotCard
            averageAge={averageAge}
            averageHeight={averageHeight}
            clubsRepresented={clubsRepresented}
            confirmedPlayers={confirmedPlayers}
            confirmedSquad={confirmedSquad}
            fifaSourceUrl={fifaConfirmedSquads.sourceArticle}
            positionCounts={positionCounts}
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
