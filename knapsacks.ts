import * as _map from 'lodash/map'

import {Player} from './lineup-creator'

interface Inputs {
  pool: Player[], 
  salaryCap: number,
}

interface Solution {
  maxScore: number,
  players: any,
}

export const branchBound = ({pool, salaryCap}: Inputs): Solution => {
  pool = pool.sort((a, b) => a.value / a.salary > b.value / b.salary ? -1 : 1)

  const weights = _map(pool, 'salary')
  const values = _map(pool, 'value')
  const playerIds = _map(pool, 'playerId')
  const poolSize = pool.length

  let players = []

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

      while ((j < poolSize) && (totweight + weights[j] <= salaryCap)) {
        totweight += weights[j]
        profitBound += values[j]
        ++j
      }

      if (j < poolSize) {
        profitBound += (salaryCap - totweight) * values[j] / weights[j]
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

    v.weight = u.weight + weights[v.level]
    v.profit = u.profit + values[v.level]

    if (v.weight <= salaryCap && v.profit > maxScore) {
      maxScore = v.profit
    }

    v.setBound()

    if (v.bound > maxScore) q.push(v)

    v.weight = u.weight
    v.profit = u.profit
    v.setBound()
    if (v.bound > maxScore) q.push(v)
  }

  return {maxScore, players}
}

export const dynamic = ({pool, salaryCap}: Inputs): Solution => {
  const weights = _map(pool, 'salary')
  const values = _map(pool, 'value')
  const playerIds = _map(pool, 'playerId')
  const poolSize = pool.length

  const h = {}
 
  for (let i = 0; i <= poolSize; ++i) {
    h[i] = {}
    for (let w = 0; w <= salaryCap; ++w) {
      if (i === 0 || w === 0) {
        h[i][w] = {p: null, w: 0}
      } else if (weights[i - 1] <= w) {
        const a = h[i - 1][w - weights[i - 1]]
        const b = h[i - 1][w]
        h[i][w] = values[i - 1] + a.w > b.w ? {...a, w: values[i - 1] + a.w} : b
      } else {
        h[i][w] = h[i - 1][w]
      }
    }
  }

  const maxScore = h[poolSize][salaryCap].w
  let res = maxScore
  let w = salaryCap
  const players = []

  for (let i = poolSize; i > 0 && res > 0; --i) {
    if (h[i - 1][w] && res === h[i - 1][w].w) continue
    else {
      players.push(playerIds[i - 1])
      res = res - values[i - 1]
      w = w - weights[i - 1]
    }
  }

  return {maxScore, players}
}