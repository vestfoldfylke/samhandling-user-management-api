import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions"
import { HTTPError } from "../lib/HTTPError";

import { countyValidation } from "../lib/county-validation"

export async function GetGroupMembers(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  let allowedUpnSuffixes: string[];

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

  const message = `Will return group members where user principal name ends in one of [${allowedUpnSuffixes.join(', ')}]`
  context.log(message)

  return { body: message }
}

app.http('GetGroupMembers', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: GetGroupMembers
})
