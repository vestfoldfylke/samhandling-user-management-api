import type { HttpRequest } from "@azure/functions";

import { updateContext } from "../middleware/async-local-storage.js";
import { HTTPError } from "./HTTPError.js";

const headerKey: string = "X-County-Key";
const queryKey: string = "countyKey";

const getPartiallyMaskedKey = (key: string): string => {
  if (key.length > 10) {
    const middleLength: number = key.length - 10;
    return key.slice(0, 5) + "*".repeat(middleLength > 0 ? middleLength : 0) + key.slice(-5);
  }

  return key.replace(/.(?=.{2})/g, "*");
};

export function countyValidation(request: HttpRequest, mail: string = null): string[] {
  const securityValue: string | null = request.query.get(queryKey) || request.headers.get(headerKey);
  if (!securityValue) {
    throw new HTTPError(401, "Unauthorized: Missing security key in header or query string");
  }

  const allowedUpnSuffixString: string = process.env[securityValue];
  if (typeof allowedUpnSuffixString !== "string") {
    const partiallyMaskedKey: string = getPartiallyMaskedKey(securityValue);
    throw new HTTPError(401, "Unauthorized: Invalid security key in header or query string", `Partially masked key: ${partiallyMaskedKey}`);
  }

  const allowedUpnSuffixes: string[] = allowedUpnSuffixString.split(",").map((suffix: string) => suffix.trim().toLowerCase());
  const userMail: string = mail ? mail.trim().toLowerCase() : null;

  if (userMail && !allowedUpnSuffixes.some((suffix: string) => userMail.endsWith(suffix))) {
    const partiallyMaskedKey: string = getPartiallyMaskedKey(securityValue);
    throw new HTTPError(
      403,
      `Forbidden: User mail (${userMail}) does not match any of the allowed UPN suffixes: [${allowedUpnSuffixes.join(", ")}]`,
      `Partially masked key: ${partiallyMaskedKey}`
    );
  }

  updateContext({
    suffix: `Suffixes - [${allowedUpnSuffixes.join(", ")}]`
  });

  return allowedUpnSuffixes;
}
