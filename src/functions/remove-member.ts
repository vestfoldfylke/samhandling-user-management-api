import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions"
import { logger } from "@vtfk/logger"
import { errorHandling } from "../middleware/error-handling"
import { HTTPError } from "../lib/HTTPError"

import { countyValidation } from "../lib/county-validation"
import { removeGroupMember } from "../lib/group-functions";

export async function removeMember(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const groupName: string = request.params.groupName
  if (!groupName) {
    throw new HTTPError(400, 'Bad Request: Missing groupName')
  }

  const userMail: string = request.params.userMail
  if (!userMail) {
    throw new HTTPError(400, 'Bad Request: Missing userMail')
  }

  const allowedUpnSuffixes: string[] = countyValidation(request, context)
  if (!allowedUpnSuffixes.some(suffix => userMail.endsWith(suffix))) {
    throw new HTTPError(403, `Forbidden: User mail does not match any of the allowed UPN suffixes: [${allowedUpnSuffixes.join(', ')}]`)
  }

  const status: number = await removeGroupMember(groupName, userMail)
  logger('info', [`${userMail} removed from ${groupName}`, 'Suffixes', `[${allowedUpnSuffixes.join(',')}]`], context)

  return { status }
}

app.deleteRequest('removeMember', {
  authLevel: 'anonymous',
  route: 'members/{groupName}/{userMail}',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => await errorHandling(request, context, removeMember)
})
