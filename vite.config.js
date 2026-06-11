import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/worldcup': {
        target: 'https://worldcup26.ir',
        changeOrigin: true,
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
