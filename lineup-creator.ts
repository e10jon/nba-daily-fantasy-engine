import * as _compact from 'lodash/compact'
import * as _map from 'lodash/map'
import * as _sum from 'lodash/sum'
import Networks from './networks'

enum Strategies {
  Actual
}

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
}

class Lineup {
  network: number
  pg1: Player
  pg2: Player
  sg1: Player
  sg2: Player
  sf1: Player
  sf2: Player
  pf1: Player
  pf2: Player
  c: Player
  u: Player

  constructor (network: number) {
    this.network = network
  }

  public isValid = () => this.isFilled() && this.isUnderSalaryCap()

  public players = () => _compact([this.pg1, this.pg2, this.sg1, this.sg2, this.sf1, this.sf2, this.pf1, this.pg2, this.c, this.u])

  private isFilled = () => {
    switch (this.network) {
      case Networks.DraftKings:
        return this.pg1 && this.sg1 && this.sf1 && this.pf1 && this.c && this.u && (this.pg2 || this.sg2) && (this.sf2 || this.pf2)
      case Networks.FanDuel:
        return this.pg1 && this.pg2 && this.sg1 && this.sg2 && this.sf1 && this.sf2 && this.pf1 && this.pf2 && this.c
    }
  }

  private isUnderSalaryCap = () => _sum(_map(this.players(), 'salary')) <= this.salaryCap()

  private salaryCap = () => {
    switch (this.network) {
      case Networks.DraftKings: return 50000
      case Networks.FanDuel: return 60000
    }
  }

  private totalValue = () => _sum(_map(this.players(), 'value'))
}

class LineupCreator {
  date: Date
  network: number
  strategy: number

  constructor (date: Date, network: number, strategy: number) {
    this.date = date
    this.network = network
    this.strategy = strategy
  }
}