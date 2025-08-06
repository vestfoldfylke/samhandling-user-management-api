import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions"
import { HTTPError } from "../lib/HTTPError"

import { countyValidation } from "../lib/county-validation"

export async function Members(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  const groupId: string = request.params.groupId
  if (!groupId) {
    return {
      status: 400,
      body: 'Bad Request: Missing groupId'
    }
  }

  let allowedUpnSuffixes: string[]
  try {
    allowedUpnSuffixes = countyValidation(request, context)
  } catch (error) {
    if (error instanceof HTTPError) {
      return error.toResponse()
    }

    return {
      status: 401,
      body: error.message
    }
  }

  const message = `Will return group members from ${groupId} matching specified domains for current security-key : [${allowedUpnSuffixes.join(', ')}]`
  context.log(message)

  return { body: message }
}

app.http('Members', {
  authLevel: 'anonymous',
  methods: ['GET'],
  route: 'members/{groupId}',
  handler: Members
})
