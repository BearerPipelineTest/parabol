import graphql from 'babel-plugin-relay/macro'
import {commitMutation} from 'react-relay'
import {RecordProxy} from 'relay-runtime'
import {IEstimatePhase, IEstimateStage, IPokerMeeting, NewMeetingPhaseTypeEnum} from '../types/graphql'
import {SharedUpdater, SimpleMutation} from '../types/relayMutations'
import createProxyRecord from '../utils/relay/createProxyRecord'
import {PokerAnnounceDeckHoverMutation as TPokerAnnounceDeckHoverMutation} from '../__generated__/PokerAnnounceDeckHoverMutation.graphql'
import {PokerAnnounceDeckHoverMutation_meeting} from '../__generated__/PokerAnnounceDeckHoverMutation_meeting.graphql'

// asking for the correct hoveringUsers array would be fine, except we know a user can existing in exactly 1 hoveringUsers array at a time
// which means we have to iterate over each stage & remove it from all others (because mouseEnter/mouseLeave are not always reliable)

graphql`
  fragment PokerAnnounceDeckHoverMutation_meeting on PokerAnnounceDeckHoverSuccess {
    meetingId
    user {
      id
      ...PeekingAvatar_user
    }
    isHover
    stageId
  }
`

const mutation = graphql`
  mutation PokerAnnounceDeckHoverMutation($meetingId: ID!, $stageId: ID!, $isHover: Boolean!) {
    pokerAnnounceDeckHover(meetingId: $meetingId, stageId: $stageId, isHover: $isHover) {
      ... on ErrorPayload {
        error {
          message
        }
      }
      ...PokerAnnounceDeckHoverMutation_meeting @relay(mask: false)
    }
  }
`

const removeHoveringUserFromStage = (stage: RecordProxy<IEstimateStage>, userId: string) => {
  const hoveringUsers = stage.getLinkedRecords('hoveringUsers')
  if (hoveringUsers.length === 0) return
  const existingUserHoverIdx = hoveringUsers.findIndex((user) => user.getValue('id') === userId)
  if (existingUserHoverIdx === -1) return
  const nextHoveringUsers = [...hoveringUsers.slice(0, existingUserHoverIdx), ...hoveringUsers.slice(existingUserHoverIdx + 1)]
  stage.setLinkedRecords(nextHoveringUsers, 'hoveringUsers')
}

export const pokerAnnounceDeckHoverMeetingUpdater: SharedUpdater<PokerAnnounceDeckHoverMutation_meeting> = (payload, {store}) => {
  const meetingId = payload.getValue('meetingId')
  const user = payload.getLinkedRecord('user')
  const userId = user.getValue('id')
  const stageId = payload.getValue('stageId')
  const isHover = payload.getValue('isHover')
  const meeting = store.get<IPokerMeeting>(meetingId)
  if (!meeting) return
  if (isHover) {
    const phases = meeting.getLinkedRecords('phases')!
    const estimatePhase = phases.find((phase) => phase.getValue('phaseType') === NewMeetingPhaseTypeEnum.ESTIMATE) as RecordProxy<IEstimatePhase>
    const stages = estimatePhase.getLinkedRecords('stages')

    stages.forEach((stage) => {
      if (stage.getValue('id') === stageId) {
        const hoveringUsers = stage.getLinkedRecords('hoveringUsers')
        const existingUserHoverIdx = hoveringUsers.findIndex((user) => user.getValue('id') === userId)
        // add the hovering user to this stage
        if (existingUserHoverIdx > -1) return
        const nextHoveringUsers = [
          ...hoveringUsers,
          user
        ]
        stage.setLinkedRecords(nextHoveringUsers, 'hoveringUsers')
      } else {
        removeHoveringUserFromStage(stage, userId)
      }
    })
  } else {
    const stage = store.get<IEstimateStage>(stageId)
    if (!stage) return
    removeHoveringUserFromStage(stage, userId)
  }
}

const PokerAnnounceDeckHoverMutation: SimpleMutation<TPokerAnnounceDeckHoverMutation> = (
  atmosphere,
  variables,
) => {
  return commitMutation<TPokerAnnounceDeckHoverMutation>(atmosphere, {
    mutation,
    variables,
    optimisticUpdater: (store) => {
      const {stageId, meetingId, isHover} = variables
      const payload = createProxyRecord(store, 'PokerAnnounceDeckHoverSuccess', {
        meetingId,
        stageId,
        isHover
      })
      payload.setLinkedRecord(store.getRoot().getLinkedRecord('viewer'), 'user')
      pokerAnnounceDeckHoverMeetingUpdater(payload as any, {atmosphere, store})
    }
  })
}

export default PokerAnnounceDeckHoverMutation