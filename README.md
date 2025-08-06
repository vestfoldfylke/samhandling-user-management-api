# Samhandling User Management API

## Setup

Create `local.settings.json` with the following content:
```json
{
  "IsEncrypted": false,
  "Values": {
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "AzureWebJobsStorage": "",
    "security-key-1": "foo.no,bar.no",
    "security-key-2": "biz.no"
  }
}
```

> [!IMPORTANT]
> - Replace `security-key-X` with an actual generated security key and the correct corresponding domains for this security key.<br />
> - Only the security keys specified will be allowed to access the API.<br />
> - This API will only consider users who have an email address in the specified domains for the given security key.

## Usage

All calls to this API must include two separate security keys:
- Specified in the header:
  - `X-Functions-Key: <functions-key>`
  - `X-County-Key: <security-key-x>`
- Specified in the query string:
  - `?code=<functions-key>&countyKey=<security-key-x>`

## Endpoints

### members

> **GET** /api/members/{groupId}

Will return all members (matching specified domains for current security-key) from specified groupId