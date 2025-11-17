import assert from 'node:assert'
import { describe, it } from 'node:test'
import { HttpRequest, InvocationContext } from '@azure/functions'

import { countyValidation } from '../src/lib/county-validation.js'

const mockRequest: HttpRequest = {
  method: 'GET',
  url: 'http://localhost',
  query: new URLSearchParams(),
  headers: new Headers({ 'Content-Type': 'application/json' }),
  text: async (): Promise<string> => 'Hello World',
  json: async (): Promise<{ [key: string]: string }> => ({ 'Hello': 'World' }),
  params: {},
  user: null,
  body: null,
  bodyUsed: false,
  arrayBuffer: null,
  blob: null,
  formData: null,
  clone: null
}

const mockConsoleFunc: (...args: string[]) => void = (...args: string[]): void => { const _: string[] = args }

const mockContext: InvocationContext = {
  invocationId: '81549300',
  functionName: 'test',
  extraInputs: null,
  extraOutputs: null,
  log: mockConsoleFunc,
  trace: mockConsoleFunc,
  debug: mockConsoleFunc,
  info: mockConsoleFunc,
  warn: mockConsoleFunc,
  error: mockConsoleFunc,
  options: null
}

describe('countyValidation should throw an error when', (): void => {
  it('headerKey and queryKey are missing', (): void => {
    assert.throws((): string[] => countyValidation(mockRequest, mockContext))
  })

  it('headerKey is found but is invalid', (): void => {
    const invalidHeaderKeyRequest: HttpRequest = {
      ...mockRequest,
      headers: new Headers({ 'X-County-Key': 'invalidKey' })
    }

    assert.throws((): string[] => countyValidation(invalidHeaderKeyRequest, mockContext))
  })

  it('queryKey is found but is invalid', (): void => {
    const invalidQueryKeyRequest: HttpRequest = {
      ...mockRequest,
      query: new URLSearchParams({ 'countyKey': 'invalidKey' })
    }

    assert.throws((): string[] => countyValidation(invalidQueryKeyRequest, mockContext))
  })

  it('headerKey is found and valid but specified mail is not in allowed upn suffixes', (): void => {
    const key: string = 'validKey'
    const mail: string = ' foo@bar.nO ' // intentionally using mixed case and spaces to test trimming and case insensitivity
    process.env[key] = 'biZ.no, example.com' // intentionally using mixed case and spaces to test trimming and case insensitivity

    const validMockKeyRequest: HttpRequest = {
      ...mockRequest,
      headers: new Headers({ 'X-County-Key': key })
    }

    assert.throws((): string[] => countyValidation(validMockKeyRequest, mockContext, mail))
  })

  it('queryKey is found and valid but specified mail is not in allowed upn suffixes', (): void => {
    const key: string = 'validKey'
    const mail: string = ' foo@bar.nO ' // intentionally using mixed case and spaces to test trimming and case insensitivity
    process.env[key] = 'biZ.no, example.com' // intentionally using mixed case and spaces to test trimming and case insensitivity

    const validMockKeyRequest: HttpRequest = {
      ...mockRequest,
      query: new URLSearchParams({ 'countyKey': key })
    }

    assert.throws((): string[] => countyValidation(validMockKeyRequest, mockContext, mail))
  })
})

describe('countyValidation should return allowed upn suffixes when', (): void => {
  it('headerKey is found and valid and mail is not specified', (): void => {
    const key: string = 'validKey'
    process.env[key] = 'baR.nO, example.com' // intentionally using mixed case and spaces to test trimming and case insensitivity

    const validMockKeyRequest: HttpRequest = {
      ...mockRequest,
      headers: new Headers({ 'X-County-Key': key })
    }

    const expectedSuffixes: string[] = countyValidation(validMockKeyRequest, mockContext)
    assert.strictEqual(Array.isArray(expectedSuffixes), true)
    assert.deepStrictEqual(expectedSuffixes, ['bar.no', 'example.com'])
  })

  it('headerKey is found and valid and mail is specified and in allowed upn suffixes', (): void => {
    const key: string = 'validKey'
    const mail: string = ' foo@bar.nO ' // intentionally using mixed case and spaces to test trimming and case insensitivity
    process.env[key] = 'baR.no, example.com' // intentionally using mixed case and spaces to test trimming and case insensitivity

    const validMockKeyRequest: HttpRequest = {
      ...mockRequest,
      headers: new Headers({ 'X-County-Key': key })
    }

    const expectedSuffixes: string[] = countyValidation(validMockKeyRequest, mockContext, mail)
    assert.strictEqual(Array.isArray(expectedSuffixes), true)
    assert.deepStrictEqual(expectedSuffixes, ['bar.no', 'example.com'])
  })

  it('queryKey is found and valid and mail is not specified', (): void => {
    const key: string = 'validKey'
    process.env[key] = ' example.com, baR.no ' // intentionally using mixed case and spaces to test trimming and case insensitivity

    const validMockKeyRequest: HttpRequest = {
      ...mockRequest,
      query: new URLSearchParams({ 'countyKey': key })
    }

    const expectedSuffixes: string[] = countyValidation(validMockKeyRequest, mockContext)
    assert.strictEqual(Array.isArray(expectedSuffixes), true)
    assert.deepStrictEqual(expectedSuffixes, ['example.com', 'bar.no'])
  })

  it('queryKey is found and valid and mail is specified and in allowed upn suffixes', (): void => {
    const key: string = 'validKey'
    const mail: string = ' foo@bar.nO ' // intentionally using mixed case and spaces to test trimming and case insensitivity
    process.env[key] = ' example.com, baR.no ' // intentionally using mixed case and spaces to test trimming and case insensitivity

    const validMockKeyRequest: HttpRequest = {
      ...mockRequest,
      query: new URLSearchParams({ 'countyKey': key })
    }

    const expectedSuffixes: string[] = countyValidation(validMockKeyRequest, mockContext, mail)
    assert.strictEqual(Array.isArray(expectedSuffixes), true)
    assert.deepStrictEqual(expectedSuffixes, ['example.com', 'bar.no'])
  })
})
