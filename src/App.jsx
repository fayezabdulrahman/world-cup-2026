import { startTransition, useEffect, useState } from 'react'
import fifaConfirmedSquads from './data/fifaConfirmedSquads.json'
import teamPredictionProfiles from './data/teamPredictionProfiles.json'
import './App.css'
import FixturesSection from './components/FixturesSection'
import GroupsSection from './components/GroupsSection'
import HeroSection from './components/HeroSection'
import LiveMatchPage from './components/LiveMatchPage'
import LoadingState from './components/LoadingState'
import PredictorSection from './components/PredictorSection'
import SquadSection from './components/SquadSection'
import TeamSnapshotCard from './components/TeamSnapshotCard'
import { buildPredictionRows } from './lib/predictions'
import {
  buildSquadShape,
  fetchJson,
  getAgeOnTournamentStart,
  getStadiumTimeZone,
  getTeamFormation,
  numberValue,
  normalizePosition,
  parseMatchDate,
  WORLD_CUP_BASE,
} from './lib/worldCup'

function App() {
  const [dashboard, setDashboard] = useState({
    groups: [],
    games: [],
    stadiums: [],
    teams: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedMatchId, setSelectedMatchId] = useState('')
  const [selectedTeamId, setSelectedTeamId] = useState('')
  const [page, setPage] = useState(
    window.location.hash === '#live' ? 'live' : 'dashboard',
  )

  useEffect(() => {
    let active = true

    async function loadDashboard(isInitialLoad = false) {
      try {
        if (isInitialLoad) setLoading(true)
        setError('')

        const [gamesResponse, teamsResponse, stadiumsResponse, groupsResponse] =
          await Promise.all([
            fetchJson(`${WORLD_CUP_BASE}/get/games`),
            fetchJson(`${WORLD_CUP_BASE}/get/teams`),
            fetchJson(`${WORLD_CUP_BASE}/get/stadiums`),
            fetchJson(`${WORLD_CUP_BASE}/get/groups`),
          ])

        if (!active) return

        const normalizedGames = (gamesResponse.games || [])
          .map((game) => ({
            ...game,
            date: parseMatchDate(
              game.local_date,
              getStadiumTimeZone(game.stadium_id),
            ),
          }))
          .sort((left, right) => left.date - right.date)

        const nextMatch = normalizedGames.find(
          (game) => String(game.finished).toLowerCase() !== 'true',
        )

        setDashboard({
          games: normalizedGames,
          teams: teamsResponse.teams || [],
          stadiums: stadiumsResponse.stadiums || [],
          groups: groupsResponse.groups || [],
        })

        if (nextMatch) {
          setSelectedMatchId(nextMatch.id)
          setSelectedTeamId(nextMatch.home_team_id)
        }
      } catch {
        if (!active) return
        setError(
          'The live data feed could not be reached right now. Try again in a moment.',
        )
      } finally {
        if (active && isInitialLoad) setLoading(false)
      }
    }

    loadDashboard(true)
    const refreshTimer = window.setInterval(loadDashboard, 30000)

    return () => {
      active = false
      window.clearInterval(refreshTimer)
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

  const groupTableRows = dashboard.groups
    .map((group) => ({
      ...group,
      teams: group.teams
        .map((entry) => ({
          ...entry,
          team: teamMap[String(entry.team_id)],
        }))
        .sort((left, right) => {
          const pointGap = numberValue(right.pts) - numberValue(left.pts)
          if (pointGap !== 0) return pointGap

          const goalGap = numberValue(right.gd) - numberValue(left.gd)
          if (goalGap !== 0) return goalGap

          return numberValue(right.gf) - numberValue(left.gf)
        }),
    }))
    .sort((left, right) => left.name.localeCompare(right.name))

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
  const hostCities = new Set(dashboard.stadiums.map((stadium) => stadium.city_en)).size

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
          groups={dashboard.groups}
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
        teamCount={dashboard.teams.length}
        teamMap={teamMap}
      />

      <main className="dashboard">
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
