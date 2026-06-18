const RIVALRIES = new Set([
  'ARG-BRA',
  'ARG-ENG',
  'ARG-URU',
  'BRA-URU',
  'CAN-USA',
  'ENG-SCO',
  'ESP-POR',
  'GER-NED',
  'IRN-USA',
  'JPN-KOR',
  'MEX-USA',
])

const KNOCKOUT_WEIGHTS = {
  final: 48,
  'third-place': 38,
  semifinal: 43,
  'semi-final': 43,
  quarterfinal: 39,
  'quarter-final': 39,
  'round-of-16': 34,
  'round-of-32': 30,
  knockout: 28,
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function normalizeType(type = '') {
  return type.toLowerCase().replaceAll('_', '-').replaceAll(' ', '-')
}

function getTeam(match, side, teamMap) {
  return teamMap[String(match[`${side}_team_id`])] || {
    fifa_code: match[`${side}_team_code`],
    name_en: match[`${side}_team_name_en`],
    flag: match[`${side}_team_flag`],
  }
}

function getRank(team, profiles) {
  return profiles[team?.fifa_code]?.fifaRank || 80
}

function getBigTeamSignal(home, away, profiles) {
  const ranks = [getRank(home, profiles), getRank(away, profiles)]
  const topTenCount = ranks.filter((rank) => rank <= 10).length
  const topTwentyCount = ranks.filter((rank) => rank <= 20).length
  const bestRank = Math.min(...ranks)

  let score = 0
  if (topTenCount === 2) score = 24
  else if (topTenCount === 1 && topTwentyCount === 2) score = 20
  else if (topTenCount === 1) score = 15
  else if (topTwentyCount === 2) score = 13
  else if (topTwentyCount === 1) score = 8

  const label =
    topTenCount === 2
      ? 'Two global heavyweights'
      : bestRank <= 10
        ? `${ranks[0] === bestRank ? home.name_en : away.name_en} are a top-10 side`
        : topTwentyCount === 2
          ? 'Two top-20 teams'
          : ''

  return { label, score }
}

function getRivalrySignal(home, away) {
  const key = [home?.fifa_code, away?.fifa_code].filter(Boolean).sort().join('-')
  return RIVALRIES.has(key)
    ? { label: 'Historic rivalry', score: 20 }
    : { label: '', score: 0 }
}

function getKnockoutSignal(match) {
  const type = normalizeType(match.type)
  if (type === 'group') return { label: '', score: 0 }

  const score =
    KNOCKOUT_WEIGHTS[type] ||
    Object.entries(KNOCKOUT_WEIGHTS).find(([key]) => type.includes(key))?.[1] ||
    28
  const label = type.includes('final')
    ? type.includes('semi')
      ? 'World Cup semi-final'
      : type.includes('quarter')
        ? 'World Cup quarter-final'
        : type === 'final'
          ? 'The World Cup final'
          : 'Win-or-go-home football'
    : 'Win-or-go-home football'

  return { label, score }
}

function getQualificationSignal(match, groupTableRows) {
  if (normalizeType(match.type) !== 'group') {
    return { detail: '', label: '', score: 0 }
  }

  const group = groupTableRows.find((entry) => entry.name === match.group)
  const matchday = Number(match.matchday) || 1
  let score = matchday === 3 ? 30 : matchday === 2 ? 18 : 7
  let label =
    matchday === 3
      ? 'Qualification-deciding matchday'
      : matchday === 2
        ? 'Major qualification impact'
        : 'Early group leverage'
  let detail = `Points here shape Group ${match.group}.`

  if (group?.teams?.length) {
    const homeRow = group.teams.find(
      (team) => String(team.team_id) === String(match.home_team_id),
    )
    const awayRow = group.teams.find(
      (team) => String(team.team_id) === String(match.away_team_id),
    )
    const homePosition = group.teams.indexOf(homeRow) + 1
    const awayPosition = group.teams.indexOf(awayRow) + 1
    const pointsGap = Math.abs(Number(homeRow?.pts || 0) - Number(awayRow?.pts || 0))

    if (matchday >= 2 && homeRow && awayRow) {
      if (pointsGap <= 1) score += 7
      if (homePosition <= 3 && awayPosition <= 3) {
        score += 6
        label = 'Direct qualification battle'
      }
      detail = `${homeRow?.team?.name_en || 'The home side'} sit ${homePosition || '—'}${ordinalSuffix(homePosition)} and ${awayRow?.team?.name_en || 'the away side'} sit ${awayPosition || '—'}${ordinalSuffix(awayPosition)} in Group ${match.group}.`
    }
  }

  return { detail, label, score }
}

function ordinalSuffix(position) {
  if (!position) return ''
  if (position === 1) return 'st'
  if (position === 2) return 'nd'
  if (position === 3) return 'rd'
  return 'th'
}

function getQualitySignal(home, away, profiles) {
  const rankGap = Math.abs(getRank(home, profiles) - getRank(away, profiles))
  if (rankGap <= 5) return { label: 'Evenly matched', score: 8 }
  if (rankGap <= 12) return { label: '', score: 4 }
  return { label: '', score: 0 }
}

export function isSameViewerDay(date, referenceDate = new Date()) {
  return (
    date?.getFullYear() === referenceDate.getFullYear() &&
    date?.getMonth() === referenceDate.getMonth() &&
    date?.getDate() === referenceDate.getDate()
  )
}

export function rankMatchesToWatch({
  games,
  groupTableRows,
  profiles,
  referenceDate = new Date(),
  teamMap,
}) {
  return games
    .filter(
      (match) =>
        String(match.finished).toLowerCase() !== 'true' &&
        isSameViewerDay(match.date, referenceDate),
    )
    .map((match) => {
      const home = getTeam(match, 'home', teamMap)
      const away = getTeam(match, 'away', teamMap)
      const signals = [
        getKnockoutSignal(match),
        getQualificationSignal(match, groupTableRows),
        getBigTeamSignal(home, away, profiles),
        getRivalrySignal(home, away),
        getQualitySignal(home, away, profiles),
      ]
      const reasons = signals.map((signal) => signal.label).filter(Boolean)
      const qualification = signals[1]
      const rawScore = signals.reduce((sum, signal) => sum + signal.score, 0)

      return {
        ...match,
        home,
        away,
        watchScore: clamp(Math.round(28 + rawScore * 0.72), 35, 99),
        reasons: reasons.slice(0, 3),
        stakesDetail: qualification.detail,
      }
    })
    .sort(
      (left, right) =>
        right.watchScore - left.watchScore || left.date - right.date,
    )
}
