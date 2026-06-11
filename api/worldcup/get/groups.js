import { proxyJson } from '../../../server/proxy.js'

export default async function handler(req, res) {
  await proxyJson({
    cacheSeconds: 3600,
    req,
    res,
    targetUrl: 'https://worldcup26.ir/get/groups',
  })
}
