import type { HttpResponseInit } from "@azure/functions";

export class HTTPError extends Error {
  public readonly status: number;
  public readonly body: string;
  public readonly data?: string;

  /**
   *
   * @param status - HTTP status code
   * @param message - Error message
   * @param data - Optional additional data (stringified JSON)
   */
  constructor(status: number, message: string, data?: string) {
    super(message);

    this.status = status;
    this.body = message;
    this.data = data;
    this.name = "HTTPError";
  }

  private getBody(): string | unknown {
    try {
      return JSON.parse(this.body);
    } catch {
      return this.body;
    }
  }

  private getData(): unknown | undefined {
    if (!this.data) {
      return undefined;
    }

    try {
      return JSON.parse(this.data);
    } catch {
      return this.data;
    }
  }

  private getJsonBody(includeData: boolean = false): unknown {
    if (includeData && this.data) {
      return {
        body: this.getBody(),
        data: this.getData()
      };
    }

    return {
      body: this.getBody()
    };
  }

  toResponse(includeData: boolean = false): HttpResponseInit {
    return {
      headers: { "Content-Type": "application/json" },
      status: this.status,
      jsonBody: this.getJsonBody(includeData)
    };
  }
}
