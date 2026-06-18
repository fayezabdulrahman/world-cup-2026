import { getOddsForWindow } from '../../server/odds.js'

export default async function handler(req, res) {
  const { from, to } = req.query

  if (
    !from ||
    !to ||
    !Number.isFinite(Date.parse(from)) ||
    !Number.isFinite(Date.parse(to))
  ) {
    res.status(400).json({ error: 'A valid odds window is required.' })
    return
  }

  try {
    const payload = await getOddsForWindow({ from, to })
    res.setHeader(
      'Cache-Control',
      'public, s-maxage=604800, stale-while-revalidate=1209600',
    )
    res.status(200).json(payload)
  } catch (error) {
    console.error('Matchday odds request failed', error)
    res.status(502).json({
      error: 'The odds provider is temporarily unavailable.',
      events: [],
    })
  }
}
