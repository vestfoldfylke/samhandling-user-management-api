import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { logger } from '@vtfk/logger'

import { AddMemberRequest } from '../../types/api.types.js'

import { errorHandling } from '../middleware/error-handling.js'
import { HTTPError } from '../lib/HTTPError.js'

import { countyValidation } from '../lib/county-validation.js'
import { addGroupMember } from '../lib/entra-functions.js'

export async function addMember(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const groupName: string = request.params.groupName
  if (!groupName) {
    throw new HTTPError(400, 'Bad Request: Missing groupName')
  }

  const { displayName, mail } = await request.json() as AddMemberRequest
  if (!displayName) {
    throw new HTTPError(400, 'Bad Request: Missing displayName in request body')
  }

  if (!mail) {
    throw new HTTPError(400, 'Bad Request: Missing mail in request body')
  }

  countyValidation(request, context, mail)

  const status: number = await addGroupMember(groupName, mail, displayName, context)
  logger('info', [`${mail} added to group '${groupName}'`], context)

  return { status }
}

app.post('addMember', {
  authLevel: 'function',
  route: 'members/{groupName}',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => await errorHandling(request, context, addMember)
})
