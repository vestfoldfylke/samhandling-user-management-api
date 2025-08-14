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
  test('headerKey and queryKey are missing', (): void => {
    expect((): void => {
      countyValidation(mockRequest, mockContext)
    }).toThrow('Unauthorized: Missing security key in header or query string')
  })

  test('headerKey is found but is invalid', (): void => {
    const invalidHeaderKeyRequest: HttpRequest = {
      ...mockRequest,
      headers: new Headers({ 'X-County-Key': 'invalidKey' })
    }

    expect((): void => {
      countyValidation(invalidHeaderKeyRequest, mockContext)
    }).toThrow('Unauthorized: Invalid security key in header or query string')
  })

  test('queryKey is found but is invalid', (): void => {
    const invalidQueryKeyRequest: HttpRequest = {
      ...mockRequest,
      query: new URLSearchParams({ 'countyKey': 'invalidKey' })
    }

    expect((): void => {
      countyValidation(invalidQueryKeyRequest, mockContext)
    }).toThrow('Unauthorized: Invalid security key in header or query string')
  })

  test('headerKey is found and valid but specified mail is not in allowed upn suffixes', (): void => {
    const key: string = 'validKey'
    const mail: string = ' foo@bar.nO ' // intentionally using mixed case and spaces to test trimming and case insensitivity
    const expectedMail: string = mail.trim().toLowerCase()
    const allowedUpnSuffixes: string = 'biZ.no, example.com' // intentionally using mixed case and spaces to test trimming and case insensitivity
    const expectedSuffixes: string[] = allowedUpnSuffixes.split(',').map(suffix => suffix.trim().toLowerCase())
    process.env[key] = allowedUpnSuffixes

    const validMockKeyRequest: HttpRequest = {
      ...mockRequest,
      headers: new Headers({ 'X-County-Key': key })
    }

    expect((): void => {
      countyValidation(validMockKeyRequest, mockContext, mail)
    }).toThrow(`Forbidden: User mail (${expectedMail}) does not match any of the allowed UPN suffixes: [${expectedSuffixes.join(', ')}]`)
  })

  test('queryKey is found and valid but specified mail is not in allowed upn suffixes', (): void => {
    const key: string = 'validKey'
    const mail: string = ' foo@bar.nO ' // intentionally using mixed case and spaces to test trimming and case insensitivity
    const expectedMail: string = mail.trim().toLowerCase()
    const allowedUpnSuffixes: string = 'biZ.no, example.com' // intentionally using mixed case and spaces to test trimming and case insensitivity
    const expectedSuffixes: string[] = allowedUpnSuffixes.split(',').map(suffix => suffix.trim().toLowerCase())
    process.env[key] = allowedUpnSuffixes

    const validMockKeyRequest: HttpRequest = {
      ...mockRequest,
      query: new URLSearchParams({ 'countyKey': key })
    }

    expect((): void => {
      countyValidation(validMockKeyRequest, mockContext, mail)
    }).toThrow(`Forbidden: User mail (${expectedMail}) does not match any of the allowed UPN suffixes: [${expectedSuffixes.join(', ')}]`)
  })
})

describe('countyValidation should return allowed upn suffixes when', (): void => {
  test('headerKey is found and valid and mail is not specified', (): void => {
    const key: string = 'validKey'
    process.env[key] = 'baR.nO, example.com' // intentionally using mixed case and spaces to test trimming and case insensitivity

    const validMockKeyRequest: HttpRequest = {
      ...mockRequest,
      headers: new Headers({ 'X-County-Key': key })
    }

    const expectedSuffixes: string[] = countyValidation(validMockKeyRequest, mockContext)
    expect(Array.isArray(expectedSuffixes)).toBeTruthy()
    expect(expectedSuffixes).toEqual(['bar.no', 'example.com'])
  })

  test('headerKey is found and valid and mail is specified and in allowed upn suffixes', (): void => {
    const key: string = 'validKey'
    const mail: string = ' foo@bar.nO ' // intentionally using mixed case and spaces to test trimming and case insensitivity
    process.env[key] = 'baR.no, example.com' // intentionally using mixed case and spaces to test trimming and case insensitivity

    const validMockKeyRequest: HttpRequest = {
      ...mockRequest,
      headers: new Headers({ 'X-County-Key': key })
    }

    const expectedSuffixes: string[] = countyValidation(validMockKeyRequest, mockContext, mail)
    expect(Array.isArray(expectedSuffixes)).toBeTruthy()
    expect(expectedSuffixes).toEqual(['bar.no', 'example.com'])
  })

  test('queryKey is found and valid and mail is not specified', (): void => {
    const key: string = 'validKey'
    process.env[key] = ' example.com, baR.no ' // intentionally using mixed case and spaces to test trimming and case insensitivity

    const validMockKeyRequest: HttpRequest = {
      ...mockRequest,
      query: new URLSearchParams({ 'countyKey': key })
    }

    const expectedSuffixes: string[] = countyValidation(validMockKeyRequest, mockContext)
    expect(Array.isArray(expectedSuffixes)).toBeTruthy()
    expect(expectedSuffixes).toEqual(['example.com', 'bar.no'])
  })
  
  test('queryKey is found and valid and mail is specified and in allowed upn suffixes', (): void => {
    const key: string = 'validKey'
    const mail: string = ' foo@bar.nO ' // intentionally using mixed case and spaces to test trimming and case insensitivity
    process.env[key] = ' example.com, baR.no ' // intentionally using mixed case and spaces to test trimming and case insensitivity

    const validMockKeyRequest: HttpRequest = {
      ...mockRequest,
      query: new URLSearchParams({ 'countyKey': key })
    }

    const expectedSuffixes: string[] = countyValidation(validMockKeyRequest, mockContext, mail)
    expect(Array.isArray(expectedSuffixes)).toBeTruthy()
    expect(expectedSuffixes).toEqual(['example.com', 'bar.no'])
  })
})
