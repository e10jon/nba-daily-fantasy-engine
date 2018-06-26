import knex from './knex'

export const insertStatsRows = rows => knex.batchInsert('stats', rows, 500)
export const statsTable = () => knex('stats')
