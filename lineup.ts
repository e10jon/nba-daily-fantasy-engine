import {compact, map, sum} from 'lodash'

import Player from './player'
import Networks from './networks'

class Lineup {
  static positionStrings = (network: number) => {
    switch (network) {
      case Networks.DraftKings: return ['pg1', 'sg1', 'sf1', 'pf1', 'c1', 'g1', 'f1', 'u1']
      case Networks.FanDuel: return ['pg1', 'pg2', 'sg1', 'sg2', 'sf1', 'sf2', 'pf1', 'pf2', 'c1']
    }
  }

  network: number
  pg1: Player
  pg2: Player
  sg1: Player
  sg2: Player
  sf1: Player
  sf2: Player
  pf1: Player
  pf2: Player
  c1: Player
  g1: Player
  f1: Player
  u1: Player

  constructor (network: number) {
    this.network = network
  }

  addPlayer = (player: Player): Player | false => {
    const {position, salary} = player

    if (this.totalSalary() + salary > this.salaryCap()) return false

    for (let [r, ps] of ADD_PLAYER_LOOKUPS[this.network]) {
      if (r.test(position)) {
        for (let p of ps) {
          if (!this[p]) return this[p] = player
        }
      } 
    }

    return false
  }

  isValid = () => this.isFilled() && this.isUnderSalaryCap()
  isUnderSalaryCap = () => this.totalSalary() <= this.salaryCap()

  players = () => compact(Lineup.positionStrings(this.network).map(p => this[p]))

  positions = () => Lineup.positionStrings(this.network).reduce((h, p) => {
    h[p] = this[p]
    return h
  }, {})

  salaryCap = () => {
    switch (this.network) {
      case Networks.DraftKings: return 50000
      case Networks.FanDuel: return 60000
    }
  }

  toString = () => `Total value: ${this.totalValue()}, Total salary: ${this.totalSalary()}, Values: [${this.players().map(p => p.value).join(', ')}], PerKs: [${this.players().map(p => p.valuePerK().toFixed(2)).join(', ')}]`

  totalSalary = () => this.players().reduce((tot, p) => tot + p.salary, 0)
  totalValue = () => this.players().reduce((tot, p) => tot + p.value, 0)

  private isFilled = () => Lineup.positionStrings(this.network).some(p => this[p])
}

export default Lineup

const ADD_PLAYER_LOOKUPS: any = {
  [Networks.DraftKings]: [
    [/PG/, ['pg1']],
    [/SG/, ['sg1']],
    [/SF/, ['sf1']],
    [/PF/, ['pf1']],
    [/C/, ['c1']],
    [/G/, ['g1']],
    [/F/, ['f1']],
    [/./, ['u1']],
  ],
  [Networks.FanDuel]: [
    [/PG/, ['pg1', 'pg2']],
    [/SG/, ['sg1', 'sg2']],
    [/SF/, ['sf1', 'sf2']],
    [/PF/, ['pf1', 'pf2']],
    [/C/, ['c1']],
  ]
}
