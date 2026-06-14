const TEAM_ALIASES = {
  'bosnia and herzegovina': 'bosnia herzegovina',
  'korea republic': 'south korea',
  turkiye: 'turkey',
  'united states of america': 'united states',
}

function normalizeTeamName(value) {
  const normalized = String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
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
  const homeCode = String(match.home_team_code || '').toUpperCase()
  const awayCode = String(match.away_team_code || '').toUpperCase()

  return events?.find((candidate) => {
    const competitors = candidate.competitions?.[0]?.competitors || []
    const home = competitors.find((entry) => entry.homeAway === 'home')
    const away = competitors.find((entry) => entry.homeAway === 'away')
    const codesMatch =
      homeCode &&
      awayCode &&
      home?.team?.abbreviation === homeCode &&
      away?.team?.abbreviation === awayCode

    return (
      codesMatch ||
      (normalizeTeamName(home?.team?.displayName) === homeName &&
        normalizeTeamName(away?.team?.displayName) === awayName)
    )
  })
}
