module.exports = {
  client: 'mysql2',
  connection: {
    host: 'localhost',
    password: 'abc123',
    port: 3306,
    user: 'root',
    database: 'nba-daily-fantasy-engine'
  },
  debug: false,
  pool: {min: 1, max: 1},
}