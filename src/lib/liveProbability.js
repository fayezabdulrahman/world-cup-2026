function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function poissonProbability(goals, expectedGoals) {
  let factorial = 1

  for (let index = 2; index <= goals; index += 1) {
    factorial *= index
  }

  return Math.exp(-expectedGoals) * expectedGoals ** goals / factorial
}

function getStatValue(stats, name, side) {
  const stat = stats.find((entry) => entry.name === name)
  return Number(stat?.[side] ?? 0) || 0
}

export function getMatchMinute(status) {
  if (!status) return null

  const clockSeconds = Number(status.clock)
  const baseMinute = Number.isFinite(clockSeconds)
    ? Math.floor(clockSeconds / 60)
    : 0
  const addedTime = Number(status.displayClock?.match(/\+(\d+)/)?.[1] || 0)

  return clamp(baseMinute + addedTime, 0, 120)
}

export function getReadableMatchStatus(match, status) {
  const statusLabels = {
    STATUS_FIRST_HALF: '1st half',
    STATUS_HALFTIME: 'Half-time',
    STATUS_SECOND_HALF: '2nd half',
    STATUS_END_OF_REGULATION: 'Full-time',
    STATUS_FINAL: 'Full-time',
    STATUS_FULL_TIME: 'Full-time',
    STATUS_EXTRA_TIME: 'Extra time',
    STATUS_PENALTIES: 'Penalties',
    STATUS_POSTPONED: 'Postponed',
    STATUS_CANCELED: 'Cancelled',
  }
  const statusName = status?.type?.name

  if (statusLabels[statusName]) return statusLabels[statusName]
  if (status?.type?.description) return status.type.description
  if (String(match?.finished).toLowerCase() === 'true') return 'Full-time'
  if (match?.time_elapsed === 'live') return 'Live'
  return null
}

export function calculateLiveWinProbability({
  awayProfile,
  homeProfile,
  match,
  minute,
  stats,
}) {
  const homeRank = homeProfile?.fifaRank || 50
  const awayRank = awayProfile?.fifaRank || 50
  const homeForm = homeProfile?.qualifierForm || 60
  const awayForm = awayProfile?.qualifierForm || 60
  const homeScore = Number(match?.home_score ?? 0) || 0
  const awayScore = Number(match?.away_score ?? 0) || 0
  const elapsed = clamp(minute ?? 0, 0, 90)
  const remainingShare = (90 - elapsed) / 90

  const rankDifference = clamp((awayRank - homeRank) / 50, -0.7, 0.7)
  const formDifference = clamp((homeForm - awayForm) / 100, -0.35, 0.35)
  const strengthEdge = rankDifference * 0.55 + formDifference * 0.45

  let homeExpectedGoals = clamp(1.45 + strengthEdge + 0.18, 0.55, 2.8)
  let awayExpectedGoals = clamp(1.15 - strengthEdge, 0.45, 2.5)

  const homeShots = getStatValue(stats, 'totalShots', 'home')
  const awayShots = getStatValue(stats, 'totalShots', 'away')
  const homeOnTarget = getStatValue(stats, 'shotsOnTarget', 'home')
  const awayOnTarget = getStatValue(stats, 'shotsOnTarget', 'away')
  const liveSample = homeShots + awayShots + homeOnTarget + awayOnTarget

  if (liveSample > 0 && elapsed > 5) {
    const homeThreat = homeShots + homeOnTarget * 1.7 + 1
    const awayThreat = awayShots + awayOnTarget * 1.7 + 1
    const threatShare = homeThreat / (homeThreat + awayThreat)
    const liveAdjustment = clamp((threatShare - 0.5) * 0.5, -0.18, 0.18)
    homeExpectedGoals *= 1 + liveAdjustment
    awayExpectedGoals *= 1 - liveAdjustment
  }

  const homeRemainingGoals = homeExpectedGoals * remainingShare
  const awayRemainingGoals = awayExpectedGoals * remainingShare
  let homeWin = 0
  let draw = 0
  let awayWin = 0

  for (let homeGoals = 0; homeGoals <= 8; homeGoals += 1) {
    for (let awayGoals = 0; awayGoals <= 8; awayGoals += 1) {
      const probability =
        poissonProbability(homeGoals, homeRemainingGoals) *
        poissonProbability(awayGoals, awayRemainingGoals)
      const finalHomeScore = homeScore + homeGoals
      const finalAwayScore = awayScore + awayGoals

      if (finalHomeScore > finalAwayScore) homeWin += probability
      else if (finalHomeScore === finalAwayScore) draw += probability
      else awayWin += probability
    }
  }

  const total = homeWin + draw + awayWin
  const rounded = {
    home: Math.round(homeWin / total * 100),
    draw: Math.round(draw / total * 100),
    away: Math.round(awayWin / total * 100),
  }
  const roundingDifference = 100 - rounded.home - rounded.draw - rounded.away
  rounded.home += roundingDifference

  return rounded
}
