import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { logger } from '@vtfk/logger'

import { RemoveMemberRequest } from '../../types/api.types.js'

import { errorHandling } from '../middleware/error-handling.js'
import { HTTPError } from '../lib/HTTPError.js'

import { countyValidation } from '../lib/county-validation.js'
import { removeGroupMember } from '../lib/entra-functions.js'

export async function removeMember(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const { groupName, mail } = request.params as RemoveMemberRequest
  if (!groupName) {
    throw new HTTPError(400, 'Bad Request: Missing parameter groupName')
  }

  if (!mail) {
    throw new HTTPError(400, 'Bad Request: Missing parameter mail')
  }

  countyValidation(request, context, mail)

  const status: number = await removeGroupMember(groupName, mail)
  logger('info', [`${mail} removed from group '${groupName}'`], context)

  return { status }
}

app.deleteRequest('removeMember', {
  authLevel: 'function',
  route: 'members/{groupName}/{mail}',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => await errorHandling(request, context, removeMember)
})
