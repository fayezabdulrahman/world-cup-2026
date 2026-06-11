import { numberValue } from './worldCup.js'

function sortRows(left, right) {
  return (
    right.pts - left.pts ||
    right.gd - left.gd ||
    right.gf - left.gf ||
    (left.team?.name_en || '').localeCompare(right.team?.name_en || '')
  )
}

export function buildGroupStandings(groups, games, teamMap) {
  const finishedGroupGames = games.filter(
    (game) =>
      game.type === 'group' &&
      String(game.finished).toLowerCase() === 'true',
  )

  return groups
    .map((group) => {
      const teams = group.teams.map((entry) => ({
        ...entry,
        mp: 0,
        w: 0,
        d: 0,
        l: 0,
        pts: 0,
        gf: 0,
        ga: 0,
        gd: 0,
        team: teamMap[String(entry.team_id)],
      }))
      const rowMap = Object.fromEntries(
        teams.map((entry) => [String(entry.team_id), entry]),
      )

      finishedGroupGames
        .filter((game) => game.group === group.name)
        .forEach((game) => {
          const home = rowMap[String(game.home_team_id)]
          const away = rowMap[String(game.away_team_id)]
          if (!home || !away) return

          const homeScore = numberValue(game.home_score)
          const awayScore = numberValue(game.away_score)

          home.mp += 1
          away.mp += 1
          home.gf += homeScore
          home.ga += awayScore
          away.gf += awayScore
          away.ga += homeScore

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
        teams: teams.sort(sortRows),
      }
    })
    .sort((left, right) => left.name.localeCompare(right.name))
}
