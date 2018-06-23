module.exports = {
  up: knex => (
    knex.schema.createTable('stats', table => {
      table.increments()
      table.integer('playerId')
      table.string('name')
      table.date('date')
      table.integer('season')
      table.string('position')
      table.float('minutes')
      table.boolean('didStart')
      table.integer('fanduelSalary')
      table.integer('draftkingsSalary')
      table.float('fanduelPoints')
      table.float('draftkingsPoints')
      table.float('fanduelPointsPerMinute')
      table.float('draftkingsPointsPerMinute')
      table.float('fanduelPointsPerKDollars')
      table.float('draftkingsPointsPerKDollars')
    })
  ),

  down: knex => (
    knex.schema.dropTableIfExists('stats')
  )
}