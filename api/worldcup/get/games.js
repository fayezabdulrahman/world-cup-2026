import { getMergedGames } from '../../../server/games.js'

export default async function handler(req, res) {
  try {
    const payload = await getMergedGames()
    const hasLiveMatch = payload.games.some(
      (game) => String(game.time_elapsed).toLowerCase() === 'live',
    )
    const cacheControl = hasLiveMatch
      ? 'public, max-age=0, s-maxage=2, must-revalidate, stale-if-error=30'
      : 'public, max-age=5, s-maxage=10, stale-while-revalidate=30, stale-if-error=3600'
    const cdnCacheControl = hasLiveMatch
      ? 's-maxage=2, must-revalidate'
      : 's-maxage=10, stale-while-revalidate=30, stale-if-error=3600'

    res.setHeader('Cache-Control', cacheControl)
    res.setHeader('Vercel-CDN-Cache-Control', cdnCacheControl)
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
