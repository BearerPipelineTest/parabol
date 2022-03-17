import JiraServerIssueId from '~/shared/gqlIds/JiraServerIssueId'
import {CreateTaskResponse, TaskIntegrationManager} from './TaskIntegrationManagerFactory'
import JiraServerRestManager from './jiraServer/JiraServerRestManager'
import {IGetTeamMemberIntegrationAuthQueryResult} from '../postgres/queries/generated/getTeamMemberIntegrationAuthQuery'
import {IntegrationProviderJiraServer} from '../postgres/queries/getIntegrationProvidersByIds'
import splitDraftContent from '~/utils/draftjs/splitDraftContent'
import {ExternalLinks} from '~/types/constEnums'
import IntegrationRepoId from '~/shared/gqlIds/IntegrationRepoId'

export default class JiraServerTaskIntegrationManager implements TaskIntegrationManager {
  public title = 'Jira Server'
  private readonly auth: IGetTeamMemberIntegrationAuthQueryResult
  private readonly provider: IntegrationProviderJiraServer

  constructor(
    auth: IGetTeamMemberIntegrationAuthQueryResult,
    provider: IntegrationProviderJiraServer
  ) {
    this.auth = auth
    this.provider = provider
  }

  public getApiManager() {
    const {serverBaseUrl, consumerKey, consumerSecret} = this.provider
    const {accessToken, accessTokenSecret} = this.auth
    return new JiraServerRestManager(
      serverBaseUrl!,
      consumerKey!,
      consumerSecret!,
      accessToken!,
      accessTokenSecret!
    )
  }

  async createTask({
    rawContentStr,
    integrationRepoId
  }: {
    rawContentStr: string
    integrationRepoId: string
  }): Promise<CreateTaskResponse> {
    const api = this.getApiManager()

    const {title: summary, contentState} = splitDraftContent(rawContentStr)
    // TODO: implement stateToJiraServerFormat
    const description = contentState.getPlainText()

    const {repoId} = IntegrationRepoId.split(integrationRepoId)

    const res = await api.createIssue(repoId, summary, description)

    if (res instanceof Error) {
      return res
    }
    const issueId = res.id

    return {
      integrationHash: JiraServerIssueId.join(this.provider.id, repoId, issueId),
      integration: {
        accessUserId: this.auth.userId,
        service: 'jiraServer',
        providerId: this.provider.id
      }
    }
  }

  async getIssue(issueId: string) {
    const api = this.getApiManager()
    return api.getIssue(issueId)
  }

  private static makeCreateJiraServerTaskComment(
    creator: string,
    assignee: string,
    teamName: string,
    teamDashboardUrl: string
  ) {
    return `Created by ${creator} for ${assignee}
    See the dashboard of [${teamName}|${teamDashboardUrl}]
  
    *Powered by [Parabol|${ExternalLinks.INTEGRATIONS_JIRASERVER}]*`
  }

  async addCreatedBySomeoneElseComment(
    viewerName: string,
    assigneeName: string,
    teamName: string,
    teamDashboardUrl: string,
    integrationHash: string
  ) {
    const {issueId} = JiraServerIssueId.split(integrationHash)
    const comment = JiraServerTaskIntegrationManager.makeCreateJiraServerTaskComment(
      viewerName,
      assigneeName,
      teamName,
      teamDashboardUrl
    )
    const api = this.getApiManager()
    return api.addComment(comment, issueId)
  }
}
