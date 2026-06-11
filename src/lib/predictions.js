import { numberValue } from './worldCup'

const MAX_REFERENCE_RANK = 80
const BASE_FIELD_RATING = 1500

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function getNeutralProfile(team) {
  const code = team?.fifa_code || ''

  return {
    fifaRank: MAX_REFERENCE_RANK,
    qualifierForm: code ? 60 : 50,
  }
}

function buildStatsMap(groupTableRows) {
  return Object.fromEntries(
    groupTableRows.flatMap((group) =>
      group.teams.map((entry) => [String(entry.team_id), entry]),
    ),
  )
}

function getRankScore(fifaRank) {
  return clamp((MAX_REFERENCE_RANK - fifaRank + 1) / MAX_REFERENCE_RANK, 0.02, 1)
}

function getQualifierScore(qualifierForm) {
  return clamp(qualifierForm / 100, 0.2, 1)
}

function getLiveFormScore(stats) {
  const matchesPlayed = numberValue(stats?.mp)

  if (matchesPlayed === 0) {
    return {
      matchesPlayed: 0,
      liveFormScore: 0.5,
    }
  }

  const pointsPerMatch = numberValue(stats.pts) / Math.max(matchesPlayed, 1)
  const goalDiffPerMatch = numberValue(stats.gd) / Math.max(matchesPlayed, 1)
  const goalsForPerMatch = numberValue(stats.gf) / Math.max(matchesPlayed, 1)
  const cleanSheetRate =
    (numberValue(stats.ga) === 0 ? matchesPlayed : Math.max(0, matchesPlayed - 1)) /
    Math.max(matchesPlayed, 1)

  const liveFormScore = clamp(
    pointsPerMatch / 3 * 0.52 +
      ((goalDiffPerMatch + 2) / 4) * 0.24 +
      Math.min(goalsForPerMatch / 3, 1) * 0.14 +
      cleanSheetRate * 0.1,
    0,
    1,
  )

  return {
    matchesPlayed,
    liveFormScore,
  }
}

function getStrengthRating({ fifaRank, qualifierForm, liveFormScore, matchesPlayed }) {
  const rankScore = getRankScore(fifaRank)
  const qualifierScore = getQualifierScore(qualifierForm)
  const liveWeight = matchesPlayed > 0 ? 0.16 : 0
  const rankWeight = matchesPlayed > 0 ? 0.56 : 0.68
  const qualifierWeight = matchesPlayed > 0 ? 0.28 : 0.32

  const blendedScore =
    rankScore * rankWeight +
    qualifierScore * qualifierWeight +
    liveFormScore * liveWeight

  return {
    rankScore,
    qualifierScore,
    blendedScore,
    rating:
      BASE_FIELD_RATING +
      rankScore * 210 +
      qualifierScore * 155 +
      liveFormScore * (matchesPlayed > 0 ? 95 : 0),
  }
}

export function buildPredictionRows(teams, groupTableRows, predictionProfiles) {
  const statsMap = buildStatsMap(groupTableRows)

  const rows = teams.map((team) => {
    const profile = predictionProfiles[team.fifa_code] || getNeutralProfile(team)
    const stats = statsMap[String(team.id)] || null
    const { matchesPlayed, liveFormScore } = getLiveFormScore(stats)
    const strength = getStrengthRating({
      fifaRank: profile.fifaRank,
      qualifierForm: profile.qualifierForm,
      liveFormScore,
      matchesPlayed,
    })

    return {
      team,
      fifaRank: profile.fifaRank,
      qualifierForm: profile.qualifierForm,
      matchesPlayed,
      liveFormScore,
      strengthRating: strength.rating,
      blendedScore: strength.blendedScore,
    }
  })

  const probabilityPool = rows.reduce(
    (sum, row) => sum + Math.exp((row.strengthRating - BASE_FIELD_RATING) / 70),
    0,
  )

  return rows
    .map((row) => ({
      ...row,
      titleProbability:
        Math.exp((row.strengthRating - BASE_FIELD_RATING) / 70) / probabilityPool,
    }))
    .sort((left, right) => right.titleProbability - left.titleProbability)
}
