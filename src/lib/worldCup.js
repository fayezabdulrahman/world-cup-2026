export const WORLD_CUP_BASE = '/api/worldcup'

export const TEAM_FORMATIONS = {
  ALG: '4-3-3',
  ARG: '4-3-3',
  AUS: '4-2-3-1',
  AUT: '4-2-3-1',
  BEL: '4-3-3',
  BIH: '4-3-3',
  BRA: '4-2-3-1',
  CAN: '4-4-2',
  CIV: '4-3-3',
  COL: '4-2-3-1',
  COD: '4-2-3-1',
  CPV: '4-3-3',
  CRO: '4-3-3',
  CUW: '4-2-3-1',
  CZE: '3-4-3',
  ECU: '4-3-3',
  EGY: '4-3-3',
  ENG: '4-2-3-1',
  ESP: '4-3-3',
  FRA: '4-2-3-1',
  GER: '4-2-3-1',
  GHA: '4-2-3-1',
  HAI: '4-4-2',
  IRN: '4-1-4-1',
  IRQ: '4-2-3-1',
  JOR: '4-3-3',
  JPN: '4-2-3-1',
  KOR: '4-2-3-1',
  KSA: '4-3-3',
  MAR: '4-1-4-1',
  MEX: '4-3-3',
  NED: '4-3-3',
  NOR: '4-3-3',
  NZL: '4-4-2',
  PAN: '5-4-1',
  PAR: '4-4-2',
  POR: '4-3-3',
  QAT: '5-3-2',
  RSA: '4-2-3-1',
  SCO: '3-4-2-1',
  SEN: '4-3-3',
  SUI: '4-2-3-1',
  SWE: '4-4-2',
  TUN: '4-3-3',
  TUR: '4-2-3-1',
  URU: '4-3-3',
  USA: '4-3-3',
  UZB: '4-2-3-1',
}

export const NAV_ITEMS = [
  { id: 'overview', label: 'Overview' },
  { id: 'live', label: 'Live Match' },
  // { id: 'fixtures', label: 'Fixtures' },
  { id: 'predictions', label: 'AI Winner Guess' },
  { id: 'squads', label: 'Squads' },
  // { id: 'groups', label: 'Groups' },
]

export const POSITION_LABELS = {
  GK: 'Goalkeepers',
  DF: 'Defenders',
  MF: 'Midfielders',
  FW: 'Forwards',
}

const TOURNAMENT_START = new Date('2026-06-11T00:00:00Z')

const STADIUM_TIME_ZONES = {
  1: 'America/Mexico_City',
  2: 'America/Mexico_City',
  3: 'America/Monterrey',
  4: 'America/Chicago',
  5: 'America/Chicago',
  6: 'America/Chicago',
  7: 'America/New_York',
  8: 'America/New_York',
  9: 'America/New_York',
  10: 'America/New_York',
  11: 'America/New_York',
  12: 'America/Toronto',
  13: 'America/Vancouver',
  14: 'America/Los_Angeles',
  15: 'America/Los_Angeles',
  16: 'America/Los_Angeles',
}

export async function fetchJson(url, { retries = 0, timeoutMs = 30000 } = {}) {
  let lastError

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(url, { signal: controller.signal })

      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      lastError = error
      if (attempt < retries) {
        await new Promise((resolve) => window.setTimeout(resolve, 500))
      }
    } finally {
      window.clearTimeout(timeout)
    }
  }

  throw lastError
}

function getTimeZoneOffset(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  const timeInZone = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  )

  return timeInZone - date.getTime()
}

export function getStadiumTimeZone(stadiumId) {
  return STADIUM_TIME_ZONES[Number(stadiumId)] || 'UTC'
}

export function parseMatchDate(value, timeZone = 'UTC') {
  if (!value) return null

  const [datePart, timePart] = value.split(' ')
  if (!datePart || !timePart) return null

  const [month, day, year] = datePart.split('/').map(Number)
  const [hours, minutes] = timePart.split(':').map(Number)
  const utcGuess = Date.UTC(year, month - 1, day, hours, minutes)
  const firstGuess = new Date(utcGuess)
  const firstOffset = getTimeZoneOffset(firstGuess, timeZone)
  const matchDate = new Date(utcGuess - firstOffset)
  const correctedOffset = getTimeZoneOffset(matchDate, timeZone)

  return new Date(utcGuess - correctedOffset)
}

export function formatViewerTime(date) {
  if (!date) return 'TBD'

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export function getViewerTimeZoneLabel() {
  const formatter = new Intl.DateTimeFormat(undefined, {
    timeZoneName: 'short',
  })
  const zonePart = formatter
    .formatToParts(new Date())
    .find((part) => part.type === 'timeZoneName')

  return zonePart?.value || Intl.DateTimeFormat().resolvedOptions().timeZone || 'local time'
}

export function formatCountDown(date) {
  if (!date) return 'Awaiting confirmation'

  const now = new Date()
  const diff = date.getTime() - now.getTime()

  if (diff <= 0) return 'Match in play'

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24

  if (days === 0) return `${remainingHours}h to kickoff`

  return `${days}d ${remainingHours}h to kickoff`
}

export function isMatchInPlay(match) {
  if (!match) return false
  if (String(match.time_elapsed).toLowerCase() === 'live') return true
  if (String(match.finished).toLowerCase() === 'true' || !match.date) return false

  const timeSinceKickoff = Date.now() - match.date.getTime()
  return timeSinceKickoff >= 0 && timeSinceKickoff <= 4 * 60 * 60 * 1000
}

export function numberValue(value) {
  return Number.parseFloat(value ?? 0) || 0
}

export function normalizePosition(position) {
  const value = (position || '').toUpperCase()

  if (['GK', 'DF', 'MF', 'FW'].includes(value)) {
    return value
  }

  const lowered = (position || '').toLowerCase()
  if (lowered.includes('goal')) return 'GK'
  if (lowered.includes('def')) return 'DF'
  if (lowered.includes('mid')) return 'MF'
  if (lowered.includes('forward') || lowered.includes('striker')) return 'FW'

  return 'MF'
}

export function getTeamFormation(team) {
  if (!team) return '4-3-3'

  return TEAM_FORMATIONS[team.fifa_code] || '4-3-3'
}

function getFormationRows(formation) {
  const rows = formation
    .split('-')
    .map((part) => Number.parseInt(part, 10))
    .filter(Boolean)

  if (rows.reduce((sum, count) => sum + count, 0) !== 10) {
    return [4, 3, 3]
  }

  return rows
}

export function getPlayerDisplayName(player) {
  return player.shirtName || player.playerName
}

export function getPlayerFullName(player) {
  if (player.firstNames || player.lastNames) {
    return [player.firstNames, player.lastNames].filter(Boolean).join(' ')
  }

  return player.playerName
}

function buildLineFromPool(pool, count, preferredRoles) {
  const line = []

  preferredRoles.forEach((role) => {
    while (line.length < count && pool[role]?.length) {
      line.push(pool[role].shift())
    }
  })

  const fallbackOrder = ['MF', 'FW', 'DF', 'GK']
  fallbackOrder.forEach((role) => {
    while (line.length < count && pool[role]?.length) {
      line.push(pool[role].shift())
    }
  })

  return line
}

function sortPlayersForSelection(players) {
  const order = { GK: 0, DF: 1, MF: 2, FW: 3 }

  return [...players].sort((left, right) => {
    const roleGap =
      (order[normalizePosition(left.position)] ?? 99) -
      (order[normalizePosition(right.position)] ?? 99)

    if (roleGap !== 0) return roleGap

    return left.number - right.number
  })
}

export function buildSquadShape(players, formation) {
  const rows = getFormationRows(formation)
  const buckets = {
    GK: [],
    DF: [],
    MF: [],
    FW: [],
  }

  sortPlayersForSelection(players).forEach((player) => {
    buckets[normalizePosition(player.position)].push(player)
  })

  const goalkeeper = buildLineFromPool(buckets, 1, ['GK'])[0] || null
  const lines = rows.map((count, index) => {
    if (index === 0) return buildLineFromPool(buckets, count, ['DF', 'MF'])
    if (index === rows.length - 1) return buildLineFromPool(buckets, count, ['FW', 'MF'])
    return buildLineFromPool(buckets, count, ['MF', 'DF', 'FW'])
  })

  const starters = [goalkeeper, ...lines.flat()].filter(Boolean).slice(0, 11)
  const reserves = players.filter(
    (player) => !starters.some((starter) => starter.number === player.number),
  )

  return {
    rows,
    goalkeeper,
    lines,
    starters,
    reserves,
  }
}

export function getFormationRoleLabel(rowIndex, rowCount, totalRows) {
  if (rowIndex === 0) return rowCount >= 5 ? 'Back line' : 'Defence'
  if (rowIndex === totalRows - 1) return rowCount === 1 ? 'Striker' : 'Attack'
  if (totalRows === 4 && rowIndex === 2) return 'Support line'

  return 'Midfield'
}

export function getAgeOnTournamentStart(dateOfBirth) {
  const [day, month, year] = dateOfBirth.split('/').map(Number)
  const dob = new Date(Date.UTC(year, month - 1, day))
  let age = TOURNAMENT_START.getUTCFullYear() - dob.getUTCFullYear()
  const hasHadBirthday =
    TOURNAMENT_START.getUTCMonth() > dob.getUTCMonth() ||
    (TOURNAMENT_START.getUTCMonth() === dob.getUTCMonth() &&
      TOURNAMENT_START.getUTCDate() >= dob.getUTCDate())

  if (!hasHadBirthday) {
    age -= 1
  }

  return age
}
