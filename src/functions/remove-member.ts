import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions"
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

  const response: number = await removeGroupMember(groupName, userMail)

  return { body: response.toString() }
}

app.deleteRequest('removeMember', {
  authLevel: 'anonymous',
  route: 'members/{groupName}/{userMail}',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => await errorHandling(request, context, removeMember)
})
