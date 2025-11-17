import type { HttpResponseInit } from "@azure/functions";

export class HTTPError extends Error {
  public readonly status: number;
  public readonly body: string;

  public readonly data?: unknown;

  constructor(status: number, message: string, data?: unknown) {
    super(message);

    this.status = status;
    this.body = message;
    this.data = data;
    this.name = "HTTPError";
  }

  private getJsonBody(includeData: boolean = false): unknown {
    try {
      return JSON.parse(this.body);
    } catch {
      const data: unknown | undefined = this.data && includeData ? this.data : undefined;

      return {
        message: this.body,
        data
      };
    }
  }

  toResponse(includeData: boolean = false): HttpResponseInit {
    return {
      headers: { "Content-Type": "application/json" },
      status: this.status,
      jsonBody: this.getJsonBody(includeData)
    };
  }
}
