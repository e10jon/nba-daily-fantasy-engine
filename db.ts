import knex from './knex'
import Networks from './networks'

export const getColumnPrefix = (network: number) => {
  switch (network) {
    case Networks.DraftKings: return 'draftkings'
    case Networks.FanDuel: return 'fanduel'
  }
}

export const insertStatsRows = rows => knex.batchInsert('stats', rows, 500)

export const lineupsTable = () => knex('lineups')
export const statsTable = () => knex('stats')
