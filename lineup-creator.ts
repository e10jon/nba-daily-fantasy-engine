import * as _compact from 'lodash/compact'
import * as _concat from 'lodash/concat'
import * as _map from 'lodash/map'
import * as _remove from 'lodash/remove'
import * as _sample from 'lodash/sample'
import * as _shuffle from 'lodash/shuffle'
import * as _sum from 'lodash/sum'

import {getColumnPrefix, statsTable} from './db'
import Networks from './networks'
import Strategies from './strategies';
import { fstat } from 'fs';

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
  c1: Player
  g1: Player
  f1: Player
  u1: Player

  constructor (network: number) {
    this.network = network
  }

  isValid = () => this.isFilled() && this.isUnderSalaryCap()
  isUnderSalaryCap = () => _sum(_map(this.players(), 'salary')) <= this.salaryCap()

  players = () => _compact([this.pg1, this.pg2, this.sg1, this.sg2, this.sf1, this.sf2, this.pf1, this.pg2, this.c1, this.g1, this.f1, this.u1])

  private isFilled = () => {
    switch (this.network) {
      case Networks.DraftKings:
        return this.pg1 && this.sg1 && this.sf1 && this.pf1 && this.c1 && this.u1 && this.g1 && this.f1
      case Networks.FanDuel:
        return this.pg1 && this.pg2 && this.sg1 && this.sg2 && this.sf1 && this.sf2 && this.pf1 && this.pf2 && this.c1
    }
  }

  private salaryCap = () => {
    switch (this.network) {
      case Networks.DraftKings: return 50000
      case Networks.FanDuel: return 60000
    }
  }

  private totalValue = () => _sum(_map(this.players(), 'value'))
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
    this.pool = rows.reduce((arr, row) => {
      const {playerId} = row
      const position = row[`${columnPrefix}Position`]
      const salary = row[`${columnPrefix}Salary`]
      const value = this.createValue(row, {columnPrefix})
      if (playerId && position && salary && value) {
        arr.push(new Player(playerId, position, salary, value))
      }
      return arr
    }, [])
  }

  generateLineup = () => {
    const lineup = new Lineup(this.network)

    let pgs = []
    let sgs = []
    let sfs = []
    let pfs = []
    let cs = []

    for (const player of this.pool) {
      if (/\bPG\b/.test(player.position)) pgs.push(player)
      if (/\bSG\b/.test(player.position)) sgs.push(player)
      if (/\bSF\b/.test(player.position)) sfs.push(player)
      if (/\bPF\b/.test(player.position)) pfs.push(player)
      if (/\bC\b/.test(player.position)) cs.push(player)
    }

    const spots = (() => {
      switch (this.network) {
        case Networks.DraftKings: return ['pg1', 'sg1', 'sf1', 'pf1', 'c1', 'g1', 'f1', 'u1']
        case Networks.FanDuel: return ['pg1', 'pg2', 'sg1', 'sg2', 'sf1', 'sf2', 'pf1', 'pf2', 'c1']
      }
    })()

    for (const spot of _shuffle(spots)) {
      const subpool = (() => {
        switch (spot) {
          case 'pg1':
          case 'pg2':
            return pgs
          case 'sg1':
          case 'sg2':
            return sgs
          case 'sf1':
          case 'sf2':
            return sfs
          case 'pf1':
          case 'pf2':
            return pfs
          case 'c1':
            return cs
          case 'g1':
            return _concat(pgs, sgs)
          case 'f1':
            return _concat(sfs, pfs)
          case 'u1':
            return _concat(pgs, sgs, sfs, pfs, cs)
        }
      })()

      let player

      do {
        player = _sample(subpool)
        lineup[spot] = player
      } while (!lineup.isUnderSalaryCap())

      // remove the player from all pools so he can't be picked again
      for (let s of [pgs, sgs, sfs, pfs, cs]) {
        _remove(s, p => p.playerId === player.playerId)
      }
    }

    return lineup
  }

  private createValue = (row, {columnPrefix}) => {
    switch (this.strategy) {
      case Strategies.Actual:
        return row[`${columnPrefix}Points`]
    }
  }
}