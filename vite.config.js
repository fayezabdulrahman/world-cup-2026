import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { getMergedGames } from './server/games.js'
import { getMatchOdds, getOddsForWindow } from './server/odds.js'

function localTournamentApi() {
  return {
    name: 'local-tournament-api',
    configureServer(server) {
      server.middlewares.use('/api/worldcup/get', async (req, res, next) => {
        const resource = req.url?.split('?')[0].split('/').filter(Boolean)[0]
        if (!['games', 'groups', 'stadiums', 'teams'].includes(resource)) {
          next()
          return
        }

        if (req.method !== 'GET') {
          res.statusCode = 405
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Method not allowed.' }))
          return
        }

        try {
          const payload = await getMergedGames()
          const responsePayload =
            resource === 'games'
              ? payload
              : { [resource]: payload[resource], updatedAt: payload.updatedAt }
          res.statusCode = 200
          res.setHeader(
            'Cache-Control',
            resource === 'games'
              ? 'no-store'
              : 'public, max-age=3600',
          )
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(responsePayload))
        } catch (error) {
          console.error('Local games request failed', error)
          res.statusCode = 502
          res.setHeader('Content-Type', 'application/json')
          res.end(
            JSON.stringify({
              error: 'The match data providers are temporarily unavailable.',
            }),
          )
        }
      })
    },
  }
}

function localOddsApi() {
  return {
    name: 'local-odds-api',
    configureServer(server) {
      server.middlewares.use('/api/odds/match', async (req, res) => {
        if (req.method !== 'GET') {
          res.statusCode = 405
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Method not allowed.' }))
          return
        }

        const requestUrl = new URL(req.url || '/', 'http://localhost')
        const home = requestUrl.searchParams.get('home')
        const away = requestUrl.searchParams.get('away')

        if (!home || !away) {
          res.statusCode = 400
          res.setHeader('Content-Type', 'application/json')
          res.end(
            JSON.stringify({
              error: 'Home and away team names are required.',
            }),
          )
          return
        }

        try {
          const payload = await getMatchOdds({
            away,
            commenceTime: requestUrl.searchParams.get('commenceTime'),
            home,
            isLive: requestUrl.searchParams.get('live') === 'true',
          })
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(
            JSON.stringify({
              ...payload,
              snapshotPhase:
                requestUrl.searchParams.get('phase') || 'prematch',
            }),
          )
        } catch (error) {
          console.error('Local odds request failed', error)
          res.statusCode = 502
          res.setHeader('Content-Type', 'application/json')
          res.end(
            JSON.stringify({
              error: 'The odds provider is temporarily unavailable.',
              odds: null,
            }),
          )
        }
      })
    },
  }
}

function localOddsDayApi() {
  return {
    name: 'local-odds-day-api',
    configureServer(server) {
      server.middlewares.use('/api/odds/day', async (req, res) => {
        const requestUrl = new URL(req.url || '/', 'http://localhost')
        const from = requestUrl.searchParams.get('from')
        const to = requestUrl.searchParams.get('to')

        if (!from || !to) {
          res.statusCode = 400
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'A valid odds window is required.' }))
          return
        }

        try {
          const payload = await getOddsForWindow({ from, to })
          res.statusCode = 200
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(payload))
        } catch (error) {
          console.error('Local matchday odds request failed', error)
          res.statusCode = 502
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ events: [] }))
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  globalThis.process.env.ODDS_API_KEY ||= env.ODDS_API_KEY

  return {
    plugins: [
      react(),
      localTournamentApi(),
      localOddsApi(),
      localOddsDayApi(),
    ],
    server: {
      proxy: {
        '/api/worldcup': {
          target: 'https://worldcup26.ir',
          changeOrigin: true,
          timeout: 60000,
          proxyTimeout: 60000,
          rewrite: (path) => path.replace(/^\/api\/worldcup/, ''),
        },
        '/api/sportsdb': {
          target: 'https://www.thesportsdb.com/api/v1/json/123',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/sportsdb/, ''),
        },
        '/api/espn': {
          target: 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/espn/, ''),
        },
      },
    },
  }
})
