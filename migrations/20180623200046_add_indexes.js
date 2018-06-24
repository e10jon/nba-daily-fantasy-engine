module.exports = {
  up: knex => (
    knex.schema.alterTable('stats', table => {
      table.index('date')
    })
  ),

  down: knex => (
    knex.schema.alterTable('stats', table => {
      table.dropIndex('date')
    })
  )
}