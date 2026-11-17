import assert from "node:assert";
import { describe, it } from "node:test";

import type { HttpRequest } from "@azure/functions";

import { countyValidation, getPartiallyMaskedKey } from "../src/lib/county-validation.js";

const NUMBER_OF_VISIBLE_CHARS: number = 2;

const mockRequest: HttpRequest = {
  method: "GET",
  url: "http://localhost",
  query: new URLSearchParams(),
  headers: new Headers({ "Content-Type": "application/json" }),
  text: async (): Promise<string> => "Hello World",
  json: async (): Promise<{ [key: string]: string }> => ({ Hello: "World" }),
  params: {},
  user: null,
  body: null,
  bodyUsed: false,
  arrayBuffer: null,
  blob: null,
  formData: null,
  clone: null
};

describe("countyValidation should throw an error when", (): void => {
  it("headerKey and queryKey are missing", (): void => {
    assert.throws((): string[] => countyValidation(mockRequest));
  });

  it("headerKey is found but is invalid", (): void => {
    const invalidHeaderKeyRequest: HttpRequest = {
      ...mockRequest,
      headers: new Headers({ "X-County-Key": "invalidKey" })
    };

    assert.throws((): string[] => countyValidation(invalidHeaderKeyRequest));
  });

  it("queryKey is found but is invalid", (): void => {
    const invalidQueryKeyRequest: HttpRequest = {
      ...mockRequest,
      query: new URLSearchParams({ countyKey: "invalidKey" })
    };

    assert.throws((): string[] => countyValidation(invalidQueryKeyRequest));
  });

  it("headerKey is found and valid but specified mail is not in allowed upn suffixes", (): void => {
    const key: string = "validKey";
    const mail: string = " foo@bar.nO "; // intentionally using mixed case and spaces to test trimming and case insensitivity
    process.env[key] = "biZ.no, example.com"; // intentionally using mixed case and spaces to test trimming and case insensitivity

    const validMockKeyRequest: HttpRequest = {
      ...mockRequest,
      headers: new Headers({ "X-County-Key": key })
    };

    assert.throws((): string[] => countyValidation(validMockKeyRequest, mail));
  });

  it("queryKey is found and valid but specified mail is not in allowed upn suffixes", (): void => {
    const key: string = "validKey";
    const mail: string = " foo@bar.nO "; // intentionally using mixed case and spaces to test trimming and case insensitivity
    process.env[key] = "biZ.no, example.com"; // intentionally using mixed case and spaces to test trimming and case insensitivity

    const validMockKeyRequest: HttpRequest = {
      ...mockRequest,
      query: new URLSearchParams({ countyKey: key })
    };

    assert.throws((): string[] => countyValidation(validMockKeyRequest, mail));
  });
});

describe("countyValidation should return allowed upn suffixes when", (): void => {
  it("headerKey is found and valid and mail is not specified", (): void => {
    const key: string = "validKey";
    process.env[key] = "baR.nO, example.com"; // intentionally using mixed case and spaces to test trimming and case insensitivity

    const validMockKeyRequest: HttpRequest = {
      ...mockRequest,
      headers: new Headers({ "X-County-Key": key })
    };

    const expectedSuffixes: string[] = countyValidation(validMockKeyRequest);
    assert.strictEqual(Array.isArray(expectedSuffixes), true);
    assert.deepStrictEqual(expectedSuffixes, ["bar.no", "example.com"]);
  });

  it("headerKey is found and valid and mail is specified and in allowed upn suffixes", (): void => {
    const key: string = "validKey";
    const mail: string = " foo@bar.nO "; // intentionally using mixed case and spaces to test trimming and case insensitivity
    process.env[key] = "baR.no, example.com"; // intentionally using mixed case and spaces to test trimming and case insensitivity

    const validMockKeyRequest: HttpRequest = {
      ...mockRequest,
      headers: new Headers({ "X-County-Key": key })
    };

    const expectedSuffixes: string[] = countyValidation(validMockKeyRequest, mail);
    assert.strictEqual(Array.isArray(expectedSuffixes), true);
    assert.deepStrictEqual(expectedSuffixes, ["bar.no", "example.com"]);
  });

  it("queryKey is found and valid and mail is not specified", (): void => {
    const key: string = "validKey";
    process.env[key] = " example.com, baR.no "; // intentionally using mixed case and spaces to test trimming and case insensitivity

    const validMockKeyRequest: HttpRequest = {
      ...mockRequest,
      query: new URLSearchParams({ countyKey: key })
    };

    const expectedSuffixes: string[] = countyValidation(validMockKeyRequest);
    assert.strictEqual(Array.isArray(expectedSuffixes), true);
    assert.deepStrictEqual(expectedSuffixes, ["example.com", "bar.no"]);
  });

  it("queryKey is found and valid and mail is specified and in allowed upn suffixes", (): void => {
    const key: string = "validKey";
    const mail: string = " foo@bar.nO "; // intentionally using mixed case and spaces to test trimming and case insensitivity
    process.env[key] = " example.com, baR.no "; // intentionally using mixed case and spaces to test trimming and case insensitivity

    const validMockKeyRequest: HttpRequest = {
      ...mockRequest,
      query: new URLSearchParams({ countyKey: key })
    };

    const expectedSuffixes: string[] = countyValidation(validMockKeyRequest, mail);
    assert.strictEqual(Array.isArray(expectedSuffixes), true);
    assert.deepStrictEqual(expectedSuffixes, ["example.com", "bar.no"]);
  });
});

describe("getPartiallyMaskedKey should return", () => {
  it("an empty string when an empty string is passed", () => {
    const maskedKey: string = getPartiallyMaskedKey("");

    assert.strictEqual(maskedKey, "", `Expected an empty string, got ${maskedKey}`);
  });

  it("'a' when a string with 1 'a' is passed", () => {
    const maskedKey: string = getPartiallyMaskedKey("a");

    assert.strictEqual(maskedKey, "a", `Expected a string with 1 'a', got ${maskedKey}`);
  });

  it("'aa' when a string with 2 a's is passed", () => {
    const maskedKey: string = getPartiallyMaskedKey("aa");

    assert.strictEqual(maskedKey, "aa", `Expected a string with 2 a's, got ${maskedKey}`);
  });

  for (let i = 3; i < 11; i++) {
    const expectedNumberOfAsterisks: number = i - NUMBER_OF_VISIBLE_CHARS;

    it(`a string with ${expectedNumberOfAsterisks} *'s when a string with ${i} characters passed`, () => {
      const maskedKey: string = getPartiallyMaskedKey("a".repeat(i));
      const chars: string[] = maskedKey.split("");

      const numberOfAs: number = chars.filter((char: string) => char === "a").length;
      const numberOfAsterisks: number = chars.filter((char: string) => char === "*").length;
      const expectedNumberOfAs: number = i - expectedNumberOfAsterisks;

      assert.ok(numberOfAs === expectedNumberOfAs, `Expected ${expectedNumberOfAs} number of a's, got ${numberOfAs}: ${maskedKey}`);
      assert.ok(
        numberOfAsterisks === expectedNumberOfAsterisks,
        `Expected ${expectedNumberOfAsterisks} number of *'s, got ${numberOfAsterisks}: ${maskedKey}`
      );
    });
  }

  for (let i = 11; i < 21; i++) {
    const expectedNumberOfAsterisks: number = i - 10;

    it(`a string with 5 a's, then ${expectedNumberOfAsterisks} *'s and then 5 a's, when a string with ${i} characters passed`, () => {
      const maskedKey: string = getPartiallyMaskedKey("a".repeat(i));
      const chars: string[] = maskedKey.split("");

      const numberOfAs: number = chars.filter((char: string) => char === "a").length;
      const numberOfAsterisks: number = chars.filter((char: string) => char === "*").length;
      const expectedNumberOfAs: number = i - expectedNumberOfAsterisks;

      assert.ok(numberOfAs === expectedNumberOfAs, `Expected ${expectedNumberOfAs} number of a's, got ${numberOfAs}: ${maskedKey}`);
      assert.ok(
        numberOfAsterisks === expectedNumberOfAsterisks,
        `Expected ${expectedNumberOfAsterisks} number of *'s, got ${numberOfAsterisks}: ${maskedKey}`
      );
    });
  }
});
