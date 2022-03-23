import {GraphQLID, GraphQLNonNull, GraphQLObjectType} from 'graphql'
import {GQLContext} from '../graphql'
import makeMutationPayload from './makeMutationPayload'
import Team from './Team'
import TeamPromptMeeting from './TeamPromptMeeting'

export const EndTeamPromptSuccess = new GraphQLObjectType<any, GQLContext>({
  name: 'EndTeamPromptSuccess',
  fields: () => ({
    meeting: {
      type: new GraphQLNonNull(TeamPromptMeeting),
      resolve: ({meetingId}: {meetingId: string}, _args: unknown, {dataLoader}) => {
        return dataLoader.get('newMeetings').load(meetingId)
      }
    },
    meetingId: {
      type: new GraphQLNonNull(GraphQLID)
    },
    team: {
      type: new GraphQLNonNull(Team),
      resolve: ({teamId}, _args: unknown, {dataLoader}) => {
        return dataLoader.get('teams').load(teamId)
      }
    }
  })
})

const EndTeamPromptPayload = makeMutationPayload('EndTeamPromptPayload', EndTeamPromptSuccess)

export default EndTeamPromptPayload