import { HttpResponseInit } from '@azure/functions'

export class HTTPError extends Error {
  public status: number
  public body: string

  constructor(status: number, message: string) {
    super(message)

    this.status = status
    this.body = message
    this.name = 'HTTPError'
  }

  toResponse(): HttpResponseInit {
    try {
      return {
        status: this.status,
        jsonBody: JSON.parse(this.body)
      }
    } catch {
      return {
        status: this.status,
        body: this.body
      }
    }
  }
}
