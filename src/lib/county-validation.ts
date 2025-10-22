import { HttpRequest, InvocationContext } from '@azure/functions'
import { logConfig } from '@vtfk/logger'

import { HTTPError } from './HTTPError.js'

const headerKey: string = 'X-County-Key'
const queryKey: string = 'countyKey'

const getPartiallyMaskedKey = (key: string): string => {
  if (key.length > 10) {
    const middleLength = key.length - 10
    return key.slice(0, 5) + '*'.repeat(middleLength > 0 ? middleLength : 0) + key.slice(-5)
  }

  return key.replace(/.(?=.{2})/g, '*')
}

export function countyValidation(request: HttpRequest, context: InvocationContext, mail: string = null): string[] {
  const securityValue: string = request.query.get(queryKey) || request.headers.get(headerKey)
  if (!securityValue) {
    context.error('Unauthorized: Missing security key in header or query string')
    throw new HTTPError(401, 'Unauthorized: Missing security key in header or query string')
  }

  const allowedUpnSuffixString: string = process.env[securityValue]
  if (typeof allowedUpnSuffixString !== 'string') {
    context.error(`Unauthorized: Invalid security key in header or query string. Partially masked key: ${getPartiallyMaskedKey(securityValue)}`)
    throw new HTTPError(401, 'Unauthorized: Invalid security key in header or query string', `Partially masked key: ${getPartiallyMaskedKey(securityValue)}`)
  }

  const allowedUpnSuffixes: string[] = allowedUpnSuffixString.split(',').map(suffix => suffix.trim().toLowerCase())
  const userMail = mail ? mail.trim().toLowerCase() : null

  if (userMail && !allowedUpnSuffixes.some(suffix => userMail.endsWith(suffix))) {
    context.error(`Forbidden: User mail (${userMail}) does not match any of the allowed UPN suffixes: [${allowedUpnSuffixes.join(', ')}]. Partially masked key: ${getPartiallyMaskedKey(securityValue)}`)
    throw new HTTPError(403, `Forbidden: User mail (${userMail}) does not match any of the allowed UPN suffixes: [${allowedUpnSuffixes.join(', ')}]`, `Partially masked key: ${getPartiallyMaskedKey(securityValue)}`)
  }

  logConfig({
    suffix: `Suffixes - [${allowedUpnSuffixes.join(', ')}]`
  })

  return allowedUpnSuffixes
}
