import NextDocument, {Head, Main, NextScript} from 'next/document'
import {injectGlobal, ServerStyleSheet} from 'styled-components'

injectGlobal`
  * { font-family: 'IBM Plex Mono', monospace; }
  a { text-decoration: none }
`

interface Props {
  page: any,
  styleTags: any,
}

export default class Document extends NextDocument {
  props: Props

  static getInitialProps ({renderPage}): Props {
    const sheet = new ServerStyleSheet()
    const page = renderPage(App => props => sheet.collectStyles(<App {...props} />))
    const styleTags = sheet.getStyleElement()
    return {...page, styleTags}
  }

  render () {
    return (
      <html>
        <Head>
          <title>NBA Daily Fantasy Engine</title>
          <link href='https://fonts.googleapis.com/css?family=IBM+Plex+Mono' rel='stylesheet' />
          {this.props.styleTags}
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </html>
    )
  }
}