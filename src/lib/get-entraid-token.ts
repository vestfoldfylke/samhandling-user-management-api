import { ConfidentialClientApplication } from '@azure/msal-node'
import NodeCache = require('node-cache')
import { config } from '../../config'

const cache = new NodeCache({ stdTTL: 3000 })

export async function getEntraIdToken(scope: string, forceNew: boolean = false): Promise<string> {
  const cacheKey: string = scope

  const cacheEntry: string = cache.get(cacheKey)
  if (!forceNew && cacheEntry) {
    return cacheEntry
  }

  const configuration = {
    auth: {
      clientId: config.clientId,
      authority: `https://login.microsoftonline.com/${config.tenantId}/`,
      clientSecret: config.clientSecret,
    }
  }

  // Create msal application object
  const cca = new ConfidentialClientApplication(configuration)
  const clientCredentials = {
    scopes: [scope]
  }

  const token = await cca.acquireTokenByClientCredential(clientCredentials)
  const expires = Math.floor((token.expiresOn.getTime() - (new Date()).getTime()) / 1000)
  cache.set(cacheKey, token.accessToken, expires)

  return token.accessToken
}
