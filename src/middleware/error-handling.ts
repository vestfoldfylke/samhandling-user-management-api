import { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { logger } from "@vtfk/logger"
import { HTTPError } from "../lib/HTTPError";

export async function errorHandling(request: HttpRequest, context: InvocationContext, next: (request: HttpRequest, context: InvocationContext) => Promise<HttpResponseInit>): Promise<HttpResponseInit> {
  try {
    return await next(request, context)
  } catch (error) {
    if (error instanceof HTTPError) {
      logger('error', [request.method, request.url, error.status.toString(), error.message], context)
      return error.toResponse()
    }

    logger('error', [request.method, request.url, 400, error.message, error.stack], context)
    return {
      status: 400,
      body: error.message
    }
  }
}
