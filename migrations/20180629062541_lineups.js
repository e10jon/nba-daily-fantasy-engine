module.exports = {
  up: knex => (
    knex.schema.createTable('lineups', table => {
      table.increments()
      table.date('date')
      table.integer('network')
      table.integer('strategy')
      table.text('playerIds')
      table.float('totalValue')
    })
  ),

  down: knex => (
    knex.schema.dropTableIfExists('lineups')
  )
}