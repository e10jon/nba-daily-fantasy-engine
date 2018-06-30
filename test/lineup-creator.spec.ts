import * as expect from 'expect'

import LineupCreator from '../lineup-creator'
import Networks from '../networks'
import Strategies from '../strategies'

const TEST_DATE = '2016-10-25'

describe('LineupCreator', () => {
  describe('#generateLineup', () => {
    for (let network of [Networks.DraftKings, Networks.FanDuel]) {
      for (let strategy of [Strategies.Actual]) {
        it(`${Networks[network]} ${Strategies[strategy]}`, async () => {
          const lineupCreator = new LineupCreator(TEST_DATE, network, strategy)
          await lineupCreator.fillPool()
          const lineup = lineupCreator.generateLineup('genetic', {
            numGenerations: 2,
          })
          expect(lineup.isValid()).toBeTruthy()
        }).timeout(0)
      }
    }
  })
})
