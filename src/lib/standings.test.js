import test from 'node:test'
import assert from 'node:assert/strict'
import { rankGroupRows } from './standings.js'

function row(id, pts, gd, gf, fifaRank) {
  return {
    team_id: id,
    pts,
    gd,
    gf,
    fifaRank,
    conductScore: 0,
    team: { name_en: id },
  }
}

function game(id, home, away, homeScore, awayScore) {
  return {
    id,
    home_team_id: home,
    away_team_id: away,
    home_score: homeScore,
    away_score: awayScore,
    finished: 'TRUE',
  }
}

test('head-to-head result ranks tied teams before overall goal difference', () => {
  const rows = [
    row('A', 6, 1, 3, 20),
    row('B', 6, 5, 7, 10),
    row('C', 0, -6, 0, 30),
  ]
  const games = [
    game('1', 'A', 'B', 1, 0),
    game('2', 'A', 'C', 2, 0),
    game('3', 'B', 'C', 7, 0),
  ]

  assert.deepEqual(
    rankGroupRows(rows, games).map((entry) => entry.team_id),
    ['A', 'B', 'C'],
  )
})

test('overall goal difference applies when head-to-head cannot separate teams', () => {
  const rows = [
    row('A', 4, 2, 4, 20),
    row('B', 4, 1, 3, 10),
  ]
  const games = [game('1', 'A', 'B', 1, 1)]

  assert.deepEqual(
    rankGroupRows(rows, games).map((entry) => entry.team_id),
    ['A', 'B'],
  )
})

test('FIFA ranking replaces drawing lots as the final separator', () => {
  const rows = [
    row('A', 4, 0, 2, 20),
    row('B', 4, 0, 2, 10),
  ]
  const games = [game('1', 'A', 'B', 1, 1)]

  assert.deepEqual(
    rankGroupRows(rows, games).map((entry) => entry.team_id),
    ['B', 'A'],
  )
})

test('team conduct score is applied before FIFA ranking', () => {
  const rows = [
    { ...row('A', 4, 0, 2, 20), conductScore: -1 },
    { ...row('B', 4, 0, 2, 10), conductScore: -3 },
  ]
  const games = [game('1', 'A', 'B', 1, 1)]

  assert.deepEqual(
    rankGroupRows(rows, games).map((entry) => entry.team_id),
    ['A', 'B'],
  )
})
