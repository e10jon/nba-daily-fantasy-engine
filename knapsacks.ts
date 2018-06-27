import * as _find from 'lodash/find'
import * as _map from 'lodash/map'

import {Lineup, Player} from './lineup-creator'

interface Inputs {
  pool: Player[], 
  network: number,
}

export const branchBound = ({network, pool}: Inputs): Lineup => {
  pool = pool.sort((a, b) => a.value / a.salary > b.value / b.salary ? -1 : 1)

  const lineup = new Lineup(network)
  const salaryCap = lineup.salaryCap()
  const poolSize = pool.length
  let playerIds = []

  class Node {
    level
    profit = 0
    weight = 0
    bound = 0
    playerIds = []

    constructor (level?) {
      this.level = level
    }

    setBound = () => {
      if (this.weight >= salaryCap) {
        this.bound = 0
        return
      }

      let profitBound = this.profit

      let j = this.level + 1
      let totweight = this.weight

      while ((j < poolSize) && (totweight + pool[j].salary <= salaryCap)) {
        totweight += pool[j].salary
        profitBound += pool[j].value
        ++j
      }

      if (j < poolSize) {
        profitBound += (salaryCap - totweight) * pool[j].value / pool[j].salary
      }

      this.bound = profitBound
    }
  }

  const q = []
  let u = new Node(-1)
  let v = new Node()
  q.push(u)

  let maxScore = 0
  while (q.length) {
    u = q.shift()

    if (u.level === -1) v.level = 0
    if (u.level === poolSize - 1) continue

    v.level = u.level + 1

    v.weight = u.weight + pool[v.level].salary
    v.profit = u.profit + pool[v.level].value
    v.playerIds = u.playerIds.concat(pool[v.level].playerId)

    if (v.weight <= salaryCap && v.profit > maxScore) {
      maxScore = v.profit
      playerIds = v.playerIds
    }

    v.setBound()

    if (v.bound > maxScore) q.push(v)

    v.weight = u.weight
    v.profit = u.profit
    v.setBound()
    if (v.bound > maxScore) q.push(v)
  }

  for (const playerId of playerIds) {
    const player = _find(pool, {playerId})
    lineup.addPlayer(player)
  }

  return lineup
}

export const dynamic = ({pool, network}: Inputs): Lineup => {
  const lineup = new Lineup(network)
  const salaryCap = lineup.salaryCap()
  const poolSize = pool.length

  const h = {}
 
  for (let i = 0; i <= poolSize; ++i) {
    h[i] = {}
    for (let w = 0; w <= salaryCap; ++w) {
      if (i === 0 || w === 0) {
        h[i][w] = 0
      } else if (pool[i - 1].salary <= w) {
        const a = h[i - 1][w - pool[i - 1].salary]
        const b = h[i - 1][w]
        h[i][w] = pool[i - 1].value + a > b ? pool[i - 1].value + a : b
      } else {
        h[i][w] = h[i - 1][w]
      }
    }
  }

  const maxScore = h[poolSize][salaryCap]
  let res = maxScore
  let w = salaryCap
  const players = []

  for (let i = poolSize; i > 0 && res > 0; --i) {
    if (h[i - 1][w] && res === h[i - 1][w]) continue
    else {
      const playerId = pool[i - 1].playerId
      const player = _find(pool, {playerId})
      lineup.addPlayer(player)
      res = res - pool[i - 1].value
      w = w - pool[i - 1].salary
    }
  }

  return lineup
}