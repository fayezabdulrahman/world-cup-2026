import test from 'node:test'
import assert from 'node:assert/strict'
import { buildKnockoutProjection } from './knockout.js'

function team(id, name, code) {
  return {
    team_id: id,
    pts: 0,
    gd: 0,
    gf: 0,
    conductScore: 0,
    team: {
      id,
      fifa_code: code,
      flag: `${code}.png`,
      name_en: name,
    },
  }
}

function match(id, type, home, away, overrides = {}) {
  return {
    id,
    type,
    date: `2026-07-${String(id).padStart(2, '0')}T19:00:00Z`,
    finished: 'FALSE',
    home_team_id: home.id,
    home_team_code: home.code,
    home_team_flag: `${home.code}.png`,
    home_team_name_en: home.name,
    home_score: '0',
    away_team_id: away.id,
    away_team_code: away.code,
    away_team_flag: `${away.code}.png`,
    away_team_name_en: away.name,
    away_score: '0',
    ...overrides,
  }
}

test('live knockout rounds use actual fixtures and official winners', () => {
  const featuredTeams = [
    team('448', 'England', 'ENG'),
    team('164', 'Spain', 'ESP'),
    team('481', 'Paraguay', 'PAR'),
    team('2850', 'Congo DR', 'COD'),
  ]
  const groupTableRows = 'ABCDEFGHIJKL'.split('').map((name, groupIndex) => ({
    name,
    teams:
      groupIndex === 0
        ? featuredTeams
        : Array.from({ length: 4 }, (_, teamIndex) => {
            const id = `${groupIndex + 1}${teamIndex + 1}`
            return team(id, `Team ${name}${teamIndex + 1}`, `T${id}`)
          }),
  }))
  const predictionRows = groupTableRows.flatMap((group) => group.teams).map((entry) => ({
    team: entry.team,
    fifaRank: 1,
    strengthRating: 1,
  }))
  const games = [
    match(
      1,
      'round-of-32',
      { id: '448', name: 'England', code: 'ENG' },
      { id: '2850', name: 'Congo DR', code: 'COD' },
      {
        finished: 'TRUE',
        home_score: '2',
        away_score: '1',
        home_winner: true,
        winner_team_id: '448',
      },
    ),
    match(
      2,
      'round-of-32',
      { id: '210', name: 'Germany', code: 'GER' },
      { id: '481', name: 'Paraguay', code: 'PAR' },
      {
        finished: 'TRUE',
        home_score: '1',
        away_score: '1',
        away_winner: true,
        winner_team_id: '481',
      },
    ),
    match(
      3,
      'round-of-16',
      { id: '448', name: 'England', code: 'ENG' },
      { id: '164', name: 'Spain', code: 'ESP' },
    ),
    match(
      4,
      'round-of-16',
      { id: '481', name: 'Paraguay', code: 'PAR' },
      { id: '', name: 'Round of 32 4 Winner', code: '' },
    ),
  ]

  const projection = buildKnockoutProjection(groupTableRows, predictionRows, games)
  const roundOf16 = projection.confirmedRounds.find(
    (round) => round.name === 'Round of 16',
  )

  assert.deepEqual(
    roundOf16.matches.flatMap((fixture) =>
      fixture.teams.map((entry) => entry?.team?.name_en || 'TBD'),
    ),
    ['England', 'Spain', 'Paraguay', 'TBD'],
  )
  assert.equal(
    projection.confirmedRounds[0].matches[1].teams[1].qualification,
    'Advanced from Round of 32',
  )
})
