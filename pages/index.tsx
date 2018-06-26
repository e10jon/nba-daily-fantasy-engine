import * as groupBy from 'lodash/groupBy'
import * as map from 'lodash/map'
import * as values from 'lodash/values'
import dynamic from 'next/dynamic'
import * as React from 'react'
import {Box, Divider, Flex, Heading, Link} from 'rebass'

import {statsTable} from '../db'
import SEASONS from '../seasons'

const Plot = dynamic(import('../components/plot'), {ssr: false})

interface Props {
  maxFanduelPoints: number,
  maxFanduelPointsPerMinute: number,
  maxFanduelPointsPerKDollars: number,
  maxFanduelSalary: number,
  page: number,
  season: [number, number],
  stats: Array<Array<any>>,
}

const PER_PAGE = 20

class Home extends React.Component<Props> {
  static getInitialProps = async ({query}): Promise<Props> => {
    const season = SEASONS[query.season || '2017']
    const page = parseInt(query.page || '1')

    const playerIds = map(await statsTable().distinct('playerId').orderBy('name', 'ASC').limit(PER_PAGE).offset((page - 1) * PER_PAGE), 'playerId')
    const stats = values(groupBy(await statsTable().whereIn('playerId', playerIds).where('date', '>=', season[0]).andWhere('date', '<=', season[1]).orderBy('date', 'ASC'), 'playerId'))
    const maxFanduelSalary = (await statsTable().max('fanduelSalary as max'))[0].max
    const maxFanduelPoints = (await statsTable().max('fanduelPoints as max'))[0].max
    const maxFanduelPointsPerMinute = (await statsTable().where('minutes', '>=', 10).max('fanduelPointsPerMinute as max'))[0].max
    const maxFanduelPointsPerKDollars = (await statsTable().max('fanduelPointsPerKDollars as max'))[0].max

    return {maxFanduelPoints, maxFanduelPointsPerMinute, maxFanduelPointsPerKDollars, maxFanduelSalary, page, season, stats}
  }

  render () {
    const {maxFanduelPoints, maxFanduelPointsPerMinute, maxFanduelPointsPerKDollars, maxFanduelSalary, page, season, stats} = this.props
    const commonPlotProps = {config: {staticPlot: true}}
    const commonPlotLayout = {
      displayModeBar: false,
      font: {family: 'IBM Plex Mono'},
      height: 300, width: 400,
      margin: {l: 30, r: 30, b: 30, t: 30, pad: 0},
      xaxis: {range: [season[0], season[1]]},
    }

    return (
      <Box mb={4}>
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
              <Heading fontSize={4} mb={3}>{name}</Heading>
              <Flex flexWrap='no-wrap'>
                <Plot {...commonPlotProps}
                  data={[{
                    x: dates,
                    y: fanduelSalaries,
                    mode: 'markers',
                    type: 'scatter',
                  }]}
                  layout={{
                    title: 'Fanduel Salaries',
                    yaxis: {range: [0, maxFanduelSalary]},
                    ...commonPlotLayout,
                  }}
                />
                <Plot {...commonPlotProps}
                  data={[{
                    x: dates,
                    y: fanduelPoints,
                    mode: 'markers',
                    type: 'scatter',
                  }]}
                  layout={{
                    title: 'Fanduel Points',
                    yaxis: {range: [0, maxFanduelPoints]},
                    ...commonPlotLayout,
                  }}
                />
                <Plot {...commonPlotProps}
                  data={[{
                    x: dates,
                    y: fanduelPointsPerMinutes,
                    mode: 'markers',
                    type: 'scatter',
                  }]}
                  layout={{
                    title: 'Fanduel Points Per Minute',
                    yaxis: {range: [0, maxFanduelPointsPerMinute]},
                    ...commonPlotLayout,
                  }}
                />
                <Plot {...commonPlotProps}
                  data={[{
                    x: dates,
                    y: fanduelPointsPerKDollars,
                    mode: 'markers',
                    type: 'scatter',
                  }]}
                  layout={{
                    title: 'Fanduel Points Per $1k',
                    yaxis: {range: [0, maxFanduelPointsPerKDollars]},
                    ...commonPlotLayout,
                  }}
                />
              </Flex>
              <Divider />
            </Box>
          )
        })}
        {page > 1 && <Link bg='blue' color='white' mr={2} px={3} py={2} href={`/?page=${page - 1}`}>Prev</Link>}
        <Link bg='blue' color='white' px={3} py={2} href={`/?page=${page + 1}`}>Next</Link>
      </Box>
    )
  }
}

export default Home