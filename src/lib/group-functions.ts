import { getEntraIdToken } from "./get-entraid-token"
import { HTTPError } from "./HTTPError";

const scope = "https://graph.microsoft.com/.default"

const getGraphHeaders: (scope: string) => Promise<HeadersInit> = async (scope: string): Promise<HeadersInit> => {
  const entraIdToken: string = await getEntraIdToken(scope)

  return {
    Authorization: `Bearer ${entraIdToken}`,
    "Content-Type": "application/json"
  }
}

async function getGroupIdByDisplayName(groupName: string): Promise<string> {
  const url = `https://graph.microsoft.com/v1.0/groups?$filter=displayName eq '${encodeURIComponent(groupName)}'&$select=id,displayName`
  const headers: HeadersInit = await getGraphHeaders(scope)

  const response: Response = await fetch(url, {
    method: "GET",
    headers
  })

  if (!response.ok) {
    throw new HTTPError(response.status, `Failed to fetch group id: ${response.statusText}`)
  }

  const data: any = await response.json()
  if (data.value.length === 0) {
    throw new HTTPError(404, `Group with display name '${groupName}' not found`)
  }

  if (data.value.length > 1) {
    throw new HTTPError(500, `Multiple groups found with display name '${groupName}'`)
  }

  return data.value[0].id
}

async function getUserIdByMail(userMail: string): Promise<string> {
  const upn = encodeURIComponent(`${userMail.replace('@', '_')}#EXT#@samhandling.onmicrosoft.com`)
  const url = `https://graph.microsoft.com/v1.0/users/${upn}?$select=id,displayName`
  const headers: HeadersInit = await getGraphHeaders(scope)

  const response: Response = await fetch(url, {
    method: "GET",
    headers
  })

  if (!response.ok) {
    throw new HTTPError(response.status, `Failed to fetch user id: ${response.statusText}`)
  }

  const data: any = await response.json()
  if (!data) {
    throw new HTTPError(404, `User with mail '${userMail}' not found`)
  }

  return data.id
}

async function inviteUserByMail(userMail: string, displayName: string): Promise<string> {
  const url = `https://graph.microsoft.com/v1.0/invitations`
  const headers: HeadersInit = await getGraphHeaders(scope)

  const body = JSON.stringify({
    invitedUserEmailAddress: userMail,
    invitedUserDisplayName: displayName,
    inviteRedirectUrl: "https://samhandling.org",
    sendInvitationMessage: false
  })

  const response: Response = await fetch(url, {
    method: "POST",
    headers,
    body
  })

  if (!response.ok) {
    throw new HTTPError(response.status, `Failed to invite user: ${response.statusText}`)
  }

  const data: any = await response.json()
  return data.invitedUser.id
}

export async function listGroupMembers(groupName: string, allowedUpnSuffixes: string[]): Promise<string[]> {
  const groupId: string = await getGroupIdByDisplayName(groupName)
  const url = `https://graph.microsoft.com/v1.0/groups/${groupId}/members?$top=999`
  const headers: HeadersInit = await getGraphHeaders(scope)

  const response: Response = await fetch(url, {
    method: "GET",
    headers 
  })

  if (!response.ok) {
    throw new HTTPError(response.status, `Failed to fetch group members: ${response.statusText}`)
  }

  const data: any = await response.json()
  return data.value
    .filter((member: any): boolean => member.mail && allowedUpnSuffixes.some(suffix => member.mail.endsWith(suffix)))
    .map((member: any) => {
      return { id: member.id, mail: member.mail, displayName: member.displayName }
    })
}

export async function addGroupMember(groupName: string, userMail: string, displayName: string): Promise<number> {
  const groupId: string = await getGroupIdByDisplayName(groupName)

  let userId: string
  try {
    userId = await getUserIdByMail(userMail)
  } catch (error) {
    if (error instanceof HTTPError && error.status === 404) {
      userId = await inviteUserByMail(userMail, displayName)
    } else {
      throw error
    }
  }

  const url = `https://graph.microsoft.com/v1.0/groups/${groupId}/members/$ref`
  const headers: HeadersInit = await getGraphHeaders(scope)

  const body = JSON.stringify({
    "@odata.id": `https://graph.microsoft.com/v1.0/directoryObjects/${userId}`
  })

  const response: Response = await fetch(url, {
    method: "POST",
    headers,
    body
  })

  if (!response.ok) {
    throw new HTTPError(response.status, `Failed to add group member: ${response.statusText}`)
  }

  return response.status
}

export async function removeGroupMember(groupName: string, userMail: string): Promise<number> {
  const groupId: string = await getGroupIdByDisplayName(groupName)
  const userId = await getUserIdByMail(userMail)
  const url = `https://graph.microsoft.com/v1.0/groups/${groupId}/members/${userId}/$ref`
  const headers: HeadersInit = await getGraphHeaders(scope)

  const response: Response = await fetch(url, {
    method: "DELETE",
    headers
  })

  if (!response.ok) {
    throw new HTTPError(response.status, `Failed to remove group member: ${response.statusText}`)
  }

  return response.status
}
