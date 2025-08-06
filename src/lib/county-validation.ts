import { HttpRequest, InvocationContext } from "@azure/functions"

import { HTTPError } from "./HTTPError"

const headerKey: string = 'X-County-Key'
const queryKey: string = 'countyKey'

export function countyValidation(request: HttpRequest, context: InvocationContext): string[] {
  const securityValue: string = request.query.get(queryKey) || request.headers.get(headerKey)
  if (!securityValue) {
    context.error('Unauthorized: Missing security key in header or query string')
    throw new HTTPError(401, 'Unauthorized: Missing security key in header or query string')
  }

  const allowedUpnSuffixString: string = process.env[securityValue]
  if (typeof allowedUpnSuffixString !== 'string') {
    context.error('Unauthorized: Invalid security key in header or query string')
    throw new HTTPError(401, 'Unauthorized: Invalid security key in header or query string')
  }

  return allowedUpnSuffixString.split(',')
}
