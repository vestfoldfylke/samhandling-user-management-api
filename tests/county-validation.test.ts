import { HttpRequest, InvocationContext } from "@azure/functions";

import { countyValidation } from '../src/lib/county-validation'

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

const mockContext: InvocationContext = {
  invocationId: '81549300',
  functionName: 'test',
  extraInputs: null,
  extraOutputs: null,
  log: console.log,
  trace: console.trace,
  debug: console.debug,
  info: console.info,
  warn: console.warn,
  error: console.error,
  options: null
}

describe('countyValidation', (): void => {
  test('should throw an error if headerKey and queryKey are missing', (): void => {
    expect(() => {
      countyValidation(mockRequest, mockContext)
    }).toThrow('Unauthorized: Missing security key in header or query string')
  })

  test('should throw an error if headerKey is found but is invalid', (): void => {
    const invalidHeaderKeyRequest: HttpRequest = {
      ...mockRequest,
      headers: new Headers({ 'X-County-Key': 'invalidKey' })
    }

    expect(() => {
      countyValidation(invalidHeaderKeyRequest, mockContext)
    }).toThrow('Unauthorized: Invalid security key in header or query string')
  })

  test('should throw an error if queryKey is found but is invalid', (): void => {
    const invalidQueryKeyRequest: HttpRequest = {
      ...mockRequest,
      query: new URLSearchParams({ 'countyKey': 'invalidKey' })
    }

    expect(() => {
      countyValidation(invalidQueryKeyRequest, mockContext)
    }).toThrow('Unauthorized: Invalid security key in header or query string')
  })
})
