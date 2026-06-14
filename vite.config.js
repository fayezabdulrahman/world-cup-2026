import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { getMergedGames } from './server/games.js'

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
            resource === 'games' ? 'public, max-age=5' : 'public, max-age=3600',
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

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), localTournamentApi()],
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
})
