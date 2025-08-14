# Samhandling User Management API

## Setup for local development

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

## Setup for Azure Function App in Samhandling.org

### Add the following Environment variables in the Azure Function App:
- `AZURE_CLIENT_ID`: The client ID of the app registration used for the API.
- `AZURE_CLIENT_SECRET`: The client secret of the app registration used for the API.
- `AZURE_TENANT_ID`: The tenant ID of the app registration used for the
- `BETTERSTACK_URL`: The URL to the BetterStack dashboard for monitoring. Leave out if usage of BetterStack is not desired.
- `BETTERSTACK_TOKEN`: The token for the BetterStack dashboard. Leave out if usage of BetterStack is not desired.
- `TEAMS_WEBHOOK_URL`: The URL to the Teams flow webhook for notifications. Leave out if usage of Teams notifications is not desired.
- `NODE_ENV`: Set to `production` to enable logging to BetterStack and Teams notifications. If not set, it will default to `development` and not log to BetterStack or Teams.

### Setup county keys

Add a new Environment variable in the Azure Function App with the name `Organisasjon_RandomGUID` and set the value to a comma-separated list of domains that should be allowed for this security key.<br />
A random GUID can be generated using an online GUID generator, by using the `uuid` command in a terminal or `New-GUID` in PowerShell

Example:
```text
Organisasjonsprefix_12345678-1234-1234-1234-123456789012 = foo.no,bar.no
```

### Setup Function App keys

Add a new Function App key in the Azure Function App with the name `Organisasjon` and generate a random key value/pair (link in the bottom right corner)

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