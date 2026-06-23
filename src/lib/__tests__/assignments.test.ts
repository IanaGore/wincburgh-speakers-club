import { expect, it } from 'vitest'
import { groupAssignments } from '../assignments'

it('pairs numbered speeches and evaluators while preserving other roles', () => {
  const speech = { role_name: 'Speech 1' }
  const evaluator = { role_name: 'Evaluator 1' }
  const other = { role_name: 'Chair' }

  expect(groupAssignments([other, evaluator, speech])).toEqual({
    pairs: [{ speech, evaluator }],
    unpaired: [],
    others: [other],
  })
})
