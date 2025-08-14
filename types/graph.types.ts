import * as GraphTypes from '@microsoft/microsoft-graph-types'

export type Groups = {
  value: GraphTypes.Group[]
}

export type InvitedUser = {
  id: string
  patched: boolean
}

export type Users = {
  value: GraphTypes.User[]
}