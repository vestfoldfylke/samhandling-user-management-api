import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { logger } from '@vtfk/logger'
import { errorHandling } from '../middleware/error-handling'
import { HTTPError } from '../lib/HTTPError'

import { countyValidation } from '../lib/county-validation'
import { removeGroupMember } from '../lib/entra-functions'

type RemoveMemberRequest = {
  groupName: string
  mail: string
}

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
