import {GraphQLNonNull, GraphQLID} from 'graphql'
// import getRethink from '../../database/rethinkDriver'
import {getUserId} from '../../utils/authorization'
import publish from '../../utils/publish'
import AddADOAuthPayload from '../types/AddADOAuthPayload'
import {SubscriptionChannel} from 'parabol-client/types/constEnums'
import {GQLContext, GQLMutation} from '../graphql'
import {isTeamMember} from '../../utils/authorization'
import standardError from '../../utils/standardError'
import segmentIo from '../../utils/segmentIo'

const addADOAuth: GQLMutation = {
  name: 'AddADOAuth',
  type: GraphQLNonNull(AddADOAuthPayload),
  description: ``,
  args: {
    teamId: {
      type: new GraphQLNonNull(GraphQLID)
    }
  },
  resolve: async (
    _source: unknown,
    {teamId},
    {authToken, dataLoader, socketId: mutatorId}: GQLContext
  ) => {
    // const r = await getRethink()
    const viewerId = getUserId(authToken)
    // const now = new Date()
    const operationId = dataLoader.share()
    const subOptions = {mutatorId, operationId}

    //AUTH
    if (!isTeamMember(authToken, teamId)) {
      return standardError(new Error('Attempted teamId spoof'), {userId: viewerId})
    }

    // VALIDATION

    // RESOLUTION
    segmentIo.track({
      userId: viewerId,
      event: 'Added Integration',
      properties: {
        teamId,
        service: 'AzureDevOps'
      }
    })
    const data = {teamId}
    publish(SubscriptionChannel.TEAM, teamId, 'AddADOAuthSuccess', data, subOptions)
    return data
  }
}

export default addADOAuth
