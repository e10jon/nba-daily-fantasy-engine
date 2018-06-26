import * as groupBy from 'lodash/groupBy'
import * as map from 'lodash/map'
import * as values from 'lodash/values'
import dynamic from 'next/dynamic'
import * as React from 'react'
import {Box, Divider, Flex, Heading, Link, Select} from 'rebass'

import {getColumnPrefix, statsTable} from '../db'
import Networks from '../networks'
import SEASONS from '../seasons'
import {Row} from '../scraper'

const Plot = dynamic(import('../components/plot'), {ssr: false})

interface Props {
  columnPrefix: string,
  maxPoints: number,
  maxPointsPerMinute: number,
  maxPointsPerKDollars: number,
  maxSalary: number,
  network: number,
  page: number,
  season: [number, number],
  stats: Array<Array<Row>>,
}

const PER_PAGE = 20

class HomePage extends React.Component<Props> {
  static getInitialProps = async ({query}): Promise<Props> => {
    const network = parseInt(query.network || Networks.FanDuel)
    const columnPrefix = getColumnPrefix(network)
    const season = SEASONS[query.season || '2017']
    const page = parseInt(query.page || '1')

    const playerIds = map(await statsTable().distinct('playerId').orderBy('name', 'ASC').limit(PER_PAGE).offset((page - 1) * PER_PAGE), 'playerId')
    const stats = values(groupBy(await statsTable().whereIn('playerId', playerIds).where('date', '>=', season[0]).andWhere('date', '<=', season[1]).orderBy('date', 'ASC'), 'playerId'))
    const maxSalary = (await statsTable().max(`${columnPrefix}Salary as max`))[0].max
    const maxPoints = (await statsTable().max(`${columnPrefix}Points as max`))[0].max
    const maxPointsPerMinute = (await statsTable().where('minutes', '>=', 10).max(`${columnPrefix}PointsPerMinute as max`))[0].max
    const maxPointsPerKDollars = (await statsTable().max(`${columnPrefix}PointsPerKDollars as max`))[0].max

    return {columnPrefix, maxPoints, maxPointsPerMinute, maxPointsPerKDollars, maxSalary, network, page, season, stats}
  }

  private static renderNetworkOption = network => {
    const text = (() => {
      switch (network) {
        case Networks.DraftKings: return 'DraftKings'
        case Networks.FanDuel: return 'FanDuel'
      }
    })()
    return <option key={network} value={network}>{text}</option>
  }

  render () {
    const {columnPrefix, maxPoints, maxPointsPerMinute, maxPointsPerKDollars, maxSalary, network, page, season, stats} = this.props

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
        <Flex alignItems='center' justifyContent='space-between'>
          <Heading>NBA Daily Fantasy Engine</Heading>
          <Box>
            <Select onChange={this.handleNetworkSelectChange} value={network}>
              {[Networks.FanDuel, Networks.DraftKings].map(HomePage.renderNetworkOption)}
            </Select>
          </Box>
        </Flex>
        <Divider />

        {stats.map(rows => {
          const {name, playerId} = rows[0]
          const dates = map(rows, 'date')
          const pointsPerMinutes = map(rows, 'fanduelPointsPerMinute')
          const pointsPerKDollars = map(rows, 'fanduelPointsPerKDollars')

          return (
            <Box key={playerId}>
              <Heading fontSize={4} mb={3}>{name}</Heading>
              <Flex flexWrap='no-wrap'>
                <Plot {...commonPlotProps}
                  data={[{
                    x: dates,
                    y: map(rows, `${columnPrefix}Salary`),
                    mode: 'markers',
                    type: 'scatter',
                  }]}
                  layout={{
                    title: 'Salary',
                    yaxis: {range: [0, maxSalary]},
                    ...commonPlotLayout,
                  }}
                />
                <Plot {...commonPlotProps}
                  data={[{
                    x: dates,
                    y: map(rows, `${columnPrefix}Points`),
                    mode: 'markers',
                    type: 'scatter',
                  }]}
                  layout={{
                    title: 'Points',
                    yaxis: {range: [0, maxPoints]},
                    ...commonPlotLayout,
                  }}
                />
                <Plot {...commonPlotProps}
                  data={[{
                    x: dates,
                    y: map(rows, `${columnPrefix}PointsPerMinute`),
                    mode: 'markers',
                    type: 'scatter',
                  }]}
                  layout={{
                    title: 'Points Per Minute',
                    yaxis: {range: [0, maxPointsPerMinute]},
                    ...commonPlotLayout,
                  }}
                />
                <Plot {...commonPlotProps}
                  data={[{
                    x: dates,
                    y: map(rows, `${columnPrefix}PointsPerKDollars`),
                    mode: 'markers',
                    type: 'scatter',
                  }]}
                  layout={{
                    title: 'Points Per $1k',
                    yaxis: {range: [0, maxPointsPerKDollars]},
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

  private handleNetworkSelectChange = e => {
    window.location.href = `/?network=${e.target.value}`
  }
}

export default HomePage