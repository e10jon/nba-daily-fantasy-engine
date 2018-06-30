class Player {
  playerId: number
  position: string
  salary: number
  value: number

  constructor (playerId: number, position: string, salary: number, value: number) {
    this.playerId = playerId
    this.position = position
    this.salary = salary
    this.value = value
  }

  valuePerK = () => this.value / (this.salary / 1000)
}

export default Player