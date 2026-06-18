import { getMatchOdds } from '../../server/odds.js'

export default async function handler(req, res) {
  const { away, commenceTime, home, live, phase } = req.query

  if (!home || !away) {
    res.status(400).json({ error: 'Home and away team names are required.' })
    return
  }

  const isLive = live === 'true'

  try {
    const payload = await getMatchOdds({
      away,
      commenceTime,
      home,
      isLive,
    })

    res.setHeader(
      'Cache-Control',
      isLive
        ? 'public, s-maxage=21600, stale-while-revalidate=86400'
        : 'public, s-maxage=604800, stale-while-revalidate=1209600',
    )
    res.status(200).json({
      ...payload,
      snapshotPhase: isLive ? phase || 'kickoff' : 'prematch',
    })
  } catch (error) {
    console.error('Odds request failed', error)
    res.status(502).json({
      error: 'The odds provider is temporarily unavailable.',
      odds: null,
    })
  }
}
