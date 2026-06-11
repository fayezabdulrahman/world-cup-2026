import { getPathSegments, proxyJson } from '../../server/proxy.js'

export const config = {
  maxDuration: 30,
}

const ESPN_BASE =
  'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world'
const ALLOWED_ENDPOINTS = new Set(['scoreboard', 'summary'])

export default async function handler(req, res) {
  const path = getPathSegments(req.query.path).join('/')

  if (!ALLOWED_ENDPOINTS.has(path)) {
    res.status(404).json({ error: 'Unknown ESPN endpoint.' })
    return
  }

  const query = new URLSearchParams()

  for (const [key, value] of Object.entries(req.query)) {
    if (key === 'path') continue
    if (Array.isArray(value)) {
      value.forEach((item) => query.append(key, item))
    } else if (value != null) {
      query.set(key, value)
    }
  }

  await proxyJson({
    cacheSeconds: 5,
    req,
    res,
    targetUrl: `${ESPN_BASE}/${path}?${query}`,
    timeoutMs: 10000,
  })
}
