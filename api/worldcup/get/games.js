import { getMergedGames } from '../../../server/games.js'

export default async function handler(req, res) {
  try {
    const payload = await getMergedGames()

    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate')
    res.setHeader('Vercel-CDN-Cache-Control', 's-maxage=5, stale-if-error=300')
    res.status(200).json(payload)
  } catch (error) {
    console.error('Games request failed', {
      message: error?.message,
      path: req.url,
    })
    res.status(502).json({
      error: 'The match data providers are temporarily unavailable.',
    })
  }
}
