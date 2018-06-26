import * as groupBy from 'lodash/groupBy'
import * as map from 'lodash/map'
import * as values from 'lodash/values'
import dynamic from 'next/dynamic'
import * as React from 'react'
import {Box, Divider, Flex, Heading} from 'rebass'

import {statsTable} from '../db'
import SEASONS from '../seasons'

const Plot = dynamic(import('../components/plot'), {ssr: false})

interface Props {
  maxFanduelPoints: number,
  maxFanduelPointsPerMinute: number,
  maxFanduelPointsPerKDollars: number,
  maxFanduelSalary: number,
  season: [number, number],
  stats: Array<Array<any>>,
}

const CHART_HEIGHT = 400
const CHART_WIDTH = 600
const PER_PAGE = 20

class Home extends React.Component<Props> {
  static getInitialProps = async ({query}) => {
    const season = SEASONS[query.season || '2017']
    const page = parseInt(query.page || '1')

    const playerIds = map(await statsTable().distinct('playerId').orderBy('name', 'ASC').limit(PER_PAGE).offset((page - 1) * PER_PAGE), 'playerId')
    const stats = values(groupBy(await statsTable().whereIn('playerId', playerIds).where('date', '>=', season[0]).andWhere('date', '<=', season[1]).orderBy('date', 'ASC'), 'playerId'))
    const maxFanduelSalary = (await statsTable().max('fanduelSalary as max'))[0].max
    const maxFanduelPoints = (await statsTable().max('fanduelPoints as max'))[0].max
    const maxFanduelPointsPerMinute = (await statsTable().where('minutes', '>=', 10).max('fanduelPointsPerMinute as max'))[0].max
    const maxFanduelPointsPerKDollars = (await statsTable().max('fanduelPointsPerKDollars as max'))[0].max

    return {maxFanduelPoints, maxFanduelPointsPerMinute, maxFanduelPointsPerKDollars, maxFanduelSalary, season, stats}
  }

  render () {
    const {maxFanduelPoints, maxFanduelPointsPerMinute, maxFanduelPointsPerKDollars, maxFanduelSalary, season, stats} = this.props

    return (
      <Box>
        <Heading>NBA Daily Fantasy Engine</Heading>
        <Divider />

        {stats.map(rows => {
          const {name, playerId} = rows[0]
          const dates = map(rows, 'date')
          const fanduelSalaries = map(rows, 'fanduelSalary')
          const fanduelPoints = map(rows, 'fanduelPoints')
          const fanduelPointsPerMinutes = map(rows, 'fanduelPointsPerMinute')
          const fanduelPointsPerKDollars = map(rows, 'fanduelPointsPerKDollars')

          return (
            <Box key={playerId}>
              <Heading fontSize={4}>{name}</Heading>
              <Flex flexWrap='no-wrap'>
                <Plot
                  data={[{
                    x: dates,
                    y: fanduelSalaries,
                    mode: 'markers',
                    type: 'scatter',
                  }]}
                  layout={{
                    height: CHART_HEIGHT,
                    title: 'Fanduel Salaries',
                    width: CHART_WIDTH,
                    xaxis: {range: [season[0], season[1]]},
                    yaxis: {range: [0, maxFanduelSalary]}
                  }}
                />
                <Plot
                  data={[{
                    x: dates,
                    y: fanduelPoints,
                    mode: 'markers',
                    type: 'scatter',
                  }]}
                  layout={{
                    height: CHART_HEIGHT,
                    title: 'Fanduel Points',
                    width: CHART_WIDTH,
                    xaxis: {range: [season[0], season[1]]},
                    yaxis: {range: [0, maxFanduelPoints]},
                  }}
                />
                <Plot
                  data={[{
                    x: dates,
                    y: fanduelPointsPerMinutes,
                    mode: 'markers',
                    type: 'scatter',
                  }]}
                  layout={{
                    height: CHART_HEIGHT,
                    title: 'Fanduel Points Per Minute',
                    width: CHART_WIDTH,
                    xaxis: {range: [season[0], season[1]]},
                    yaxis: {range: [0, maxFanduelPointsPerMinute]},
                  }}
                />
                <Plot
                  data={[{
                    x: dates,
                    y: fanduelPointsPerKDollars,
                    mode: 'markers',
                    type: 'scatter',
                  }]}
                  layout={{
                    height: CHART_HEIGHT,
                    title: 'Fanduel Points Per $1k',
                    width: CHART_WIDTH,
                    xaxis: {range: [season[0], season[1]]},
                    yaxis: {range: [0, maxFanduelPointsPerKDollars]},
                  }}
                />
              </Flex>
              <Divider />
            </Box>
          )
        })}
      </Box>
    )
  }
}

export default Home