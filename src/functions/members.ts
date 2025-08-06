import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions"
import { errorHandling } from "../middleware/error-handling"
import { HTTPError } from "../lib/HTTPError"

import { countyValidation } from "../lib/county-validation"

export async function members(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const groupId: string = request.params.groupId
  if (!groupId) {
    throw new HTTPError(400, 'Bad Request: Missing groupId')
  }

  const allowedUpnSuffixes: string[] = countyValidation(request, context)

  const message = `Will return group members from ${groupId} matching specified domains for current security-key : [${allowedUpnSuffixes.join(', ')}]`
  context.log(message)

  return { body: message }
}

app.get('members', {
  authLevel: 'anonymous',
  route: 'members/{groupId}',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => await errorHandling(request, context, members)
})
