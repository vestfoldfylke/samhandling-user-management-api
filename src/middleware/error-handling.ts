import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { HTTPError } from "../lib/HTTPError";

export async function errorHandling(request: HttpRequest, context: InvocationContext, next: (request: HttpRequest, context: InvocationContext) => Promise<HttpResponseInit>): Promise<HttpResponseInit> {
  try {
    return await next(request, context)
  } catch (error) {
    if (error instanceof HTTPError) {
      return error.toResponse()
    }

    return {
      status: 401,
      body: error.message
    }
  }
}