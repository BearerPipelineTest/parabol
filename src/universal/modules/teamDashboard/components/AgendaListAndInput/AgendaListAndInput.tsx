import {AgendaListAndInput_team} from '__generated__/AgendaListAndInput_team.graphql'
import React from 'react'
import styled from 'react-emotion'
import {createFragmentContainer, graphql} from 'react-relay'
import {useGotoStageId} from 'universal/hooks/useMeeting'
import AgendaInput from 'universal/modules/teamDashboard/components/AgendaInput/AgendaInput'
import AgendaList from 'universal/modules/teamDashboard/components/AgendaList/AgendaList'
import {meetingSidebarGutter} from 'universal/styles/meeting'

const RootStyles = styled('div')(
  ({disabled, isMeeting}: {isMeeting: boolean | undefined; disabled: boolean}) => ({
    display: 'flex',
    flexDirection: 'column',
    paddingTop: isMeeting ? meetingSidebarGutter : 0,
    position: 'relative',
    width: '100%',
    cursor: disabled ? 'not-allowed' : undefined,
    filter: disabled ? 'blur(3px)' : undefined,
    pointerEvents: disabled ? 'none' : undefined,
    height: isMeeting ? '100%' : undefined // 100% is required due to the flex logo in the meeting sidebar
  })
)

interface Props {
  gotoStageId: ReturnType<typeof useGotoStageId> | undefined
  isDisabled?: boolean
  team: AgendaListAndInput_team
  isMeeting?: boolean
}

const AgendaListAndInput = (props: Props) => {
  const {gotoStageId, isDisabled, team, isMeeting} = props
  return (
    <RootStyles disabled={!!isDisabled} isMeeting={isMeeting}>
      <AgendaList gotoStageId={gotoStageId} team={team} />
      <AgendaInput disabled={!!isDisabled} team={team} />
    </RootStyles>
  )
}

export default createFragmentContainer(AgendaListAndInput, {
  team: graphql`
    fragment AgendaListAndInput_team on Team {
      ...AgendaInput_team
      ...AgendaList_team
      agendaItems {
        id
        content
        teamMember {
          id
        }
      }
      newMeeting {
        id
      }
    }
  `
})