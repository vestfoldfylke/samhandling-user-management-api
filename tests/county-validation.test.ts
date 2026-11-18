import assert from "node:assert";
import { afterEach, describe, it } from "node:test";

import { HttpRequest } from "@azure/functions";

import { countyValidation, getPartiallyMaskedKey } from "../src/lib/county-validation.js";
import { HTTPError } from "../src/lib/HTTPError.js";

const NUMBER_OF_VISIBLE_CHARS: number = 2;
const NUMBER_OF_VISIBLE_EDGE_CHARS: number = 5;
const HEADER_KEY: string = "X-County-Key";
const QUERY_KEY: string = "countyKey";
const VALID_KEY: string = "validKey";

type RequestOptions = {
  headers?: Record<string, string>;
  query?: Record<string, string>;
};

const createRequest = ({ headers = {}, query = {} }: RequestOptions = {}): HttpRequest =>
  new HttpRequest({ method: "GET", url: "http://localhost", headers, query });

const isHttpErrorWithStatus =
  (status: number) =>
  (error: unknown): boolean =>
    error instanceof HTTPError && error.status === status;

afterEach((): void => {
  delete process.env[VALID_KEY];
});

describe("countyValidation should throw an error when", (): void => {
  it("headerKey and queryKey are missing", (): void => {
    const request: HttpRequest = createRequest();

    assert.throws((): string[] => countyValidation(request), isHttpErrorWithStatus(401));
  });

  it("headerKey is found but is invalid", (): void => {
    const request: HttpRequest = createRequest({ headers: { [HEADER_KEY]: "invalidKey" } });

    assert.throws((): string[] => countyValidation(request), isHttpErrorWithStatus(401));
  });

  it("queryKey is found but is invalid", (): void => {
    const request: HttpRequest = createRequest({ query: { [QUERY_KEY]: "invalidKey" } });

    assert.throws((): string[] => countyValidation(request), isHttpErrorWithStatus(401));
  });

  it("headerKey is found and valid but specified mail is not in allowed upn suffixes", (): void => {
    const mail: string = " foo@bar.nO "; // intentionally using mixed case and spaces to test trimming and case insensitivity
    process.env[VALID_KEY] = "@biZ.no, @example.com"; // intentionally using mixed case and spaces to test trimming and case insensitivity
    const request: HttpRequest = createRequest({ headers: { [HEADER_KEY]: VALID_KEY } });

    assert.throws((): string[] => countyValidation(request, mail), isHttpErrorWithStatus(403));
  });

  it("queryKey is found and valid but specified mail is not in allowed upn suffixes", (): void => {
    const mail: string = " foo@bar.nO "; // intentionally using mixed case and spaces to test trimming and case insensitivity
    process.env[VALID_KEY] = "@biZ.no, @example.com"; // intentionally using mixed case and spaces to test trimming and case insensitivity
    const request: HttpRequest = createRequest({ query: { [QUERY_KEY]: VALID_KEY } });

    assert.throws((): string[] => countyValidation(request, mail), isHttpErrorWithStatus(403));
  });

  it("mail domain only ends with an allowed upn suffix without being that domain", (): void => {
    process.env[VALID_KEY] = "@bar.no";
    const request: HttpRequest = createRequest({ headers: { [HEADER_KEY]: VALID_KEY } });

    assert.throws((): string[] => countyValidation(request, "foo@evilbar.no"), isHttpErrorWithStatus(403));
  });

  it("mail domain only ends with an allowed upn suffix that is configured without a leading '@'", (): void => {
    process.env[VALID_KEY] = "bar.no";
    const request: HttpRequest = createRequest({ headers: { [HEADER_KEY]: VALID_KEY } });

    assert.throws((): string[] => countyValidation(request, "foo@evilbar.no"), isHttpErrorWithStatus(403));
  });

  it("allowed upn suffixes contain only a bare '@' entry", (): void => {
    process.env[VALID_KEY] = "@";
    const request: HttpRequest = createRequest({ headers: { [HEADER_KEY]: VALID_KEY } });

    assert.throws((): string[] => countyValidation(request, "foo@example.com"), isHttpErrorWithStatus(403));
  });

  it("allowed upn suffixes contain an empty entry and mail is not in the remaining suffixes", (): void => {
    process.env[VALID_KEY] = "@bar.no, ,";
    const request: HttpRequest = createRequest({ headers: { [HEADER_KEY]: VALID_KEY } });

    assert.throws((): string[] => countyValidation(request, "foo@example.com"), isHttpErrorWithStatus(403));
  });
});

describe("countyValidation should return allowed upn suffixes when", (): void => {
  it("headerKey is found and valid and mail is not specified", (): void => {
    process.env[VALID_KEY] = "@baR.nO, @example.com"; // intentionally using mixed case and spaces to test trimming and case insensitivity
    const request: HttpRequest = createRequest({ headers: { [HEADER_KEY]: VALID_KEY } });

    const allowedUpnSuffixes: string[] = countyValidation(request);

    assert.deepStrictEqual(allowedUpnSuffixes, ["@bar.no", "@example.com"]);
  });

  it("headerKey is found and valid and mail is specified and in allowed upn suffixes", (): void => {
    const mail: string = " foo@bar.nO "; // intentionally using mixed case and spaces to test trimming and case insensitivity
    process.env[VALID_KEY] = "@baR.no, @example.com"; // intentionally using mixed case and spaces to test trimming and case insensitivity
    const request: HttpRequest = createRequest({ headers: { [HEADER_KEY]: VALID_KEY } });

    const allowedUpnSuffixes: string[] = countyValidation(request, mail);

    assert.deepStrictEqual(allowedUpnSuffixes, ["@bar.no", "@example.com"]);
  });

  it("queryKey is found and valid and mail is not specified", (): void => {
    process.env[VALID_KEY] = " @example.com, @baR.no "; // intentionally using mixed case and spaces to test trimming and case insensitivity
    const request: HttpRequest = createRequest({ query: { [QUERY_KEY]: VALID_KEY } });

    const allowedUpnSuffixes: string[] = countyValidation(request);

    assert.deepStrictEqual(allowedUpnSuffixes, ["@example.com", "@bar.no"]);
  });

  it("queryKey is found and valid and mail is specified and in allowed upn suffixes", (): void => {
    const mail: string = " foo@bar.nO "; // intentionally using mixed case and spaces to test trimming and case insensitivity
    process.env[VALID_KEY] = " @example.com, @baR.no "; // intentionally using mixed case and spaces to test trimming and case insensitivity
    const request: HttpRequest = createRequest({ query: { [QUERY_KEY]: VALID_KEY } });

    const allowedUpnSuffixes: string[] = countyValidation(request, mail);

    assert.deepStrictEqual(allowedUpnSuffixes, ["@example.com", "@bar.no"]);
  });

  it("allowed upn suffixes contain empty entries, which are left out", (): void => {
    process.env[VALID_KEY] = "@bar.no, , @, @example.com,";
    const request: HttpRequest = createRequest({ headers: { [HEADER_KEY]: VALID_KEY } });

    const allowedUpnSuffixes: string[] = countyValidation(request);

    assert.deepStrictEqual(allowedUpnSuffixes, ["@bar.no", "@example.com"]);
  });

  it("allowed upn suffixes are configured without or with repeated leading '@', which are normalised to one '@'", (): void => {
    process.env[VALID_KEY] = "bar.no, @@example.com";
    const request: HttpRequest = createRequest({ headers: { [HEADER_KEY]: VALID_KEY } });

    const allowedUpnSuffixes: string[] = countyValidation(request, "foo@bar.no");

    assert.deepStrictEqual(allowedUpnSuffixes, ["@bar.no", "@example.com"]);
  });
});

describe("getPartiallyMaskedKey should return", (): void => {
  it("an empty string when an empty string is passed", (): void => {
    const maskedKey: string = getPartiallyMaskedKey("");

    assert.strictEqual(maskedKey, "");
  });

  it("'a' when a string with 1 'a' is passed", (): void => {
    const maskedKey: string = getPartiallyMaskedKey("a");

    assert.strictEqual(maskedKey, "a");
  });

  it("'aa' when a string with 2 a's is passed", (): void => {
    const maskedKey: string = getPartiallyMaskedKey("aa");

    assert.strictEqual(maskedKey, "aa");
  });

  for (let length = 3; length < 11; length++) {
    const expectedNumberOfAsterisks: number = length - NUMBER_OF_VISIBLE_CHARS;

    it(`${expectedNumberOfAsterisks} *'s followed by 2 a's when a string with ${length} characters is passed`, (): void => {
      const expectedMaskedKey: string = "*".repeat(expectedNumberOfAsterisks) + "a".repeat(NUMBER_OF_VISIBLE_CHARS);

      const maskedKey: string = getPartiallyMaskedKey("a".repeat(length));

      assert.strictEqual(maskedKey, expectedMaskedKey);
    });
  }

  for (let length = 11; length < 21; length++) {
    const expectedNumberOfAsterisks: number = length - NUMBER_OF_VISIBLE_EDGE_CHARS * 2;

    it(`5 a's, then ${expectedNumberOfAsterisks} *'s and then 5 a's when a string with ${length} characters is passed`, (): void => {
      const visibleEdge: string = "a".repeat(NUMBER_OF_VISIBLE_EDGE_CHARS);
      const expectedMaskedKey: string = visibleEdge + "*".repeat(expectedNumberOfAsterisks) + visibleEdge;

      const maskedKey: string = getPartiallyMaskedKey("a".repeat(length));

      assert.strictEqual(maskedKey, expectedMaskedKey);
    });
  }
});
