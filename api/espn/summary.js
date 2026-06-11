import { proxyJson } from '../../server/proxy.js'

export default async function handler(req, res) {
  if (!req.query.event) {
    res.status(400).json({ error: 'An event id is required.' })
    return
  }

  const query = new URLSearchParams({ event: req.query.event })

  await proxyJson({
    cacheSeconds: 5,
    req,
    res,
    targetUrl: `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary?${query}`,
    timeoutMs: 10000,
  })
}
