import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions"
import { errorHandling } from "../middleware/error-handling"
import { HTTPError } from "../lib/HTTPError"

import { countyValidation } from "../lib/county-validation"
import { addGroupMember } from "../lib/group-functions";

export async function addMember(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const groupName: string = request.params.groupName
  if (!groupName) {
    throw new HTTPError(400, 'Bad Request: Missing groupName')
  }

  const userMail: string = request.params.userMail
  if (!userMail) {
    throw new HTTPError(400, 'Bad Request: Missing userMail')
  }

  const allowedUpnSuffixes: string[] = countyValidation(request, context)

  const response: number = await addGroupMember(groupName, userMail)

  return { body: response.toString() }
}

app.post('addMember', {
  authLevel: 'anonymous',
  route: 'members/{groupName}/{userMail}',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => await errorHandling(request, context, addMember)
})
