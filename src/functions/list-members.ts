import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { logger } from '@vtfk/logger'
import { errorHandling } from '../middleware/error-handling.js'
import { HTTPError } from '../lib/HTTPError.js'

import { countyValidation } from '../lib/county-validation.js'
import { listGroupMembers } from '../lib/entra-functions.js'

export async function members(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const groupName: string = request.params.groupName
  if (!groupName) {
    throw new HTTPError(400, 'Bad Request: Missing groupName')
  }

  const allowedUpnSuffixes: string[] = countyValidation(request, context)

  const members: string[] = await listGroupMembers(groupName, allowedUpnSuffixes)
  logger('info', [`Found ${members.length} members in group '${groupName}'`], context)

  return { jsonBody: members }
}

app.get('members', {
  authLevel: 'function',
  route: 'members/{groupName}',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => await errorHandling(request, context, members)
})
