import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from "@azure/functions";
import { logger } from "@vestfoldfylke/loglady";

import type { RemoveMemberRequest } from "../../types/api.types.js";

import { countyValidation } from "../lib/county-validation.js";
import { removeGroupMember } from "../lib/entra-functions.js";
import { HTTPError } from "../lib/HTTPError.js";
import { errorHandling } from "../middleware/error-handling.js";

export async function removeMember(request: HttpRequest, _: InvocationContext): Promise<HttpResponseInit> {
  const { groupName, mail } = request.params as RemoveMemberRequest;
  if (!groupName) {
    throw new HTTPError(400, "Bad Request: Missing parameter groupName");
  }

  if (!mail) {
    throw new HTTPError(400, "Bad Request: Missing parameter mail");
  }

  countyValidation(request, mail);

  const status: number = await removeGroupMember(groupName, mail);
  logger.info("EmailAdderss {EmailAddress} removed from GroupName '{GroupName}'", mail, groupName);

  return { status };
}

app.deleteRequest("removeMember", {
  authLevel: "function",
  route: "members/{groupName}/{mail}",
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => await errorHandling(request, context, removeMember)
});
