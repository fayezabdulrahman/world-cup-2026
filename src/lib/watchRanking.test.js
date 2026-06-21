import test from 'node:test'
import assert from 'node:assert/strict'
import { getQualificationSignal } from './watchRanking.js'

test('match context describes pre-match positions and explains a points tie', () => {
  const groupTableRows = [
    {
      name: 'G',
      teams: [
        { team_id: '1', pts: 1, team: { name_en: 'New Zealand' } },
        { team_id: '2', pts: 1, team: { name_en: 'Iran' } },
        { team_id: '3', pts: 1, team: { name_en: 'Belgium' } },
        { team_id: '4', pts: 1, team: { name_en: 'Egypt' } },
      ],
    },
  ]
  const match = {
    type: 'group',
    group: 'G',
    matchday: '2',
    home_team_id: '3',
    away_team_id: '2',
  }

  const signal = getQualificationSignal(match, groupTableRows)

  assert.equal(
    signal.detail,
    "Belgium entered the match 3rd and Iran entered it 2nd in Group G. They were level on points, with FIFA's head-to-head tiebreak rules deciding the order.",
  )
})
