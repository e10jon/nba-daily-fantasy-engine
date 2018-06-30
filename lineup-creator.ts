import {sortBy} from 'lodash'

import {getColumnPrefix, statsTable} from './db'
import {genetic} from './knapsacks'
import Lineup from './lineup'
import Player from './player'
import Strategies from './strategies'

class LineupCreator {
  date: string
  network: number
  pool: Player[]
  strategy: number

  constructor (date: string, network: number, strategy: number) {
    this.date = date
    this.network = network
    this.strategy = strategy
  }

  fillPool = async () => {
    const rows = await statsTable().where({date: this.date})
    const columnPrefix = getColumnPrefix(this.network)

    // from most to least valuable
    this.pool = sortBy(rows.reduce((arr, row) => {
      const {playerId} = row
      const position = row[`${columnPrefix}Position`]
      const salary = row[`${columnPrefix}Salary`]
      const value = this.createValue(row, {columnPrefix})
      if (playerId && position && salary && value) {
        arr.push(new Player(playerId, position, salary, value))
      }
      return arr
    }, []), p => p.value * -1)
  }

  generateLineup = (generator: string = 'genetic', generatorOpts): Lineup => {
    const lineup = genetic({pool: this.pool, network: this.network}, generatorOpts)

    // console.log('Memory usage:', process.memoryUsage().heapUsed / 1024 / 1024)
    // console.log('Lineup:', lineup.positions())
    // console.log('Total salary:', lineup.totalSalary())
    // console.log('Total value:', lineup.totalValue())
  
    return lineup
  }

  private createValue = (row, {columnPrefix}) => {
    switch (this.strategy) {
      case Strategies.Actual:
        return row[`${columnPrefix}Points`]
    }
  }
}

export default LineupCreator