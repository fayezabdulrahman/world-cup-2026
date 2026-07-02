import { rankGroupRows } from './standings.js'
import { numberValue } from './worldCup.js'

const OUTCOMES = {
  home: [1, 0],
  draw: [0, 0],
  away: [0, 1],
}

const ROUND_OF_32_SLOT_ORDER = [
  {
    matchNumber: 73,
    teams: [
      { group: 'A', position: 2, label: 'Group A runner-up' },
      { group: 'B', position: 2, label: 'Group B runner-up' },
    ],
  },
  {
    matchNumber: 75,
    teams: [
      { group: 'F', position: 1, label: 'Group F winner' },
      { group: 'C', position: 2, label: 'Group C runner-up' },
    ],
  },
  {
    matchNumber: 74,
    teams: [
      { group: 'E', position: 1, label: 'Group E winner' },
      { thirdPlaceGroups: ['A', 'B', 'C', 'D', 'F'], label: 'Best third-place' },
    ],
  },
  {
    matchNumber: 77,
    teams: [
      { group: 'I', position: 1, label: 'Group I winner' },
      { thirdPlaceGroups: ['C', 'D', 'F', 'G', 'H'], label: 'Best third-place' },
    ],
  },
  {
    matchNumber: 76,
    teams: [
      { group: 'C', position: 1, label: 'Group C winner' },
      { group: 'F', position: 2, label: 'Group F runner-up' },
    ],
  },
  {
    matchNumber: 78,
    teams: [
      { group: 'E', position: 2, label: 'Group E runner-up' },
      { group: 'I', position: 2, label: 'Group I runner-up' },
    ],
  },
  {
    matchNumber: 79,
    teams: [
      { group: 'A', position: 1, label: 'Group A winner' },
      { thirdPlaceGroups: ['C', 'E', 'F', 'H', 'I'], label: 'Best third-place' },
    ],
  },
  {
    matchNumber: 80,
    teams: [
      { group: 'L', position: 1, label: 'Group L winner' },
      { thirdPlaceGroups: ['E', 'H', 'I', 'J', 'K'], label: 'Best third-place' },
    ],
  },
  {
    matchNumber: 83,
    teams: [
      { group: 'K', position: 2, label: 'Group K runner-up' },
      { group: 'L', position: 2, label: 'Group L runner-up' },
    ],
  },
  {
    matchNumber: 84,
    teams: [
      { group: 'H', position: 1, label: 'Group H winner' },
      { group: 'J', position: 2, label: 'Group J runner-up' },
    ],
  },
  {
    matchNumber: 81,
    teams: [
      { group: 'D', position: 1, label: 'Group D winner' },
      { thirdPlaceGroups: ['B', 'E', 'F', 'I', 'J'], label: 'Best third-place' },
    ],
  },
  {
    matchNumber: 82,
    teams: [
      { group: 'G', position: 1, label: 'Group G winner' },
      { thirdPlaceGroups: ['A', 'E', 'H', 'I', 'J'], label: 'Best third-place' },
    ],
  },
  {
    matchNumber: 86,
    teams: [
      { group: 'J', position: 1, label: 'Group J winner' },
      { group: 'H', position: 2, label: 'Group H runner-up' },
    ],
  },
  {
    matchNumber: 88,
    teams: [
      { group: 'D', position: 2, label: 'Group D runner-up' },
      { group: 'G', position: 2, label: 'Group G runner-up' },
    ],
  },
  {
    matchNumber: 85,
    teams: [
      { group: 'B', position: 1, label: 'Group B winner' },
      { thirdPlaceGroups: ['E', 'F', 'G', 'I', 'J'], label: 'Best third-place' },
    ],
  },
  {
    matchNumber: 87,
    teams: [
      { group: 'K', position: 1, label: 'Group K winner' },
      { thirdPlaceGroups: ['D', 'E', 'I', 'J', 'L'], label: 'Best third-place' },
    ],
  },
]

const LIVE_ROUND_ORDER = [
  { type: 'round-of-32', name: 'Round of 32' },
  { type: 'round-of-16', name: 'Round of 16' },
  { type: 'quarterfinals', name: 'Quarter-finals' },
  { type: 'semifinals', name: 'Semi-finals' },
  { type: 'final', name: 'Final' },
]

function compareQualificationRows(left, right) {
  return (
    numberValue(right.pts) - numberValue(left.pts) ||
    numberValue(right.gd) - numberValue(left.gd) ||
    numberValue(right.gf) - numberValue(left.gf) ||
    numberValue(right.conductScore) - numberValue(left.conductScore) ||
    numberValue(left.fifaRank || 999) - numberValue(right.fifaRank || 999) ||
    (left.team?.name_en || '').localeCompare(right.team?.name_en || '')
  )
}

function isFinished(game) {
  return String(game.finished).toLowerCase() === 'true'
}

function isPlaceholderTeamName(value) {
  return /(winner|loser)$/i.test(String(value || '').trim())
}

function getMatchWinnerId(game) {
  if (game.winner_team_id) return String(game.winner_team_id)
  if (game.home_winner) return String(game.home_team_id)
  if (game.away_winner) return String(game.away_team_id)
  if (!isFinished(game)) return ''

  const homeScore = numberValue(game.home_score)
  const awayScore = numberValue(game.away_score)
  if (homeScore > awayScore) return String(game.home_team_id)
  if (awayScore > homeScore) return String(game.away_team_id)
  return ''
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

function avoidGroupRematch(pairs) {
  for (let index = 0; index < pairs.length; index += 1) {
    const [home, away] = pairs[index]
    if (home.group !== away.group) continue

    const swapIndex = pairs.findIndex(
      ([, candidate], candidateIndex) =>
        candidateIndex > index &&
        candidate.group !== home.group &&
        away.group !== pairs[candidateIndex][0].group,
    )

    if (swapIndex === -1) continue

    const replacement = pairs[swapIndex][1]
    pairs[swapIndex][1] = away
    pairs[index][1] = replacement
  }

  return pairs
}

function buildScenarioRows(teamRows, games) {
  const rows = teamRows.map((row) => ({
    ...row,
    mp: 0,
    w: 0,
    d: 0,
    l: 0,
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

    const homeScore = numberValue(game.home_score)
    const awayScore = numberValue(game.away_score)

    home.mp += 1
    away.mp += 1
    home.gf += homeScore
    home.ga += awayScore
    home.conductScore += numberValue(game.home_conduct_score)
    away.gf += awayScore
    away.ga += homeScore
    away.conductScore += numberValue(game.away_conduct_score)

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
  })

  rows.forEach((row) => {
    row.gd = row.gf - row.ga
  })

  return rankGroupRows(rows, games)
}

function simulateFinalTables(teamRows, completedGames, remainingGames, index = 0) {
  if (index >= remainingGames.length) {
    return [buildScenarioRows(teamRows, completedGames)]
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

function buildGroupScenarios(projectedGroups, games) {
  return Object.fromEntries(
    projectedGroups.map((group) => {
      const groupGames = games.filter(
        (game) => game.type === 'group' && game.group === group.name,
      )
      const completedGames = groupGames.filter(isFinished)
      const remainingGames = groupGames.filter((game) => !isFinished(game))

      return [
        group.name,
        simulateFinalTables(group.teams, completedGames, remainingGames),
      ]
    }),
  )
}

function isGuaranteedBestThirdPlace(teamRow, groupName, groupScenarios) {
  const betterThirdPlaceGroups = Object.entries(groupScenarios).filter(
    ([candidateGroupName, scenarios]) =>
      candidateGroupName !== groupName &&
      scenarios.some((rows) => compareQualificationRows(rows[2], teamRow) < 0),
  ).length

  return betterThirdPlaceGroups <= 7
}

function getConfirmedQualifierIds(projectedGroups, games) {
  const groupScenarios = buildGroupScenarios(projectedGroups, games)
  const confirmedIds = new Set()

  projectedGroups.forEach((group) => {
    group.teams.forEach((team) => {
      const teamId = String(team.team_id)
      const isConfirmed = groupScenarios[group.name].every((rows) => {
        const scenarioRow = rows.find((row) => String(row.team_id) === teamId)
        const position = rows.indexOf(scenarioRow) + 1

        if (position <= 2) return true
        if (position !== 3) return false

        return isGuaranteedBestThirdPlace(
          scenarioRow,
          group.name,
          groupScenarios,
        )
      })

      if (isConfirmed) confirmedIds.add(teamId)
    })
  })

  return confirmedIds
}

function buildRound(name, teams) {
  return {
    name,
    matches: Array.from({ length: teams.length / 2 }, (_, index) => {
      const home = teams[index * 2]
      const away = teams[index * 2 + 1]
      const winner =
        home &&
        away &&
        numberValue(home.strengthRating) >= numberValue(away.strengthRating)
          ? home
          : away

      return {
        id: `${name}-${index}`,
        teams: [home, away],
        winner,
      }
    }),
  }
}

function getConfirmedDirectTeam(projectedGroups, confirmedQualifierIds, slot) {
  const group = projectedGroups.find((entry) => entry.name === slot.group)
  const team = group?.teams[slot.position - 1]

  if (!team || !confirmedQualifierIds.has(String(team.team_id))) return null

  return {
    ...team,
    qualification: slot.label,
    projectedPosition: slot.position,
  }
}

function getConfirmedThirdPlaceTeam() {
  return null
}

function makeFixtureTeam(game, side, teamMap) {
  const prefix = side === 'home' ? 'home' : 'away'
  const teamId = String(game[`${prefix}_team_id`] || '')
  const name = game[`${prefix}_team_name_en`]

  if (!teamId || isPlaceholderTeamName(name)) return null

  const team = teamMap[teamId] || {
    id: teamId,
    fifa_code: game[`${prefix}_team_code`],
    flag: game[`${prefix}_team_flag`],
    name_en: name,
  }
  const winnerId = getMatchWinnerId(game)

  return {
    team,
    team_id: teamId,
    qualification:
      winnerId === teamId
        ? `Advanced from ${getRoundName(game.type)}`
        : getRoundName(game.type),
    group: team.fifa_code || '',
    winner: winnerId === teamId,
  }
}

function getRoundName(type) {
  return LIVE_ROUND_ORDER.find((round) => round.type === type)?.name || type
}

function buildActualKnockoutRounds(games, projectedGroups) {
  const knockoutGames = games.filter((game) =>
    LIVE_ROUND_ORDER.some((round) => round.type === game.type),
  )

  if (!knockoutGames.length) return null

  const teamMap = Object.fromEntries(
    projectedGroups.flatMap((group) =>
      group.teams.map((entry) => [String(entry.team_id), entry.team]),
    ),
  )

  return LIVE_ROUND_ORDER.map((round) => {
    const roundGames = knockoutGames
      .filter((game) => game.type === round.type)
      .sort((left, right) => new Date(left.date) - new Date(right.date))

    return {
      name: round.name,
      matches: roundGames.map((game, index) => ({
        id: String(game.id || `${round.type}-${index}`),
        matchLabel: `Match ${index + 1}`,
        teams: [
          makeFixtureTeam(game, 'home', teamMap),
          makeFixtureTeam(game, 'away', teamMap),
        ],
        winnerTeamId: getMatchWinnerId(game),
      })),
    }
  })
}

function buildConfirmedRoundOf32(
  projectedGroups,
  confirmedQualifierIds,
  thirdPlaceQualifiers,
) {
  return {
    name: 'Round of 32',
    matches: ROUND_OF_32_SLOT_ORDER.map((match) => ({
      id: `Match ${match.matchNumber}`,
      matchNumber: match.matchNumber,
      teams: match.teams.map((slot) =>
        slot.thirdPlaceGroups
          ? getConfirmedThirdPlaceTeam(
              thirdPlaceQualifiers,
              confirmedQualifierIds,
              slot,
            )
          : getConfirmedDirectTeam(projectedGroups, confirmedQualifierIds, slot),
      ),
    })),
  }
}

function buildEmptyRounds() {
  return [
    {
      name: 'Round of 16',
      matches: Array.from({ length: 8 }, (_, index) => ({
        id: `Round of 16-${index}`,
        teams: [],
      })),
    },
    {
      name: 'Quarter-finals',
      matches: Array.from({ length: 4 }, (_, index) => ({
        id: `Quarter-finals-${index}`,
        teams: [],
      })),
    },
    {
      name: 'Semi-finals',
      matches: Array.from({ length: 2 }, (_, index) => ({
        id: `Semi-finals-${index}`,
        teams: [],
      })),
    },
    { name: 'Final', matches: [{ id: 'Final-0', teams: [] }] },
  ]
}

export function buildKnockoutProjection(groupTableRows, predictionRows, games = []) {
  const predictionMap = Object.fromEntries(
    predictionRows.map((row) => [String(row.team.id), row]),
  )

  const projectedGroups = groupTableRows.map((group) => ({
    ...group,
    teams: group.teams
      .map((entry) => ({
        ...entry,
        group: group.name,
        fifaRank:
          predictionMap[String(entry.team_id)]?.fifaRank ||
          entry.fifaRank ||
          999,
        strengthRating:
          predictionMap[String(entry.team_id)]?.strengthRating || 0,
      })),
  }))
  const confirmedQualifierIds = getConfirmedQualifierIds(projectedGroups, games)

  const directQualifiers = projectedGroups.flatMap((group) =>
    group.teams.slice(0, 2).map((entry, index) => ({
      ...entry,
      qualification: index === 0 ? 'Group winner' : 'Runner-up',
      projectedPosition: index + 1,
    })),
  )
  const thirdPlaceQualifiers = projectedGroups
    .map((group) => group.teams[2])
    .filter(Boolean)
    .sort(compareQualificationRows)
    .slice(0, 8)
    .map((entry) => ({
      ...entry,
      qualification: 'Best third-place',
      projectedPosition: 3,
    }))

  const seededTeams = [...directQualifiers, ...thirdPlaceQualifiers].sort(
    (left, right) =>
      left.projectedPosition - right.projectedPosition ||
      compareQualificationRows(left, right),
  )

  const projectedFirstRoundPairs = avoidGroupRematch(
    Array.from({ length: 16 }, (_, index) => [
      seededTeams[index],
      seededTeams[seededTeams.length - 1 - index],
    ]),
  )
  const confirmedRoundOf32 = buildConfirmedRoundOf32(
    projectedGroups,
    confirmedQualifierIds,
    thirdPlaceQualifiers,
  )
  const actualKnockoutRounds = buildActualKnockoutRounds(games, projectedGroups)
  const roundOf32Teams = projectedFirstRoundPairs.flat()
  const roundNames = [
    'Round of 32',
    'Round of 16',
    'Quarter-finals',
    'Semi-finals',
    'Final',
  ]
  const rounds = []
  let roundTeams = roundOf32Teams

  roundNames.forEach((name) => {
    const round = buildRound(name, roundTeams)
    rounds.push(round)
    roundTeams = round.matches.map((match) => match.winner)
  })

  return {
    champion: rounds.at(-1)?.matches[0]?.winner || null,
    confirmedQualifiers: seededTeams.filter((team) =>
      confirmedQualifierIds.has(String(team.team_id)),
    ),
    confirmedRounds: actualKnockoutRounds || [confirmedRoundOf32, ...buildEmptyRounds()],
    groupQualifiers: projectedGroups.map((group) => ({
      ...group,
      teams: group.teams.slice(0, 2),
    })),
    qualifiers: seededTeams,
    rounds,
    thirdPlaceTable: projectedGroups
      .map((group) => group.teams[2])
      .filter(Boolean)
      .sort(compareQualificationRows),
    thirdPlaceQualifiers,
  }
}
