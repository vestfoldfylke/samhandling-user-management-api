import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from "@azure/functions";
import type { User } from "@microsoft/microsoft-graph-types";
import { logger } from "@vestfoldfylke/loglady";

import { countyValidation } from "../lib/county-validation.js";
import { listGroupMembers } from "../lib/entra-functions.js";
import { HTTPError } from "../lib/HTTPError.js";
import { errorHandling } from "../middleware/error-handling.js";

export async function members(request: HttpRequest, _: InvocationContext): Promise<HttpResponseInit> {
  const groupName: string = request.params.groupName;
  if (!groupName) {
    throw new HTTPError(400, "Bad Request: Missing groupName");
  }

  const allowedUpnSuffixes: string[] = countyValidation(request);

  const members: User[] = await listGroupMembers(groupName, allowedUpnSuffixes);
  logger.info("Found {MembersCount} members in GroupName '{GroupName}'", members.length, groupName);

  return { jsonBody: members };
}

app.get("members", {
  authLevel: "function",
  route: "members/{groupName}",
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => await errorHandling(request, context, members)
});
