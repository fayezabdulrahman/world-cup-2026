import { numberValue } from './worldCup.js'

function isFinished(game) {
  return String(game.finished).toLowerCase() === 'true'
}

function getTeamId(row) {
  return String(row.team_id)
}

function getFifaRank(row, profiles) {
  return (
    numberValue(row.fifaRank) ||
    numberValue(profiles[row.team?.fifa_code]?.fifaRank) ||
    999
  )
}

function buildMiniTable(rows, games) {
  const rowIds = new Set(rows.map(getTeamId))
  const stats = Object.fromEntries(
    rows.map((row) => [
      getTeamId(row),
      { gd: 0, gf: 0, pts: 0 },
    ]),
  )

  games
    .filter(
      (game) =>
        isFinished(game) &&
        rowIds.has(String(game.home_team_id)) &&
        rowIds.has(String(game.away_team_id)),
    )
    .forEach((game) => {
      const home = stats[String(game.home_team_id)]
      const away = stats[String(game.away_team_id)]
      const homeScore = numberValue(game.home_score)
      const awayScore = numberValue(game.away_score)

      home.gf += homeScore
      home.gd += homeScore - awayScore
      away.gf += awayScore
      away.gd += awayScore - homeScore

      if (homeScore > awayScore) {
        home.pts += 3
      } else if (awayScore > homeScore) {
        away.pts += 3
      } else {
        home.pts += 1
        away.pts += 1
      }
    })

  return stats
}

function groupByEqualCriteria(rows, getKey) {
  const groups = []

  rows.forEach((row) => {
    const key = getKey(row)
    const previous = groups.at(-1)

    if (previous?.key === key) {
      previous.rows.push(row)
    } else {
      groups.push({ key, rows: [row] })
    }
  })

  return groups.map((group) => group.rows)
}

function compareOverall(left, right, profiles) {
  return (
    numberValue(right.gd) - numberValue(left.gd) ||
    numberValue(right.gf) - numberValue(left.gf) ||
    numberValue(right.conductScore) - numberValue(left.conductScore) ||
    getFifaRank(left, profiles) - getFifaRank(right, profiles) ||
    (left.team?.name_en || '').localeCompare(right.team?.name_en || '')
  )
}

function resolveHeadToHead(rows, games, profiles) {
  if (rows.length < 2) return rows

  const miniTable = buildMiniTable(rows, games)
  const sorted = [...rows].sort((left, right) => {
    const leftStats = miniTable[getTeamId(left)]
    const rightStats = miniTable[getTeamId(right)]

    return (
      rightStats.pts - leftStats.pts ||
      rightStats.gd - leftStats.gd ||
      rightStats.gf - leftStats.gf
    )
  })
  const tiedSets = groupByEqualCriteria(sorted, (row) => {
    const stats = miniTable[getTeamId(row)]
    return `${stats.pts}:${stats.gd}:${stats.gf}`
  })

  if (tiedSets.length === 1) {
    return [...rows].sort((left, right) => compareOverall(left, right, profiles))
  }

  return tiedSets.flatMap((tiedRows) =>
    tiedRows.length > 1
      ? resolveHeadToHead(tiedRows, games, profiles)
      : tiedRows,
  )
}

export function rankGroupRows(rows, games, profiles = {}) {
  const byPoints = [...rows].sort(
    (left, right) => numberValue(right.pts) - numberValue(left.pts),
  )

  return groupByEqualCriteria(byPoints, (row) => String(numberValue(row.pts)))
    .flatMap((tiedRows) => resolveHeadToHead(tiedRows, games, profiles))
}

export function buildGroupStandings(
  groups,
  games,
  teamMap,
  profiles = {},
) {
  const finishedGroupGames = games.filter(
    (game) => game.type === 'group' && isFinished(game),
  )

  return groups
    .map((group) => {
      const teams = group.teams.map((entry) => {
        const team = teamMap[String(entry.team_id)]

        return {
          ...entry,
          mp: 0,
          w: 0,
          d: 0,
          l: 0,
          pts: 0,
          gf: 0,
          ga: 0,
          gd: 0,
          conductScore: numberValue(entry.conductScore),
          fifaRank: numberValue(profiles[team?.fifa_code]?.fifaRank) || 999,
          team,
        }
      })
      const rowMap = Object.fromEntries(
        teams.map((entry) => [String(entry.team_id), entry]),
      )
      const groupGames = finishedGroupGames.filter(
        (game) => game.group === group.name,
      )

      groupGames.forEach((game) => {
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

      teams.forEach((entry) => {
        entry.gd = entry.gf - entry.ga
      })

      return {
        ...group,
        teams: rankGroupRows(teams, groupGames, profiles),
      }
    })
    .sort((left, right) => left.name.localeCompare(right.name))
}
