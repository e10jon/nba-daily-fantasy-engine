import * as _chunk from 'lodash/chunk'
import * as _concat from 'lodash/concat'
import * as _find from 'lodash/find'
import * as _flatten from 'lodash/flatten'
import * as _map from 'lodash/map'
import * as _remove from 'lodash/remove'
import * as _sample from 'lodash/sample'
import * as _uniqBy from 'lodash/uniqBy'

import Lineup from './lineup'
import Player from './player'

const {floor, max, random} = Math

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

export const genetic = ({network, pool}, opts: {
  numGenerations?: number,
  populationSize?: number,
  selectionProportion?: number,
  mutationRate?: number,
}) => {
  const numGenerations = opts.numGenerations || 10
  const populationSize = opts.populationSize || pool.length * 10
  const selectionProportion = opts.selectionProportion || 0.5
  const mutationRate = opts.mutationRate || 0.2

  const positions = Lineup.positionStrings(network)
  const subpools = createSubpools(pool)
  const subpoolsKeys = Object.keys(subpools)

  const generatePopulation = pool => {
    const population: Lineup[] = []
    let p = 0

    generatingPopulation: for (let i = 0; i < populationSize; ++i) {
      const remPlayers = subpoolsKeys.reduce((h, k) => {
        h[k] = subpools[k].slice(0)
        return h
      }, {})
      const lineup = new Lineup(network)

      // guarantee that every player appears in a lineup
      lineup.addPlayer(pool[p])
      ++p
      if (p === pool.length - 1) p = 0


      for (const position of positions) {
        if (lineup[position]) continue

        const subpool = subpoolForPosition(remPlayers, position)
        const maxSalary = lineup.salaryCap() - lineup.totalSalary()
        const eligiblePlayers = subpool.filter(p => p.salary <= maxSalary)
        
        // the lineup is too expensive, try again
        if (eligiblePlayers.length === 0) {
          --i
          continue generatingPopulation
        }

        let player
        do {
          player = _sample(subpool)
        } while (!lineup.addPlayer(player))

        // remove the player from other subpools if selected
        for (let k of subpoolsKeys) {
          _remove(remPlayers[k], p => p.playerId === player.playerId)
        }
      }

      population.push(lineup)
    }

    return population
  }

  // initialization
  let population = generatePopulation(pool)
  let bestLineup = population[0]

  for (let g = 0; g < numGenerations; ++g) {
    // selection
    population = population.sort((p1, p2) => p1.totalValue() > p2.totalValue() ? -1 : 1)
    population = population.slice(0, floor(population.length * selectionProportion))

    // save the best result
    if (bestLineup.totalValue() < population[0].totalValue()) bestLineup = population[0]
    
    // crossover
    const newPool = _uniqBy(_flatten(population.map(p => p.players())), 'playerId')
    population = generatePopulation(newPool)

    // mutate
    for (const lineup of population) {
      if (random() <= mutationRate) {
        let didMutate = false

        while (!didMutate) {
          const position = _sample(positions)
          const subpool = subpoolForPosition(subpools, position)
          const maxSalary = lineup.salaryCap() - (lineup.totalSalary() - lineup[position].salary)
          const eligiblePlayers = subpool.filter(p => p.salary <= maxSalary)
          
          // the lineup is too expensive, try again
          if (eligiblePlayers.length) {
            lineup[position] = _sample(eligiblePlayers)
            didMutate = true
          }
        }
      }
    }
    
    // console.log(`Max value for generation ${g}:`, max(...population.map(p => p.totalValue())))
  }

  if (!bestLineup.isValid()) {
    throw new Error('lineup should be valid but is not')
  }

  // console.log('Best lineup:', bestLineup.toString())
  return bestLineup
}

const createSubpools = (pool: Player[]) => {
  let pgs = []
  let sgs = []
  let sfs = []
  let pfs = []
  let cs = []

  for (const player of pool) {
    if (/\bPG\b/.test(player.position)) pgs.push(player)
    if (/\bSG\b/.test(player.position)) sgs.push(player)
    if (/\bSF\b/.test(player.position)) sfs.push(player)
    if (/\bPF\b/.test(player.position)) pfs.push(player)
    if (/\bC\b/.test(player.position)) cs.push(player)
  }

  return {pgs, sgs, sfs, pfs, cs}
}

const subpoolForPosition = (subpools, position) => {
  switch (position) {
    case 'pg1':
    case 'pg2': return subpools.pgs
    case 'sg1':
    case 'sg2': return subpools.sgs
    case 'sf1':
    case 'sf2': return subpools.sfs
    case 'pf1':
    case 'pf2': return subpools.pfs
    case 'c1': return subpools.cs
    case 'g1': return _concat(subpools.pgs, subpools.sgs)
    case 'f1': return _concat(subpools.sfs, subpools.pfs)
    case 'u1': return _concat(subpools.pgs, subpools.sgs, subpools.sfs, subpools.pfs, subpools.cs)
  }
}
