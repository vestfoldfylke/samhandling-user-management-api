import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions"
import { HTTPError } from "../lib/HTTPError"

import { countyValidation } from "../lib/county-validation"

export async function GroupMembers(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
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

  const message = `Will return group members matching specified domains for current security-key : [${allowedUpnSuffixes.join(', ')}]`
  context.log(message)

  return { body: message }
}

app.http('GroupMembers', {
  methods: ['GET'],
  authLevel: 'anonymous',
  handler: GroupMembers
})
