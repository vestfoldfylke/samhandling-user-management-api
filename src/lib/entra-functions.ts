import type { Invitation, User } from "@microsoft/microsoft-graph-types";

import { logger } from "@vestfoldfylke/loglady";

import type { Groups, InvitedUser, Users } from "../../types/graph.types.js";

import { getEntraIdToken } from "./get-entraid-token.js";
import { HTTPError } from "./HTTPError.js";

const scope = "https://graph.microsoft.com/.default";

const getGraphHeaders = async (scope: string): Promise<HeadersInit> => {
  const entraIdToken: string = await getEntraIdToken(scope);

  return {
    Authorization: `Bearer ${entraIdToken}`,
    "Content-Type": "application/json"
  };
};

async function getGroupIdByDisplayName(groupName: string): Promise<string> {
  const url = `https://graph.microsoft.com/v1.0/groups?$filter=displayName eq '${encodeURIComponent(groupName)}'&$select=id,displayName`;
  const headers: HeadersInit = await getGraphHeaders(scope);

  const response: Response = await fetch(url, {
    method: "GET",
    headers
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new HTTPError(
      response.status,
      `Failed to fetch group id by displayName '${groupName}' : ${response.statusText}`,
      JSON.stringify(errorData)
    );
  }

  const data: Groups = await response.json();
  if (data.value.length === 0) {
    throw new HTTPError(404, `Group with display name '${groupName}' not found`);
  }

  if (data.value.length > 1) {
    throw new HTTPError(500, `Multiple groups found with display name '${groupName}'`);
  }

  const groupId: string | undefined = data.value[0].id;
  if (!groupId) {
    throw new HTTPError(404, `Group with display name '${groupName}' not found`);
  }

  return groupId;
}

async function getUserIdByMail(userMail: string): Promise<string> {
  const url = `https://graph.microsoft.com/v1.0/users?$filter=mail eq '${encodeURIComponent(userMail)}'&$select=id`;
  const headers: HeadersInit = await getGraphHeaders(scope);

  const response: Response = await fetch(url, {
    method: "GET",
    headers
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new HTTPError(response.status, `Failed to fetch user id by mail '${userMail}' : ${response.statusText}`, JSON.stringify(errorData));
  }

  const data: Users = await response.json();
  if (!data || data.value.length === 0) {
    throw new HTTPError(404, `User with mail '${userMail}' not found`);
  }

  if (data.value.length > 1) {
    throw new HTTPError(500, `Multiple users found with mail '${userMail}'`);
  }

  const userId: string | undefined = data.value[0].id;
  if (!userId) {
    throw new HTTPError(404, `User with mail '${userMail}' not found`);
  }

  return userId;
}

async function getUserById(userId: string): Promise<User> {
  const url = `https://graph.microsoft.com/v1.0/users/${userId}?$select=id,mail,proxyAddresses`;
  const headers: HeadersInit = await getGraphHeaders(scope);

  const response: Response = await fetch(url, {
    method: "GET",
    headers
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new HTTPError(response.status, `Failed to fetch user by id '${userId}' : ${response.statusText}`, JSON.stringify(errorData));
  }

  return response.json();
}

async function inviteUserByMail(userMail: string, displayName: string): Promise<InvitedUser> {
  const url = "https://graph.microsoft.com/v1.0/invitations";
  const headers: HeadersInit = await getGraphHeaders(scope);

  const body: string = JSON.stringify({
    invitedUserEmailAddress: userMail,
    invitedUserDisplayName: displayName,
    inviteRedirectUrl: "https://samhandling.org",
    sendInvitationMessage: false
  });

  const response: Response = await fetch(url, {
    method: "POST",
    headers,
    body
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new HTTPError(
      response.status,
      `Failed to invite user by mail '${userMail}' with displayName '${displayName}' : ${response.statusText}`,
      JSON.stringify(errorData)
    );
  }

  const invitationData: Invitation = await response.json();
  const invitedUserId: string | undefined = invitationData.invitedUser?.id;
  if (!invitedUserId) {
    throw new HTTPError(400, `Invited user id not present in invitation data for user with displayName ${displayName} and mail ${userMail}`);
  }

  logger.info(
    "Invited user with DisplayName '{DisplayName}', EmailAddress '{EmailAddress}' and Id '{Id}'. InvitationData: {@InvitationData}",
    invitationData.invitedUserDisplayName,
    invitationData.invitedUserEmailAddress,
    invitedUserId,
    invitationData
  );

  const invitedUser: User = await getUserById(invitedUserId);
  const invitedUserMail: string | undefined | null = invitedUser.mail;
  if (!invitedUserMail) {
    logger.error(
      `Invited user mail not found for invited user with DisplayName '{DisplayName}' and Id '{Id}'. InvitationData: {@InvitationData}`,
      displayName,
      invitedUserId,
      invitationData
    );

    throw new HTTPError(400, `Invited user mail not found for invited user with DisplayName '${displayName}' and Id '${invitedUserId}'`);
  }

  let patched: boolean = false;
  if (invitedUserMail.toLowerCase() !== userMail.toLowerCase()) {
    logger.info(
      "Will patch invited user with Id '{Id}' to have EmailAddress '{EmailAddress}'. UserData: {@UserData}",
      invitedUserId,
      userMail,
      invitedUser
    );
    patched = await patchUser(invitedUserId, userMail);
  }

  return {
    id: invitedUserId,
    patched
  };
}

async function patchUser(userId: string, userMail: string): Promise<boolean> {
  const url = `https://graph.microsoft.com/v1.0/users/${userId}`;
  const headers: HeadersInit = await getGraphHeaders(scope);

  const body: string = JSON.stringify({
    mail: userMail
  });

  const response: Response = await fetch(url, {
    method: "PATCH",
    headers,
    body
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new HTTPError(
      response.status,
      `Failed to patch user with id '${userId}' with mail '${userMail}' : ${response.statusText}`,
      JSON.stringify(errorData)
    );
  }

  logger.warn("Patched user with Id '{Id}' to have EmailAddress '{EmailAddress}'", userId, userMail);

  return true;
}

export async function listGroupMembers(groupName: string, allowedUpnSuffixes: string[]): Promise<User[]> {
  const groupId: string = await getGroupIdByDisplayName(groupName);
  const url = `https://graph.microsoft.com/v1.0/groups/${groupId}/members?$select=id,mail,displayName,proxyAddresses&$top=999`;
  const headers: HeadersInit = await getGraphHeaders(scope);

  const response: Response = await fetch(url, {
    method: "GET",
    headers
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new HTTPError(
      response.status,
      `Failed to fetch group members from group '${groupName}' : ${response.statusText}`,
      JSON.stringify(errorData)
    );
  }

  const data: Users = await response.json();
  return data.value.filter((member: User): boolean => {
    if (!member.mail) {
      return false;
    }

    const userMail: string = member.mail.trim().toLowerCase();
    return allowedUpnSuffixes.some((suffix: string) => userMail.endsWith(suffix));
  });
}

export async function addGroupMember(groupName: string, userMail: string, displayName: string): Promise<number> {
  const groupId: string = await getGroupIdByDisplayName(groupName);

  let userId: string;
  let patched: boolean = false;
  try {
    userId = await getUserIdByMail(userMail);
  } catch (error) {
    if (!(error instanceof HTTPError && error.status === 404)) {
      throw error;
    }

    const invitedUser: InvitedUser = await inviteUserByMail(userMail, displayName);
    userId = invitedUser.id;
    patched = invitedUser.patched;
  }

  const url = `https://graph.microsoft.com/v1.0/groups/${groupId}/members/$ref`;
  const headers: HeadersInit = await getGraphHeaders(scope);

  const body: string = JSON.stringify({
    "@odata.id": `https://graph.microsoft.com/v1.0/directoryObjects/${userId}`
  });

  const response: Response = await fetch(url, {
    method: "POST",
    headers,
    body
  });

  if (!response.ok) {
    const errorData = await response.json();
    if (patched && errorData.error.message.includes("already exist")) {
      return 204;
    }

    throw new HTTPError(
      response.status,
      `Failed to add mail '${userMail}' as group member to group '${groupName}' : ${response.statusText}`,
      JSON.stringify(errorData)
    );
  }

  return response.status;
}

export async function removeGroupMember(groupName: string, userMail: string): Promise<number> {
  const groupId: string = await getGroupIdByDisplayName(groupName);
  const userId: string = await getUserIdByMail(userMail);
  const url = `https://graph.microsoft.com/v1.0/groups/${groupId}/members/${userId}/$ref`;
  const headers: HeadersInit = await getGraphHeaders(scope);

  const response: Response = await fetch(url, {
    method: "DELETE",
    headers
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new HTTPError(
      response.status,
      `Failed to remove mail '${userMail}' from group '${groupName}' : ${response.statusText}`,
      JSON.stringify(errorData)
    );
  }

  return response.status;
}
