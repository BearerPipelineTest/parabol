import React, {ReactNode} from 'react'
import styled from 'react-emotion'
import {createFragmentContainer, graphql} from 'react-relay'
import {Link} from 'react-router-dom'
import LabelHeading from 'universal/components/LabelHeading/LabelHeading'
import LogoBlock from 'universal/components/LogoBlock/LogoBlock'
import MeetingSidebarLabelBlock from 'universal/components/MeetingSidebarLabelBlock'
import SidebarToggle from 'universal/components/SidebarToggle'
import {meetingSidebarWidth} from 'universal/styles/meeting'
import {PALETTE} from 'universal/styles/paletteV2'
import {MeetingTypeEnum} from 'universal/types/graphql'
import {meetingTypeToLabel} from 'universal/utils/meetings/lookups'
import isDemoRoute from '../utils/isDemoRoute'
import {NewMeetingSidebar_viewer} from '__generated__/NewMeetingSidebar_viewer.graphql'

const SidebarHeader = styled('div')({
  alignItems: 'center',
  display: 'flex',
  position: 'relative'
})

const StyledToggle = styled(SidebarToggle)({
  paddingLeft: 24
})

const SidebarParent = styled('div')({
  backgroundColor: '#fff',
  display: 'flex',
  flex: 1,
  flexDirection: 'column',
  height: '100vh',
  maxWidth: meetingSidebarWidth,
  minWidth: meetingSidebarWidth,
  paddingTop: 16,
  userSelect: 'none'
})

const TeamDashboardLink = styled(Link)({
  fontSize: 20,
  fontWeight: 600,
  paddingLeft: 16,
  wordBreak: 'break-word',
  ':hover': {
    color: PALETTE.TEXT_PURPLE,
    cursor: 'pointer'
  }
})

interface Props {
  children: ReactNode
  handleMenuClick: () => void
  meetingType: MeetingTypeEnum
  toggleSidebar: () => void
  viewer: NewMeetingSidebar_viewer
}

const NewMeetingSidebar = (props: Props) => {
  const {children, handleMenuClick, meetingType, toggleSidebar, viewer} = props
  const {team} = viewer
  if (!team) return null
  const {id: teamId, name: teamName} = team
  const meetingLabel = meetingTypeToLabel[meetingType]
  const teamLink = isDemoRoute() ? '/create-account' : `/team/${teamId}`
  return (
    <SidebarParent>
      <SidebarHeader>
        <StyledToggle onClick={toggleSidebar} />
        <TeamDashboardLink to={teamLink}>{teamName}</TeamDashboardLink>
      </SidebarHeader>
      <MeetingSidebarLabelBlock>
        <LabelHeading>{`${meetingLabel} Meeting`}</LabelHeading>
      </MeetingSidebarLabelBlock>
      {children}
      <LogoBlock variant='primary' onClick={handleMenuClick} />
    </SidebarParent>
  )
}

export default createFragmentContainer(NewMeetingSidebar, {
  viewer: graphql`
    fragment NewMeetingSidebar_viewer on User {
      team(teamId: $teamId) {
        id
        name
      }
    }
  `
})