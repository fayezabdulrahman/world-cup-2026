import { getPathSegments, proxyJson } from '../../server/proxy.js'

export const config = {
  maxDuration: 60,
}

const ALLOWED_ENDPOINTS = new Set([
  'get/games',
  'get/groups',
  'get/stadiums',
  'get/teams',
])

export default async function handler(req, res) {
  const path = getPathSegments(req.query.path).join('/')

  if (!ALLOWED_ENDPOINTS.has(path)) {
    res.status(404).json({ error: 'Unknown World Cup endpoint.' })
    return
  }

  await proxyJson({
    cacheSeconds: path === 'get/games' ? 5 : 3600,
    req,
    res,
    targetUrl: `https://worldcup26.ir/${path}`,
  })
}
