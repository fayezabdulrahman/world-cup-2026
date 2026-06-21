import { rankGroupRows } from './standings.js'

const OUTCOMES = {
  home: [1, 0],
  draw: [0, 0],
  away: [0, 1],
}

function getTeamName(teamId, match, teamMap) {
  const team = teamMap[String(teamId)]
  if (team?.name_en) return team.name_en
  if (String(teamId) === String(match.home_team_id)) return match.home_team_name_en
  if (String(teamId) === String(match.away_team_id)) return match.away_team_name_en
  return 'This team'
}

function applyOutcome(games, game, outcome) {
  const [homeScore, awayScore] = OUTCOMES[outcome]

  return [
    ...games,
    {
      ...game,
      home_score: homeScore,
      away_score: awayScore,
      home_conduct_score: 0,
      away_conduct_score: 0,
      finished: 'TRUE',
    },
  ]
}

function buildRows(teamRows, games) {
  const rows = teamRows.map((row) => ({
    ...row,
    mp: 0,
    pts: 0,
    gf: 0,
    ga: 0,
    gd: 0,
    conductScore: 0,
  }))
  const rowMap = Object.fromEntries(
    rows.map((row) => [String(row.team_id), row]),
  )

  games.forEach((game) => {
    const home = rowMap[String(game.home_team_id)]
    const away = rowMap[String(game.away_team_id)]
    if (!home || !away) return

    const homeScore = Number(game.home_score) || 0
    const awayScore = Number(game.away_score) || 0
    home.mp += 1
    away.mp += 1
    home.gf += homeScore
    home.ga += awayScore
    home.conductScore += Number(game.home_conduct_score) || 0
    away.gf += awayScore
    away.ga += homeScore
    away.conductScore += Number(game.away_conduct_score) || 0

    if (homeScore > awayScore) {
      home.pts += 3
    } else if (awayScore > homeScore) {
      away.pts += 3
    } else {
      home.pts += 1
      away.pts += 1
    }
  })

  rows.forEach((row) => {
    row.gd = row.gf - row.ga
  })

  return rankGroupRows(rows, games)
}

function simulateFinalTables(teamRows, completedGames, remainingGames, index = 0) {
  if (index >= remainingGames.length) {
    return [buildRows(teamRows, completedGames)]
  }

  return Object.keys(OUTCOMES).flatMap((outcome) =>
    simulateFinalTables(
      teamRows,
      applyOutcome(completedGames, remainingGames[index], outcome),
      remainingGames,
      index + 1,
    ),
  )
}

function getScenarioStatus(teamId, teamRows, completedGames, remainingGames) {
  const finalTables = simulateFinalTables(
    teamRows,
    completedGames,
    remainingGames,
  )
  const teamKey = String(teamId)

  return finalTables.reduce(
    (status, rows) => {
      const teamRow = rows.find((row) => String(row.team_id) === teamKey)
      const position = rows.indexOf(teamRow) + 1
      const teamsAtLeastLevel = rows.filter(
        (row) =>
          String(row.team_id) !== teamKey &&
          Number(row.pts) >= Number(teamRow?.pts),
      ).length

      return {
        guaranteedTopTwo:
          status.guaranteedTopTwo && teamsAtLeastLevel <= 1,
        possibleTopTwo: status.possibleTopTwo || position <= 2,
      }
    },
    { guaranteedTopTwo: true, possibleTopTwo: false },
  )
}

function getOutcomeStatus(
  teamId,
  teamRows,
  completedGames,
  currentMatch,
  futureGames,
  outcome,
) {
  return getScenarioStatus(
    teamId,
    teamRows,
    applyOutcome(completedGames, currentMatch, outcome),
    futureGames,
  )
}

function getTeamImplication({
  teamId,
  match,
  teamRows,
  completedGames,
  beforeStatus,
  futureGames,
  teamMap,
}) {
  const name = getTeamName(teamId, match, teamMap)
  const isHome = String(teamId) === String(match.home_team_id)
  const winOutcome = isHome ? 'home' : 'away'
  const lossOutcome = isHome ? 'away' : 'home'
  const winStatus = getOutcomeStatus(
    teamId,
    teamRows,
    completedGames,
    match,
    futureGames,
    winOutcome,
  )
  const drawStatus = getOutcomeStatus(
    teamId,
    teamRows,
    completedGames,
    match,
    futureGames,
    'draw',
  )
  const lossStatus = getOutcomeStatus(
    teamId,
    teamRows,
    completedGames,
    match,
    futureGames,
    lossOutcome,
  )

  if (!beforeStatus.guaranteedTopTwo) {
    if (winStatus.guaranteedTopTwo && drawStatus.guaranteedTopTwo) {
      return `${name} secure a top-two place with a draw.`
    }

    if (winStatus.guaranteedTopTwo) {
      return `${name} secure a top-two place with a win.`
    }
  }

  if (beforeStatus.possibleTopTwo) {
    if (winStatus.possibleTopTwo && !drawStatus.possibleTopTwo) {
      return `${name} must win to stay in the top-two race.`
    }

    if (drawStatus.possibleTopTwo && !lossStatus.possibleTopTwo) {
      return `${name} need a draw to stay in the top-two race.`
    }
  }

  if (beforeStatus.guaranteedTopTwo) {
    return `${name} are already protected in the top-two picture.`
  }

  return null
}

export function buildMatchImplications(match, groupTableRows, games, teamMap) {
  if (!match || match.type !== 'group' || !match.group) return null

  const group = groupTableRows.find((entry) => entry.name === match.group)
  if (!group?.teams?.length) return null

  const currentMatchId = String(match.id)
  const completedGroupGames = games.filter(
    (game) =>
      game.type === 'group' &&
      game.group === match.group &&
      String(game.finished).toLowerCase() === 'true' &&
      String(game.id) !== currentMatchId,
  )
  const futureGames = games.filter(
    (game) =>
      game.type === 'group' &&
      game.group === match.group &&
      String(game.finished).toLowerCase() !== 'true' &&
      String(game.id) !== currentMatchId,
  )
  const allGamesFromMatch = [match, ...futureGames]
  const beforeStatus = Object.fromEntries(
    group.teams.map((row) => [
      String(row.team_id),
      getScenarioStatus(
        row.team_id,
        group.teams,
        completedGroupGames,
        allGamesFromMatch,
      ),
    ]),
  )
  const commonArgs = {
    match,
    teamRows: group.teams,
    completedGames: completedGroupGames,
    futureGames,
    teamMap,
  }
  const homeImplication = getTeamImplication({
    ...commonArgs,
    teamId: match.home_team_id,
    beforeStatus: beforeStatus[String(match.home_team_id)],
  })
  const awayImplication = getTeamImplication({
    ...commonArgs,
    teamId: match.away_team_id,
    beforeStatus: beforeStatus[String(match.away_team_id)],
  })
  const items = [homeImplication, awayImplication].filter(Boolean)

  return {
    eyebrow: 'What this match means',
    items: items.length
      ? items.slice(0, 2)
      : [`A win would put either side in a stronger position in Group ${match.group}.`],
    note:
      'New for 2026: head-to-head results break a points tie before overall goal difference. Finishing third may still be enough.',
  }
}
