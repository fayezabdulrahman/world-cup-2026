const ESPN_SCOREBOARD_URL =
  'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard'
const TOURNAMENT_SCOREBOARD_RANGES = [
  '20260611-20260712',
  '20260713-20260719',
]
const WORLD_CUP_GAMES_URL = 'https://worldcup26.ir/get/games'

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

function getCompetitor(event, homeAway) {
  return event.competitions?.[0]?.competitors?.find(
    (competitor) => competitor.homeAway === homeAway,
  )
}

function findEspnEvent(game, events) {
  const homeName = normalizeTeamName(game.home_team_name_en)
  const awayName = normalizeTeamName(game.away_team_name_en)

  return events.find((event) => {
    const home = getCompetitor(event, 'home')
    const away = getCompetitor(event, 'away')

    return (
      normalizeTeamName(home?.team?.displayName) === homeName &&
      normalizeTeamName(away?.team?.displayName) === awayName
    )
  })
}

function mergeGame(game, event) {
  if (!event) return game

  const home = getCompetitor(event, 'home')
  const away = getCompetitor(event, 'away')
  const status = event.status?.type

  return {
    ...game,
    home_score: home?.score ?? game.home_score,
    away_score: away?.score ?? game.away_score,
    finished: status?.completed ? 'TRUE' : 'FALSE',
    time_elapsed:
      status?.state === 'in'
        ? 'live'
        : status?.completed
          ? 'finished'
          : 'notstarted',
    espn_event_id: event.id,
  }
}

async function fetchJson(url, timeoutMs) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'world-cup-2026-dashboard/1.0',
      },
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`Upstream returned ${response.status}`)
    }

    return await response.json()
  } finally {
    clearTimeout(timeout)
  }
}

export async function getMergedGames() {
  const [gamesResult, ...scoreboardResults] = await Promise.allSettled([
    fetchJson(WORLD_CUP_GAMES_URL, 25000),
    ...TOURNAMENT_SCOREBOARD_RANGES.map((dates) =>
      fetchJson(`${ESPN_SCOREBOARD_URL}?dates=${dates}&limit=100`, 10000),
    ),
  ])

  if (gamesResult.status === 'rejected') {
    throw gamesResult.reason
  }

  const games = gamesResult.value.games || []
  const failedScoreboards = scoreboardResults.filter(
    (result) => result.status === 'rejected',
  )
  if (failedScoreboards.length === scoreboardResults.length) {
    console.error(
      'ESPN scoreboard reconciliation failed',
      failedScoreboards.map((result) => result.reason?.message),
    )
    return { ...gamesResult.value, games }
  }

  const events = scoreboardResults.flatMap((result) =>
    result.status === 'fulfilled' ? result.value.events || [] : [],
  )

  return {
    ...gamesResult.value,
    games: games.map((game) => mergeGame(game, findEspnEvent(game, events))),
  }
}
