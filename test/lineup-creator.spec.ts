import * as expect from 'expect'

import LineupCreator from '../lineup-creator'
import Networks from '../networks'
import Strategies from '../strategies'

describe('LineupCreator', () => {
  it('generates lineups based on actual points', async () => {
    const lineup = new LineupCreator('2016-10-25', Networks.FanDuel, Strategies.Actual)
    await lineup.fillPool()
    expect(lineup.pool.length).toBe(70)
  })
})
