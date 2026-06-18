const ODDS_API_BASE = 'https://api.the-odds-api.com/v4'
const WORLD_CUP_SPORT_KEY = 'soccer_fifa_world_cup'
const PREFERRED_BOOKMAKERS = [
  'paddypower',
  'boylesports',
  'betfair_sb_uk',
]

function formatProviderDate(value) {
  return new Date(value).toISOString().replace(/\.\d{3}Z$/, 'Z')
}

const TEAM_ALIASES = {
  czechia: 'czech republic',
  'korea republic': 'south korea',
  'republic of korea': 'south korea',
  usa: 'united states',
  'united states of america': 'united states',
  iran: 'ir iran',
}

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

function findMatchingEvent(events, { away, commenceTime, home }) {
  const kickoff = Date.parse(commenceTime)

  return (events || [])
    .filter(
      (event) =>
        namesMatch(event.home_team, home) &&
        namesMatch(event.away_team, away),
    )
    .sort((left, right) => {
      if (!Number.isFinite(kickoff)) return 0
      return (
        Math.abs(Date.parse(left.commence_time) - kickoff) -
        Math.abs(Date.parse(right.commence_time) - kickoff)
      )
    })[0]
}

function normalizeEventOdds(event) {
  if (!event) return null

  const availableBookmakers = PREFERRED_BOOKMAKERS.map((key) =>
    event.bookmakers?.find((bookmaker) => bookmaker.key === key),
  ).filter(Boolean)
  const bookmaker = availableBookmakers[0]
  const market = bookmaker?.markets?.find((entry) => entry.key === 'h2h')

  if (!bookmaker || !market?.outcomes?.length) return null

  const getPrice = (name) =>
    market.outcomes.find((outcome) => namesMatch(outcome.name, name))?.price

  return {
    eventId: event.id,
    bookmaker: bookmaker.title,
    bookmakerKey: bookmaker.key,
    lastUpdate: market.last_update || bookmaker.last_update || null,
    outcomes: {
      home: getPrice(event.home_team) ?? null,
      draw:
        market.outcomes.find(
          (outcome) => normalizeTeamName(outcome.name) === 'draw',
        )?.price ?? null,
      away: getPrice(event.away_team) ?? null,
    },
  }
}

export async function getOddsForWindow({ from, to }) {
  const apiKey = globalThis.process?.env?.ODDS_API_KEY
  if (!apiKey) {
    return {
      configured: false,
      events: [],
    }
  }

  const query = new URLSearchParams({
    apiKey,
    bookmakers: PREFERRED_BOOKMAKERS.join(','),
    commenceTimeFrom: formatProviderDate(from),
    commenceTimeTo: formatProviderDate(to),
    dateFormat: 'iso',
    markets: 'h2h',
    oddsFormat: 'decimal',
  })
  const response = await fetch(
    `${ODDS_API_BASE}/sports/${WORLD_CUP_SPORT_KEY}/odds?${query}`,
    {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    },
  )

  if (!response.ok) {
    const providerError = await response.text()
    const error = new Error(
      `Odds provider request failed: ${response.status} ${providerError}`,
    )
    error.statusCode = response.status
    throw error
  }

  const events = await response.json()

  return {
    configured: true,
    events: events
      .map((event) => ({
        awayTeam: event.away_team,
        commenceTime: event.commence_time,
        homeTeam: event.home_team,
        odds: normalizeEventOdds(event),
      }))
      .filter((event) => event.odds),
  }
}

export async function getMatchOdds({
  away,
  commenceTime,
  home,
}) {
  const apiKey = globalThis.process?.env?.ODDS_API_KEY
  if (!apiKey) {
    return {
      configured: false,
      odds: null,
    }
  }

  const query = new URLSearchParams({
    apiKey,
    bookmakers: PREFERRED_BOOKMAKERS.join(','),
    dateFormat: 'iso',
    markets: 'h2h',
    oddsFormat: 'decimal',
  })

  if (commenceTime) {
    const kickoff = new Date(commenceTime)
    const windowStart = new Date(kickoff.getTime() - 12 * 60 * 60 * 1000)
    const windowEnd = new Date(kickoff.getTime() + 12 * 60 * 60 * 1000)
    query.set('commenceTimeFrom', formatProviderDate(windowStart))
    query.set('commenceTimeTo', formatProviderDate(windowEnd))
  }

  const response = await fetch(
    `${ODDS_API_BASE}/sports/${WORLD_CUP_SPORT_KEY}/odds?${query}`,
    {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    },
  )

  if (!response.ok) {
    const providerError = await response.text()
    const error = new Error(
      `Odds provider request failed: ${response.status} ${providerError}`,
    )
    error.statusCode = response.status
    throw error
  }

  const events = await response.json()
  const event = findMatchingEvent(events, { away, commenceTime, home })

  return {
    configured: true,
    odds: normalizeEventOdds(event),
  }
}
