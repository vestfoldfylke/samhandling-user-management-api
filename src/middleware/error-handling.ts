// This line is necessary to enable source map support for better error stack traces in Node.js
import "source-map-support/register.js";

import type { HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

import { type LogConfig, logger } from "@vestfoldfylke/loglady";

import { HTTPError } from "../lib/HTTPError.js";
import { runInContext } from "./async-local-storage.js";

export async function errorHandling(
  request: HttpRequest,
  context: InvocationContext,
  next: (request: HttpRequest, context: InvocationContext) => Promise<HttpResponseInit>
): Promise<HttpResponseInit> {
  const logContext: LogConfig = {
    contextId: context.invocationId
  };

  return await runInContext<HttpResponseInit>(logContext, async (): Promise<HttpResponseInit> => {
    try {
      return await next(request, context);
    } catch (error) {
      if (error instanceof HTTPError) {
        logger.errorException(
          error,
          "Error on {Method} to {Url} with status {Status}. Data: {@Data}",
          request.method,
          request.url,
          error.status,
          error.data
        );

        return error.toResponse();
      }

      logger.errorException(error, "Error on {Method} to {Url} with status {Status}", request.method, request.url, 400);

      return {
        status: 400,
        body: error.message
      };
    } finally {
      await logger.flush();
    }
  });
}
