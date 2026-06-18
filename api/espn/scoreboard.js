import { proxyJson } from '../../server/proxy.js'

export default async function handler(req, res) {
  const query = new URLSearchParams()

  if (req.query.dates) query.set('dates', req.query.dates)

  await proxyJson({
    cacheSeconds: 2,
    req,
    res,
    staleIfErrorSeconds: 30,
    staleWhileRevalidateSeconds: 0,
    targetUrl: `https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?${query}`,
    timeoutMs: 10000,
  })
}
