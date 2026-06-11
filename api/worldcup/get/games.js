import { proxyJson } from '../../../server/proxy.js'

export default async function handler(req, res) {
  await proxyJson({
    cacheSeconds: 5,
    req,
    res,
    targetUrl: 'https://worldcup26.ir/get/games',
  })
}
