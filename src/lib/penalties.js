function hasScoreValue(value) {
  return value !== undefined && value !== null && value !== ''
}

function toScoreValue(value) {
  return hasScoreValue(value) ? String(value) : ''
}

function getCompetitorScore(competitor, match, side) {
  return toScoreValue(
    competitor?.shootoutScore ??
      match?.[`${side}_penalty_score`] ??
      match?.[`${side}_shootout_score`],
  )
}

function findShootoutTeam(summary, match, side) {
  const teamId = String(match?.[`${side}_team_id`] || '')
  const teamName = String(match?.[`${side}_team_name_en`] || '').toLowerCase()

  return summary?.shootout?.find((entry) => {
    const entryId = String(entry.id || entry.teamId || '')
    const entryTeam = String(entry.team || entry.team?.displayName || '')
      .toLowerCase()

    return (teamId && entryId === teamId) || (teamName && entryTeam === teamName)
  })
}

export function getPenaltyResult({
  awayCompetitor,
  homeCompetitor,
  match,
  summary,
}) {
  const homeScore = getCompetitorScore(homeCompetitor, match, 'home')
  const awayScore = getCompetitorScore(awayCompetitor, match, 'away')
  const hasShootout =
    Boolean(summary?.shootout?.length) ||
    (hasScoreValue(homeScore) && hasScoreValue(awayScore))

  if (!hasShootout || !hasScoreValue(homeScore) || !hasScoreValue(awayScore)) {
    return null
  }

  const homeShots = findShootoutTeam(summary, match, 'home')?.shots || []
  const awayShots = findShootoutTeam(summary, match, 'away')?.shots || []

  return {
    awayScore,
    awayShots: [...awayShots].sort(
      (left, right) => Number(left.shotNumber) - Number(right.shotNumber),
    ),
    homeScore,
    homeShots: [...homeShots].sort(
      (left, right) => Number(left.shotNumber) - Number(right.shotNumber),
    ),
  }
}

export function formatPenaltyScore(match) {
  const homeScore = toScoreValue(
    match?.home_penalty_score ?? match?.home_shootout_score,
  )
  const awayScore = toScoreValue(
    match?.away_penalty_score ?? match?.away_shootout_score,
  )

  if (!hasScoreValue(homeScore) || !hasScoreValue(awayScore)) return ''

  return `${homeScore} – ${awayScore} Penalties`
}
