import {
  getUserId,
  isSuperUser as checkSuperUser,
  isTeamMember as checkTeamMember,
  isUserBillingLeader as checkBillingLeader
} from '../../../utils/authorization'
import AuthToken from '../../../database/types/AuthToken'
import {DataLoaderWorker} from '../../graphql'
import linkify from 'parabol-client/utils/linkify'
import {notifyWebhookConfigUpdated} from './notifications/notifyMattermost'
import {
  IntegrationProviderScopesEnum,
  isOAuth2ProviderMetadata,
  isWebHookProviderMetadata
} from '../../../postgres/types/IntegrationProvider'
import {AddIntegrationProviderInput} from '../addIntegrationProvider'

export const checkAuthPermissions = (
  dataLoader: DataLoaderWorker,
  scope: IntegrationProviderScopesEnum,
  authToken: AuthToken,
  teamId: string | null,
  orgId: string | null
) => {
  const viewerId = getUserId(authToken)
  const isSuperUser = checkSuperUser(authToken)
  const isTeamMember = teamId ? checkTeamMember(authToken, teamId) : false
  const isBillingLeader = orgId ? checkBillingLeader(viewerId, orgId, dataLoader) : false

  switch (scope) {
    case 'global':
      if (!isSuperUser) return new Error('permission denied modifying globally scoped provider')
      break
    case 'org':
      if (!isBillingLeader && !isSuperUser)
        return new Error('permission denied modifying org-wide provider; must be billing leader')
      break
    case 'team':
      if (!isTeamMember && !isBillingLeader && !isSuperUser)
        return new Error('persmission denied modifying team provider; must be team member')
  }

  return
}

export const validateIntegrationProvider = async (
  provider: AddIntegrationProviderInput,
  viewerId: string,
  dataLoader: DataLoaderWorker
) => {
  switch (provider.scope) {
    case 'global':
      if (provider.tokenType !== 'oauth2')
        return new Error('globally-scoped token provider must be OAuth2 provider')
      break
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore no-fallthrough
    case 'org':
      if (provider.tokenType !== 'oauth2')
        return new Error('org-scoped token provider must be OAuth2 provider')
    // fall-through and verify team and org
    case 'team':
      const checkTeam = await dataLoader.get('teams').load(provider.teamId)
      if (!checkTeam) return new Error('team not found')
      const checkOrg = await dataLoader.get('organizations').load(provider.orgId)
      if (!checkOrg) return new Error('organization not found')
  }

  const {providerMetadata} = provider
  if (isOAuth2ProviderMetadata(providerMetadata)) {
    if (!providerMetadata.scopes) return new Error('scopes required for OAuth2 provider')
    if (!providerMetadata.clientId) return new Error('oauthClientId required for OAuth2 provider')
    if (!providerMetadata.clientSecret)
      return new Error('oauthClientSecret required for OAuth2 provider')
  }

  if (isWebHookProviderMetadata(providerMetadata)) {
    const links = linkify.match(providerMetadata.webhookUrl)
    if (!links || links.length === 0) return new Error('invalid webhook url')
  }

  // TODO: refactor to use MakeIntegrationServerManager.fromProviderId(...)
  //       and support pat, oauth2, and webhooks here. Method should be shared
  //       with addIntegrationToken implementation. See addIntegrationToken for
  //       inspriation.
  switch (provider.type) {
    case 'mattermost':
      if (!isWebHookProviderMetadata(providerMetadata)) {
        return
      }

      const result = await notifyWebhookConfigUpdated(
        providerMetadata.webhookUrl,
        viewerId,
        provider.teamId
      )
      if (result instanceof Error) return result
  }

  return
}