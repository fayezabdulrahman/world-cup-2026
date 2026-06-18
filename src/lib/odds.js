const TEAM_ALIASES = {
  czechia: 'czech republic',
  'korea republic': 'south korea',
  'republic of korea': 'south korea',
  usa: 'united states',
  'united states of america': 'united states',
  iran: 'ir iran',
}
const oddsDayRequests = new Map()
const FRACTIONAL_DENOMINATORS = Array.from({ length: 20 }, (_, index) => index + 1)

function normalizeTeamName(value = '') {
  const normalized = value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

  return TEAM_ALIASES[normalized] || normalized
}

function namesMatch(left, right) {
  const normalizedLeft = normalizeTeamName(left)
  const normalizedRight = normalizeTeamName(right)

  return (
    normalizedLeft === normalizedRight ||
    normalizedLeft.includes(normalizedRight) ||
    normalizedRight.includes(normalizedLeft)
  )
}

export function getOddsDayUrl(date) {
  if (!date) return ''

  const start = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  )
  const end = new Date(start)
  end.setDate(end.getDate() + 1)

  const query = new URLSearchParams({
    from: start.toISOString(),
    to: end.toISOString(),
  })

  return `/api/odds/day?${query}`
}

export async function fetchOddsDay(date) {
  const url = getOddsDayUrl(date)
  if (!url) return { configured: false, events: [] }

  if (!oddsDayRequests.has(url)) {
    oddsDayRequests.set(
      url,
      fetch(url).then((response) => {
        if (!response.ok) throw new Error('Matchday odds request failed')
        return response.json()
      }),
    )
  }

  try {
    return await oddsDayRequests.get(url)
  } catch (error) {
    oddsDayRequests.delete(url)
    throw error
  }
}

export function formatFractionalOdds(value) {
  const decimalPrice = Number(value)
  if (!Number.isFinite(decimalPrice) || decimalPrice <= 1) return '–'

  const fractionalPrice = decimalPrice - 1
  if (Math.abs(fractionalPrice - 1) < 0.005) return 'Evens'

  let closest = { denominator: 1, difference: Number.POSITIVE_INFINITY, numerator: 1 }

  FRACTIONAL_DENOMINATORS.forEach((denominator) => {
    const numerator = Math.max(1, Math.round(fractionalPrice * denominator))
    const difference =
      Math.abs(numerator / denominator - fractionalPrice) +
      denominator * 0.0005

    if (difference < closest.difference) {
      closest = { denominator, difference, numerator }
    }
  })

  const divisor = greatestCommonDivisor(
    closest.numerator,
    closest.denominator,
  )

  return `${closest.numerator / divisor}/${closest.denominator / divisor}`
}

function greatestCommonDivisor(left, right) {
  let a = Math.abs(left)
  let b = Math.abs(right)

  while (b) {
    const remainder = a % b
    a = b
    b = remainder
  }

  return a || 1
}

export function findFixtureOdds(events, fixture) {
  return (events || []).find(
    (event) =>
      namesMatch(event.homeTeam, fixture?.home_team_name_en) &&
      namesMatch(event.awayTeam, fixture?.away_team_name_en),
  )?.odds || null
}
