import * as _compact from 'lodash/compact'
import * as _concat from 'lodash/concat'
import * as _map from 'lodash/map'
import * as _remove from 'lodash/remove'
import * as _sample from 'lodash/sample'
import * as _shuffle from 'lodash/shuffle'
import * as _sortBy from 'lodash/sortBy'
import * as _sum from 'lodash/sum'

import {getColumnPrefix, statsTable} from './db'
import {genetic} from './knapsacks'
import Networks from './networks'
import Strategies from './strategies';
import { fstat } from 'fs';

export class Player {
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

export class Lineup {
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
    if (this.totalSalary() + player.salary > this.salaryCap()) return false

    switch (this.network) {
      case Networks.DraftKings:
        if (/\bPG\b/.test(player.position)) {
          if (!this.pg1) return this.pg1 = player
          if (!this.g1) return this.g1 = player
          if (!this.u1) return this.u1 = player
          return false
        }
        if (/\bSG\b/.test(player.position)) {
          if (!this.sg1) return this.sg1 = player
          if (!this.g1) return this.g1 = player
          if (!this.u1) return this.u1 = player
          return false
        }
        if (/\bSF\b/.test(player.position)) {
          if (!this.sf1) return this.sf1 = player
          if (!this.f1) return this.f1 = player
          if (!this.u1) return this.u1 = player
          return false
        }
        if (/\bPF\b/.test(player.position)) {
          if (!this.pf1) return this.pf1 = player
          if (!this.f1) return this.f1 = player
          if (!this.u1) return this.u1 = player
          return false
        }
        if (/\bC\b/.test(player.position)) {
          if (!this.c1) return this.c1 = player
          if (!this.u1) return this.u1 = player
          return false
        }

      case Networks.FanDuel:
        if (/\bPG\b/.test(player.position)) {
          if (!this.pg1) return this.pg1 = player
          if (!this.pg2) return this.pg2 = player
          return false
        }
        if (/\bSG\b/.test(player.position)) {
          if (!this.sg1) return this.sg1 = player
          if (!this.sg2) return this.sg2 = player
          return false
        }
        if (/\bSF\b/.test(player.position)) {
          if (!this.sf1) return this.sf1 = player
          if (!this.sf2) return this.sf2 = player
          return false
        }
        if (/\bPF\b/.test(player.position)) {
          if (!this.pf1) return this.pf1 = player
          if (!this.pf2) return this.pf2 = player
          return false
        }
        if (/\bC\b/.test(player.position)) {
          if (!this.c1) return this.c1 = player
          return false
        }
    }
    return false
  }

  isValid = () => this.isFilled() && this.isUnderSalaryCap()
  isUnderSalaryCap = () => _sum(_map(this.players(), 'salary')) <= this.salaryCap()

  players = () => _compact(Lineup.positionStrings(this.network).map(p => this[p]))

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

  totalSalary = () => _sum(_map(this.players(), 'salary'))
  totalValue = () => _sum(_map(this.players(), 'value'))

  private isFilled = () => {
    switch (this.network) {
      case Networks.DraftKings:
        return this.pg1 && this.sg1 && this.sf1 && this.pf1 && this.c1 && this.u1 && this.g1 && this.f1
      case Networks.FanDuel:
        return this.pg1 && this.pg2 && this.sg1 && this.sg2 && this.sf1 && this.sf2 && this.pf1 && this.pf2 && this.c1
    }
  }
}

export default class LineupCreator {
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
    this.pool = _sortBy(rows.reduce((arr, row) => {
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

  generateLineup = (): Lineup => {
    const lineup = genetic({pool: this.pool, network: this.network})

    // console.log('Memory usage:', process.memoryUsage().heapUsed / 1024 / 1024)
    // console.log('Lineup:', lineup.positions())
    // console.log('Total salary:', lineup.totalSalary())
    // console.log('Total value:', lineup.totalValue())
  
    return lineup
  }

  generatePopulation = (): Lineup[] => {
    const population = []
    for (let i = 0; i < this.pool.length; ++i) population.push(this.generateLineup())
    return population
  }

  private createValue = (row, {columnPrefix}) => {
    switch (this.strategy) {
      case Strategies.Actual:
        return row[`${columnPrefix}Points`]
    }
  }
}