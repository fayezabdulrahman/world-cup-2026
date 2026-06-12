const TEAM_ALIASES = {
  'bosnia and herzegovina': 'bosnia herzegovina',
  'korea republic': 'south korea',
  'united states of america': 'united states',
}

function normalizeTeamName(value) {
  const normalized = String(value || '')
    .toLowerCase()
    .replace(/\bczech republic\b/g, 'czechia')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

  return TEAM_ALIASES[normalized] || normalized
}

function formatDateKey(date) {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('')
}

export function getScoreboardDateRange(date) {
  const previousDay = new Date(date)
  previousDay.setUTCDate(previousDay.getUTCDate() - 1)
  const nextDay = new Date(date)
  nextDay.setUTCDate(nextDay.getUTCDate() + 1)

  return `${formatDateKey(previousDay)}-${formatDateKey(nextDay)}`
}

export function findMatchEvent(events, match) {
  const homeName = normalizeTeamName(match.home_team_name_en)
  const awayName = normalizeTeamName(match.away_team_name_en)

  return events?.find((candidate) => {
    const competitors = candidate.competitions?.[0]?.competitors || []
    const home = competitors.find((entry) => entry.homeAway === 'home')
    const away = competitors.find((entry) => entry.homeAway === 'away')

    return (
      normalizeTeamName(home?.team?.displayName) === homeName &&
      normalizeTeamName(away?.team?.displayName) === awayName
    )
  })
}
