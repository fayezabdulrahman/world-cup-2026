const ESPN_SCOREBOARD_URL =
  'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard'
const TOURNAMENT_RANGE = '20260611-20260719'
const CACHE_TTL_MS = 10_000

let cachedPayload = null
let cacheExpiresAt = 0
let pendingRequest = null

const VENUE_TIME_ZONES = {
  'Arlington, Texas': 'America/Chicago',
  'Atlanta, Georgia': 'America/New_York',
  'East Rutherford, New Jersey': 'America/New_York',
  'Foxborough, Massachusetts': 'America/New_York',
  Guadalajara: 'America/Mexico_City',
  Guadalupe: 'America/Monterrey',
  'Houston, Texas': 'America/Chicago',
  'Inglewood, California': 'America/Los_Angeles',
  'Kansas City, Missouri': 'America/Chicago',
  'Miami Gardens, Florida': 'America/New_York',
  'Mexico City': 'America/Mexico_City',
  'Philadelphia, Pennsylvania': 'America/New_York',
  'Santa Clara, California': 'America/Los_Angeles',
  'Seattle, Washington': 'America/Los_Angeles',
  Toronto: 'America/Toronto',
  Vancouver: 'America/Vancouver',
}

const VENUE_METADATA = {
  1421: { capacity: 69000, region: 'Philadelphia' },
  1672: { capacity: 80824, region: 'Mexico City' },
  3871: { capacity: 70649, region: 'Dallas' },
  4370: { capacity: 54000, region: 'Vancouver' },
  4485: { capacity: 69000, region: 'Seattle' },
  4643: { capacity: 65000, region: 'Miami' },
  4727: { capacity: 82500, region: 'New York/New Jersey' },
  5009: { capacity: 48821, region: 'Guadalajara' },
  5960: { capacity: 68500, region: 'San Francisco Bay Area' },
  6262: { capacity: 68311, region: 'Houston' },
  6351: { capacity: 53500, region: 'Monterrey' },
  7485: { capacity: 71000, region: 'Atlanta' },
  9115: { capacity: 70000, region: 'Los Angeles' },
  10143: { capacity: 43036, region: 'Toronto' },
  10660: { capacity: 64146, region: 'Boston' },
  10897: { capacity: 73000, region: 'Kansas City' },
}

function getCompetitor(event, homeAway) {
  return event.competitions?.[0]?.competitors?.find(
    (competitor) => competitor.homeAway === homeAway,
  )
}

function getGroupName(event) {
  if (event.season?.slug !== 'group-stage') return ''

  return event.competitions?.[0]?.altGameNote?.match(/Group ([A-L])/)?.[1] || ''
}

function formatVenueDate(value, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(value))
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))

  return `${values.month}/${values.day}/${values.year} ${values.hour}:${values.minute}`
}

function getMatchType(event) {
  return event.season?.slug === 'group-stage'
    ? 'group'
    : event.season?.slug || 'knockout'
}

function buildGames(events) {
  const groupMatchCounts = new Map()

  return [...events]
    .sort((left, right) => new Date(left.date) - new Date(right.date))
    .map((event) => {
      const competition = event.competitions?.[0] || {}
      const home = getCompetitor(event, 'home')
      const away = getCompetitor(event, 'away')
      const venue = competition.venue || {}
      const city = venue.address?.city || ''
      const group = getGroupName(event)
      const groupMatchIndex = groupMatchCounts.get(group) || 0

      if (group) groupMatchCounts.set(group, groupMatchIndex + 1)

      return {
        id: event.id,
        espn_event_id: event.id,
        date: event.date,
        local_date: formatVenueDate(
          event.date,
          VENUE_TIME_ZONES[city] || 'UTC',
        ),
        home_team_id: home?.team?.id || '',
        away_team_id: away?.team?.id || '',
        home_score: home?.score || '0',
        away_score: away?.score || '0',
        home_team_code: home?.team?.abbreviation || '',
        away_team_code: away?.team?.abbreviation || '',
        home_team_flag: home?.team?.logo || '',
        away_team_flag: away?.team?.logo || '',
        home_team_name_en: home?.team?.displayName || '',
        away_team_name_en: away?.team?.displayName || '',
        stadium_id: venue.id || '',
        stadium_name: venue.fullName || event.venue?.displayName || '',
        stadium_city: city,
        group,
        matchday: group ? String(Math.floor(groupMatchIndex / 2) + 1) : '',
        type: getMatchType(event),
        finished: event.status?.type?.completed ? 'TRUE' : 'FALSE',
        time_elapsed:
          event.status?.type?.state === 'in'
            ? 'live'
            : event.status?.type?.completed
              ? 'finished'
              : 'notstarted',
      }
    })
}

function buildTeams(events) {
  const teams = new Map()

  events
    .filter((event) => event.season?.slug === 'group-stage')
    .forEach((event) => {
      const group = getGroupName(event)

      event.competitions?.[0]?.competitors?.forEach((competitor) => {
        const team = competitor.team
        if (!team?.id || teams.has(team.id)) return

        teams.set(team.id, {
          id: team.id,
          _id: team.id,
          fifa_code: team.abbreviation,
          flag: team.logo,
          groups: group,
          name_en: team.displayName,
        })
      })
    })

  return [...teams.values()].sort((left, right) =>
    left.name_en.localeCompare(right.name_en),
  )
}

function buildStadiums(events) {
  const stadiums = new Map()

  events.forEach((event) => {
    const venue = event.competitions?.[0]?.venue
    if (!venue?.id || stadiums.has(venue.id)) return
    const metadata = VENUE_METADATA[venue.id] || {}

    stadiums.set(venue.id, {
      id: venue.id,
      _id: venue.id,
      fifa_name: venue.fullName,
      name_en: venue.fullName,
      city_en: venue.address?.city || '',
      country_en: venue.address?.country || '',
      capacity: metadata.capacity,
      region: metadata.region,
    })
  })

  return [...stadiums.values()]
}

function buildGroups(teams) {
  const groups = new Map()

  teams.forEach((team) => {
    if (!team.groups) return
    if (!groups.has(team.groups)) {
      groups.set(team.groups, {
        _id: team.groups,
        name: team.groups,
        teams: [],
      })
    }

    groups.get(team.groups).teams.push({
      _id: `${team.groups}-${team.id}`,
      team_id: team.id,
    })
  })

  return [...groups.values()].sort((left, right) =>
    left.name.localeCompare(right.name),
  )
}

async function fetchScoreboard() {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10_000)

  try {
    const query = new URLSearchParams({
      dates: TOURNAMENT_RANGE,
      limit: '200',
    })
    const response = await fetch(`${ESPN_SCOREBOARD_URL}?${query}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'world-cup-2026-dashboard/1.0',
      },
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`ESPN returned ${response.status}`)
    }

    return response.json()
  } finally {
    clearTimeout(timeout)
  }
}

async function refreshTournamentData() {
  const scoreboard = await fetchScoreboard()
  const events = scoreboard.events || []
  const teams = buildTeams(events)

  if (!events.length || teams.length !== 48) {
    throw new Error(
      `Incomplete ESPN tournament data (${events.length} events, ${teams.length} teams)`,
    )
  }

  return {
    games: buildGames(events),
    groups: buildGroups(teams),
    stadiums: buildStadiums(events),
    teams,
    updatedAt: new Date().toISOString(),
  }
}

export async function getMergedGames() {
  if (cachedPayload && Date.now() < cacheExpiresAt) {
    return cachedPayload
  }

  if (!pendingRequest) {
    pendingRequest = refreshTournamentData()
      .then((payload) => {
        cachedPayload = payload
        cacheExpiresAt = Date.now() + CACHE_TTL_MS
        return payload
      })
      .finally(() => {
        pendingRequest = null
      })
  }

  try {
    return await pendingRequest
  } catch (error) {
    if (cachedPayload) return cachedPayload
    throw error
  }
}
