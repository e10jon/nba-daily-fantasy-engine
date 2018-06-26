import {format as formatDate} from 'date-fns'
import * as addDays from 'date-fns/add_days'
import * as differenceInCalendarDays from 'date-fns/difference_in_calendar_days'
import * as ProgressBar from 'progress'
import * as scrapeIt from 'scrape-it'

import {getColumnPrefix, insertStatsRows} from './db'
import Networks from './networks'
import SEASONS from './seasons'

export interface Row {
  date: Date,
  didStart: boolean,
  playerId: number,  
  name: string, 
  minutes: number,
  draftkingsPosition: string, 
  fanduelPosition: string,
  fanduelPoints: number,
  draftkingsPoints: number, 
  fanduelPointsPerMinute: number,
  draftkingsPointsPerMinute: number, 
  fanduelSalary: number,
  draftkingsSalary: number,
  fanduelPointsPerKDollars: number,
  draftkingsPointsPerKDollars: number,
}

class Scraper {
  private static calculatePointsPerMinute = (points, minutes) => minutes ? points / minutes : 0
  private static calculatePointsPerKDollars = (points, salary) => salary ? points / salary * 1000 : 0

  private static convertId = raw => {
    const m = raw.match(/(\d+)?x$/)
    return m ? parseInt(m[1]) : undefined
  }

  private static convertDidStart = raw => raw && raw.endsWith('^')

  private static convertName = raw => raw.replace(/\^$/, '')

  private static convertMinutes = raw => {
    // may look like "12:50" or "DNP" or "N/A"
    const parts = raw.split(':')
    if (parts.length !== 2) return 0
    return parseInt(parts[0]) + (parseInt(parts[1]) / 60)
  }

  private static convertSalary = raw => parseInt(raw.slice(1).replace(/,/, ''))

  private static isValidScrapedRow = r => r.playerId 
    && (!isNaN(r.fanduelPoints) || !isNaN(r.draftkingsPoints)) 
    && (!isNaN(r.fanduelSalary) || !isNaN(r.draftkingsSalary))

  private static getAcronym = network => {
    switch (network) {
      case Networks.DraftKings: return 'dk'
      case Networks.FanDuel: return 'fd'
    }
  }

  private startDate: Date
  private endDate: Date

  public constructor (season: number) {
    const [startDate, endDate] = SEASONS[season]
    
    if (!startDate || !endDate) {
      throw new Error('invalid season')
    }

    this.startDate = startDate
    this.endDate = endDate
  }

  private scrape = async (url: string, opts?) => {
    try {
      const {data} = await scrapeIt(url, opts)
      return data
    } catch (err) {
      console.error(`Scrape error: ${err.message}`)
      return null
    }
  }

  public run = async () => {
    const startDate = addDays(this.startDate, 1)
    const endDate = addDays(this.endDate, 1)
    const season = this.startDate.getFullYear()
    const progressBar = new ProgressBar(':date [:bar] :percent :etas', {total: differenceInCalendarDays(endDate, startDate), width: 50})

    for (let date = startDate; date <= endDate; date = addDays(date, 1)) {
      const allRows = await Promise.all([Networks.FanDuel, Networks.DraftKings].map(async network => {
        const acronym = Scraper.getAcronym(network)
        const columnPrefix = getColumnPrefix(network)
        const url = `http://rotoguru1.com/cgi-bin/hyday.pl?game=${acronym}&mon=${date.getMonth() + 1}&day=${date.getDate()}&year=${date.getFullYear()}`

        const res: {rows?: Row[]} = await this.scrape(url, {
          rows: {
            listItem: 'tr',
            data: {
              playerId: {selector: 'td:nth-child(2) > a', attr: 'href', convert: Scraper.convertId},
              name: {selector: 'td', eq: 1, convert: Scraper.convertName},
              minutes: {selector: 'td', eq: 7, convert: Scraper.convertMinutes},
              didStart: {selector: 'td', eq: 1, convert: Scraper.convertDidStart},
              [`${columnPrefix}Position`]: {selector: 'td', eq: 0},
              [`${columnPrefix}Points`]: {selector: 'td', eq: 2, convert: parseFloat},
              [`${columnPrefix}Salary`]: {selector: 'td', eq: 3, convert: Scraper.convertSalary},
            }
          }
        })

        if (res && res.rows) {
          return res.rows.filter(Scraper.isValidScrapedRow)
        } else {
          console.error(`Error scraping ${url}`)
          return []
        }
      }))

      const rowsMap = allRows.reduce((map, rows) => {
        for (const row of rows) {
          if (row.fanduelPoints) {
            row.fanduelPointsPerMinute = Scraper.calculatePointsPerMinute(row.fanduelPoints, row.minutes)
            row.fanduelPointsPerKDollars = Scraper.calculatePointsPerKDollars(row.fanduelPoints, row.fanduelSalary)
          } else if (row.draftkingsPoints) {
            row.draftkingsPointsPerMinute = Scraper.calculatePointsPerMinute(row.draftkingsPoints, row.minutes)
            row.draftkingsPointsPerKDollars = Scraper.calculatePointsPerKDollars(row.draftkingsPoints, row.draftkingsSalary)
          }

          if (map.has(row.playerId)) {
            map.set(row.playerId, {...map.get(row.playerId), ...row})
          } else {
            map.set(row.playerId, {...row, date, season})
          }
        }
        return map
      }, new Map())

      const rows = Array.from(rowsMap.values())
      await insertStatsRows(rows)

      progressBar.tick({date: formatDate(date, 'YYYY-M-D')})
    }
  }
}

const year = parseInt(process.argv[2] || '2017')
const scraper = new Scraper(year)
scraper.run().then(() => process.exit())
