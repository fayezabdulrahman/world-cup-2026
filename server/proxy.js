const DEFAULT_TIMEOUT_MS = 25000

function sleep(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds)
  })
}

export async function proxyJson({
  cacheSeconds,
  req,
  res,
  staleIfErrorSeconds = 86400,
  staleWhileRevalidateSeconds = 86400,
  targetUrl,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}) {
  let lastError

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(targetUrl, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'world-cup-2026-dashboard/1.0',
        },
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`Upstream returned ${response.status}`)
      }

      const payload = await response.json()

      const cacheDirectives = [`public`, `s-maxage=${cacheSeconds}`]
      const cdnCacheDirectives = [`s-maxage=${cacheSeconds}`]

      if (staleWhileRevalidateSeconds > 0) {
        const directive = `stale-while-revalidate=${staleWhileRevalidateSeconds}`
        cacheDirectives.push(directive)
        cdnCacheDirectives.push(directive)
      }
      if (staleIfErrorSeconds > 0) {
        cacheDirectives.push(`stale-if-error=${staleIfErrorSeconds}`)
      }

      res.setHeader('Cache-Control', cacheDirectives.join(', '))
      res.setHeader('Vercel-CDN-Cache-Control', cdnCacheDirectives.join(', '))
      res.status(200).json(payload)
      return
    } catch (error) {
      lastError = error
      if (attempt === 0) await sleep(350)
    } finally {
      clearTimeout(timeout)
    }
  }

  console.error('Proxy request failed', {
    message: lastError?.message,
    path: req.url,
    targetUrl,
  })
  res.status(502).json({
    error: 'The upstream data provider is temporarily unavailable.',
  })
}

export function getPathSegments(value) {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') return value.split('/').filter(Boolean)
  return []
}
