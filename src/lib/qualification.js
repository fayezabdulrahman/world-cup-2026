import { numberValue } from './worldCup'

const OUTCOMES = ['home', 'draw', 'away']

function getTeamName(teamId, match, teamMap) {
  const team = teamMap[String(teamId)]
  if (team?.name_en) return team.name_en
  if (String(teamId) === String(match.home_team_id)) return match.home_team_name_en
  if (String(teamId) === String(match.away_team_id)) return match.away_team_name_en
  return 'This team'
}

function applyOutcome(points, game, outcome) {
  const nextPoints = { ...points }
  const homeId = String(game.home_team_id)
  const awayId = String(game.away_team_id)

  if (outcome === 'home') {
    nextPoints[homeId] += 3
  } else if (outcome === 'away') {
    nextPoints[awayId] += 3
  } else {
    nextPoints[homeId] += 1
    nextPoints[awayId] += 1
  }

  return nextPoints
}

function simulateFinalPoints(points, games, index = 0) {
  if (index >= games.length) return [points]

  return OUTCOMES.flatMap((outcome) =>
    simulateFinalPoints(applyOutcome(points, games[index], outcome), games, index + 1),
  )
}

function getScenarioStatus(teamId, startingPoints, remainingGames) {
  const finalTables = simulateFinalPoints(startingPoints, remainingGames)
  const teamKey = String(teamId)

  return finalTables.reduce(
    (status, points) => {
      const teamPoints = points[teamKey]
      const otherPoints = Object.entries(points)
        .filter(([id]) => id !== teamKey)
        .map(([, value]) => value)

      const teamsStrictlyAbove = otherPoints.filter((value) => value > teamPoints).length
      const teamsAtLeastLevel = otherPoints.filter((value) => value >= teamPoints).length

      return {
        guaranteedTopTwo:
          status.guaranteedTopTwo && teamsAtLeastLevel <= 1,
        possibleTopTwo:
          status.possibleTopTwo || teamsStrictlyAbove <= 1,
      }
    },
    { guaranteedTopTwo: true, possibleTopTwo: false },
  )
}

function getOutcomeStatus(teamId, basePoints, currentMatch, futureGames, outcome) {
  return getScenarioStatus(
    teamId,
    applyOutcome(basePoints, currentMatch, outcome),
    futureGames,
  )
}

function getTeamImplication(teamId, match, basePoints, beforeStatus, futureGames, teamMap) {
  const name = getTeamName(teamId, match, teamMap)
  const isHome = String(teamId) === String(match.home_team_id)
  const winOutcome = isHome ? 'home' : 'away'
  const lossOutcome = isHome ? 'away' : 'home'
  const winStatus = getOutcomeStatus(teamId, basePoints, match, futureGames, winOutcome)
  const drawStatus = getOutcomeStatus(teamId, basePoints, match, futureGames, 'draw')
  const lossStatus = getOutcomeStatus(teamId, basePoints, match, futureGames, lossOutcome)

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

  const teamIds = group.teams.map((entry) => String(entry.team_id))
  const basePoints = Object.fromEntries(
    group.teams.map((entry) => [String(entry.team_id), numberValue(entry.pts)]),
  )
  const unplayedGroupGames = games.filter(
    (game) =>
      game.type === 'group' &&
      game.group === match.group &&
      String(game.finished).toLowerCase() !== 'true',
  )
  const futureGames = unplayedGroupGames.filter(
    (game) => String(game.id) !== String(match.id),
  )
  const beforeStatus = Object.fromEntries(
    teamIds.map((teamId) => [
      teamId,
      getScenarioStatus(teamId, basePoints, unplayedGroupGames),
    ]),
  )
  const homeImplication = getTeamImplication(
    match.home_team_id,
    match,
    basePoints,
    beforeStatus[String(match.home_team_id)],
    futureGames,
    teamMap,
  )
  const awayImplication = getTeamImplication(
    match.away_team_id,
    match,
    basePoints,
    beforeStatus[String(match.away_team_id)],
    futureGames,
    teamMap,
  )
  const items = [homeImplication, awayImplication].filter(Boolean)

  return {
    eyebrow: 'What this match means',
    items: items.length
      ? items.slice(0, 2)
      : [`A win would put either side in a stronger position in Group ${match.group}.`],
    note: 'Finishing third may still be enough, depending on other groups.',
  }
}
