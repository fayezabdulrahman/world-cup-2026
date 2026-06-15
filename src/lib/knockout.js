import { numberValue } from './worldCup'

function compareQualificationRows(left, right) {
  return (
    numberValue(right.pts) - numberValue(left.pts) ||
    numberValue(right.gd) - numberValue(left.gd) ||
    numberValue(right.gf) - numberValue(left.gf) ||
    numberValue(right.strengthRating) - numberValue(left.strengthRating) ||
    (left.team?.name_en || '').localeCompare(right.team?.name_en || '')
  )
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

function buildRound(name, teams) {
  return {
    name,
    matches: Array.from({ length: teams.length / 2 }, (_, index) => {
      const home = teams[index * 2]
      const away = teams[index * 2 + 1]
      const winner =
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

export function buildKnockoutProjection(groupTableRows, predictionRows) {
  const predictionMap = Object.fromEntries(
    predictionRows.map((row) => [String(row.team.id), row]),
  )

  const projectedGroups = groupTableRows.map((group) => ({
    ...group,
    teams: group.teams
      .map((entry) => ({
        ...entry,
        group: group.name,
        strengthRating:
          predictionMap[String(entry.team_id)]?.strengthRating || 0,
      }))
      .sort(compareQualificationRows),
  }))

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

  const firstRoundPairs = avoidGroupRematch(
    Array.from({ length: 16 }, (_, index) => [
      seededTeams[index],
      seededTeams[seededTeams.length - 1 - index],
    ]),
  )
  const roundOf32Teams = firstRoundPairs.flat()
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
    qualifiers: seededTeams,
    rounds,
    thirdPlaceQualifiers,
  }
}
