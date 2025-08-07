import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions"
import { errorHandling } from "../middleware/error-handling"
import { HTTPError } from "../lib/HTTPError"

import { countyValidation } from "../lib/county-validation"
import { addGroupMember } from "../lib/group-functions";

type AddMemberRequest = {
  displayName: string;
  mail: string;
}

export async function addMember(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const groupName: string = request.params.groupName
  if (!groupName) {
    throw new HTTPError(400, 'Bad Request: Missing groupName')
  }

  const { displayName, mail } = await request.json() as AddMemberRequest
  if (!displayName) {
    throw new HTTPError(400, 'Bad Request: Missing displayName')
  }

  if (!mail) {
    throw new HTTPError(400, 'Bad Request: Missing mail')
  }

  const allowedUpnSuffixes: string[] = countyValidation(request, context)
  if (!allowedUpnSuffixes.some(suffix => mail.endsWith(suffix))) {
    throw new HTTPError(403, `Forbidden: User mail does not match any of the allowed UPN suffixes: [${allowedUpnSuffixes.join(', ')}]`)
  }

  const status: number = await addGroupMember(groupName, mail, displayName)

  return { status }
}

app.post('addMember', {
  authLevel: 'anonymous',
  route: 'members/{groupName}',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => await errorHandling(request, context, addMember)
})
