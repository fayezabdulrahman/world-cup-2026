import { getMergedGames } from '../../../server/games.js'

export default async function handler(req, res) {
  try {
    const payload = await getMergedGames()
    res.setHeader(
      'Cache-Control',
      'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400, stale-if-error=604800',
    )
    res.status(200).json({ teams: payload.teams, updatedAt: payload.updatedAt })
  } catch (error) {
    console.error('Teams request failed', {
      message: error?.message,
      path: req.url,
    })
    res.status(502).json({ error: 'Team data is temporarily unavailable.' })
  }
}
