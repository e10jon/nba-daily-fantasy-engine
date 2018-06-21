import {format as formatDate} from 'date-fns'
import * as addDays from 'date-fns/add_days'
import * as differenceInCalendarDays from 'date-fns/difference_in_calendar_days'
import * as ProgressBar from 'progress'
import * as scrapeIt from 'scrape-it'

import knex from './knex'

interface Row {
  date: Date,
  playerId: number, 
  position: string, 
  name: string, 
  fanduelPoints?: number,
  draftkingsPoints?: number, 
  fanduelSalary?: number,
  draftkingsSalary?: number,
}

class Scraper {
  private static NETWORK_ACRONYMS = ['dk', 'fd']
  private static SEASONS = {
    2017: [new Date('2017-10-17'), new Date('2018-06-08')],
  }

  private static convertId = raw => {
    const m = raw.match(/(\d+)?x$/)
    return m ? parseInt(m[1]) : undefined
  }

  private static convertName = raw => raw.replace(/\^$/, '')

  private static isValidScrapedRow = r => r.playerId && (!isNaN(r.fanduelPoints) || !isNaN(r.draftkingsPoints)) && (!isNaN(r.fanduelSalary) || !isNaN(r.draftkingsSalary))

  private static getPointsKey = acronym => {
    switch (acronym) {
      case 'dk': return 'draftkingsPoints'
      case 'fd': return 'fanduelPoints'
    }
  }

  private static getSalaryKey = acronym => {
    switch (acronym) {
      case 'dk': return 'draftkingsSalary'
      case 'fd': return 'fanduelSalary'
    }
  }

  private startDate: Date
  private endDate: Date

  public constructor (season: number) {
    const {startDate, endDate} = Scraper.SEASONS[season]
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
      const allRows = await Promise.all(Scraper.NETWORK_ACRONYMS.map(async acronym => {
        const url = `http://rotoguru1.com/cgi-bin/hyday.pl?game=${acronym}&mon=${date.getMonth() + 1}&day=${date.getDate()}&year=${date.getFullYear()}`
        const pointsKey = Scraper.getPointsKey(acronym)
        const salaryKey = Scraper.getSalaryKey(acronym)
        const res: {rows?: Row[]} = await this.scrape(url, {
          rows: {
            listItem: 'tr',
            data: {
              playerId: {selector: 'td:nth-child(2) > a', attr: 'href', convert: Scraper.convertId},
              position: {selector: 'td', eq: 0},
              name: {selector: 'td', eq: 1, convert: Scraper.convertName},
              [pointsKey]: {selector: 'td', eq: 2, convert: x => parseFloat(x)},
              [salaryKey]: {selector: 'td', eq: 3, convert: x => parseInt(x.slice(1).replace(/,/, ''))},
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

      const rows = allRows.reduce((map, rows) => {
        for (const row of rows) {
          if (map.has(row.playerId)) {
            map.set(row.playerId, {...map.get(row.playerId), ...row})
          } else {
            map.set(row.playerId, {...row, date, season})
          }
        }
        return map
      }, new Map())

      for (const [playerId, row] of rows) {
        await knex('stats').insert(row)
      }

      progressBar.tick({date: formatDate(date, 'YYYY-M-D')})
    }
  }
}

const scraper = new Scraper(2017)
scraper.run().then(() => process.exit())
