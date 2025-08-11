import { logger } from "@vtfk/logger"
import { getEntraIdToken } from "./get-entraid-token"
import { HTTPError } from "./HTTPError";

const scope = "https://graph.microsoft.com/.default"

type InvitedUser = {
  id: string
  patched: boolean
}

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
    const errorData = await response.json()
    throw new HTTPError(response.status, `Failed to fetch group id: ${response.statusText} - ${JSON.stringify(errorData, null, 2)}`)
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
  const url = `https://graph.microsoft.com/v1.0/users?$filter=mail eq '${encodeURIComponent(userMail)}'&$select=id`
  const headers: HeadersInit = await getGraphHeaders(scope)

  const response: Response = await fetch(url, {
    method: "GET",
    headers
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new HTTPError(response.status, `Failed to fetch user id: ${response.statusText} - ${JSON.stringify(errorData, null, 2)}`)
  }

  const data: any = await response.json()
  if (!data) {
    throw new HTTPError(404, `User with mail '${userMail}' not found`)
  }

  if (data.value.length === 0) {
    throw new HTTPError(404, `User with mail '${userMail}' not found`)
  }

  if (data.value.length > 1) {
    throw new HTTPError(500, `Multiple users found with mail '${userMail}'`)
  }

  return data.value[0].id
}

async function getUserById(userId: string): Promise<any> {
  const url = `https://graph.microsoft.com/v1.0/users/${userId}?$select=id,mail,proxyAddresses`
  const headers: HeadersInit = await getGraphHeaders(scope)

  const response: Response = await fetch(url, {
    method: "GET",
    headers
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new HTTPError(response.status, `Failed to fetch user by id: ${response.statusText} - ${JSON.stringify(errorData, null, 2)}`)
  }

  return response.json()
}

async function inviteUserByMail(userMail: string, displayName: string): Promise<InvitedUser> {
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
    const errorData = await response.json()
    throw new HTTPError(response.status, `Failed to invite user: ${response.statusText} - ${JSON.stringify(errorData, null, 2)}`)
  }

  const data: any = await response.json()
  logger('info', [`Invited user with display name '${data.invitedUserDisplayName}', email '${data.invitedUserEmailAddress}' and id '${data.invitedUser.id}'`, data])

  const user = await getUserById(data.invitedUser.id)
  let patched = false
  if (user.mail.toLowerCase() !== userMail.toLowerCase()) {
    logger('info', [`Will patch user with id '${data.invitedUser.id}' to have mail '${userMail}'`, user])
    patched = await patchUser(data.invitedUser.id, userMail)
  }

  return {
    id: data.invitedUser.id,
    patched
  }
}

async function patchUser(userId: string, userMail: string): Promise<boolean> {
  const url = `https://graph.microsoft.com/v1.0/users/${userId}`
  const headers: HeadersInit = await getGraphHeaders(scope)

  const body = JSON.stringify({
    mail: userMail
  })

  const response: Response = await fetch(url, {
    method: "PATCH",
    headers,
    body
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new HTTPError(response.status, `Failed to patch user: ${response.statusText} - ${JSON.stringify(errorData, null, 2)}`)
  }

  logger('warn', [`Patched user with id '${userId}' to have mail '${userMail}'`])

  return true
}

export async function listGroupMembers(groupName: string, allowedUpnSuffixes: string[]): Promise<string[]> {
  const groupId: string = await getGroupIdByDisplayName(groupName)
  const url = `https://graph.microsoft.com/v1.0/groups/${groupId}/members?$select=id,mail,displayName,proxyAddresses&$top=999`
  const headers: HeadersInit = await getGraphHeaders(scope)

  const response: Response = await fetch(url, {
    method: "GET",
    headers 
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new HTTPError(response.status, `Failed to fetch group members: ${response.statusText} - ${JSON.stringify(errorData, null, 2)}`)
  }

  const data: any = await response.json()
  return data.value
    .filter((member: any): boolean => member.mail && allowedUpnSuffixes.some(suffix => member.mail.endsWith(suffix)))
}

export async function addGroupMember(groupName: string, userMail: string, displayName: string): Promise<number> {
  const groupId: string = await getGroupIdByDisplayName(groupName)

  let userId: string
  let patched: boolean = false
  try {
    userId = await getUserIdByMail(userMail)
  } catch (error) {
    if (error instanceof HTTPError && error.status === 404) {
      const invitedUser: InvitedUser = await inviteUserByMail(userMail, displayName)
      userId = invitedUser.id
      patched = invitedUser.patched
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
    const errorData = await response.json()
    if (patched && errorData.error.message.includes('already exist')) {
      return 204
    }

    throw new HTTPError(response.status, `Failed to add group member: ${response.statusText} - ${JSON.stringify(errorData, null, 2)}`)
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
    const errorData = await response.json()
    throw new HTTPError(response.status, `Failed to remove group member: ${response.statusText} - ${JSON.stringify(errorData, null, 2)}`)
  }

  return response.status
}
