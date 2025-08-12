# Samhandling User Management API

## Setup

Create `local.settings.json` with the following content:
```json
{
  "IsEncrypted": false,
  "Values": {
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "AzureWebJobsStorage": "",
    "AZURE_CLIENT_ID": "client-id",
    "AZURE_CLIENT_SECRET": "client-secret",
    "AZURE_TENANT_ID": "tenant-id",
    "BETTERSTACK_URL": "url-to-betterstack",
    "BETTERSTACK_TOKEN": "betterstack-token",
    "TEAMS_WEBHOOK_URL": "teams-flow-webhook-url",
    "NODE_ENV": "production",
    "security-key-1": "foo.no,bar.no",
    "security-key-2": "biz.no"
  }
}
```

> [!IMPORTANT]
> - Replace `security-key-X` with an actual generated security key and the correct corresponding domains for this security key.<br />
> - Only the security keys specified will be allowed to access the API.<br />
> - This API will only consider users who have an email address in the specified domains for the given security key.<br />
> - Replace AZURE_CLIENT* entries with an app registration which has the following application permissions:
>   - GroupMember.ReadWrite.All
>   - User.Invitations
>   - User.ReadWrite.All

## Usage

All calls to this API must include two separate security keys:
- Specified in the header:
  - `X-Functions-Key: <functions-key>`
  - `X-County-Key: <security-key-x>`
- Specified in the query string:
  - `?code=<functions-key>&countyKey=<security-key-x>`

## Endpoints

### List members

> **GET** /api/members/{groupName}

Returns all members (matching specified domains for current security-key) from specified groupName.
```json
[
  {
    "@odata.type": "#microsoft.graph.user",
    "id": "00000000-0000-0000-0000-000000000000",
    "mail": "mail@foo.no",
    "displayName": "Mail Foo",
    "proxyAddresses": [
      "SMTP:mail@foo.no"
    ]
  }
]
```

### Add member

> **POST** /api/members/{groupName}
```json
{
  "displayName": "Foo Bar",
  "mail": "foo@bar.no"
}
```

- If specified mail is not in the domains specified for the current security-key, it will return a `403 Forbidden` response.
- If the user doesn't exist in **Samhandling.org**, the user will be invited to join. Then the invited user will be added to `groupName`.
- If a previously invited user has changed their mail address, the user will be invited on their new mail address and linked to the existing user in **Samhandling.org** (on the previously invited mail address). The mail address on the previously invited user in **Samhandling.org** will be updated to the new mail address, and the user will be added to `groupName`.
- If the user already exists in **Samhandling.org**, the user will be added to `groupName` (if not already a member).

### Remove member

> **DELETE** /api/members/{groupName}/{mail}

- If specified mail is not in the domains specified for the current security-key, it will return a `403 Forbidden` response.
- If the user is a member of the specified group, the user will be removed from `groupName`.
  - **The user itself will not be removed from **Samhandling.org**, only removed as a member of `groupName`.**