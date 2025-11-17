// This line is necessary to enable source map support for better error stack traces in Node.js
import "source-map-support/register.js";

import type { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

import { logger } from "@vtfk/logger";
import { HTTPError } from "../lib/HTTPError.js";

export async function errorHandling(
  request: HttpRequest,
  context: InvocationContext,
  next: (request: HttpRequest, context: InvocationContext) => Promise<HttpResponseInit>
): Promise<HttpResponseInit> {
  try {
    return await next(request, context);
  } catch (error) {
    if (error instanceof HTTPError) {
      if (error.data !== undefined) {
        logger("error", [request.method, request.url, error.status.toString(), error.message, error.data.toString(), error.stack], context).catch();
      } else {
        logger("error", [request.method, request.url, error.status.toString(), error.message, error.stack], context).catch();
      }

      return error.toResponse();
    }

    logger("error", [request.method, request.url, 400, error.message, error.stack], context).catch();

    return {
      status: 400,
      body: error.message
    };
  }
}
