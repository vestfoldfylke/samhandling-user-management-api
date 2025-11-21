import { type AuthenticationResult, ConfidentialClientApplication } from "@azure/msal-node";
import NodeCache from "node-cache";

import { config } from "../../config.js";
import { HTTPError } from "./HTTPError.js";

const cache = new NodeCache({ stdTTL: 3000 });

export async function getEntraIdToken(scope: string): Promise<string> {
  const cacheKey: string = scope;

  const cacheEntry: string = cache.get(cacheKey);
  if (cacheEntry) {
    return cacheEntry;
  }

  const configuration = {
    auth: {
      clientId: config.clientId,
      authority: `https://login.microsoftonline.com/${config.tenantId}/`,
      clientSecret: config.clientSecret
    }
  };

  // Create msal application object
  const cca = new ConfidentialClientApplication(configuration);
  const clientCredentials = {
    scopes: [scope]
  };

  const token: AuthenticationResult | null = await cca.acquireTokenByClientCredential(clientCredentials);
  if (!token) {
    throw new HTTPError(401, "Failed to acquire token with specified clientCredentials", JSON.stringify(clientCredentials));
  }

  const expires: number = Math.floor((token.expiresOn.getTime() - Date.now()) / 1000);
  cache.set(cacheKey, token.accessToken, expires);

  return token.accessToken;
}
