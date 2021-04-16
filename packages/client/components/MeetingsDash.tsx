import styled from '@emotion/styled'
import graphql from 'babel-plugin-relay/macro'
import React from 'react'
import {createFragmentContainer} from 'react-relay'
import {MeetingsDash_viewer} from '~/__generated__/MeetingsDash_viewer.graphql'
import blueSquiggle from '../../../static/images/illustrations/blue-squiggle.svg'
import yellowFlashLine from '../../../static/images/illustrations/yellow-flash-line.svg'
import useBreakpoint from '../hooks/useBreakpoint'
import useDocumentTitle from '../hooks/useDocumentTitle'
import {Breakpoint, Layout, NavSidebar, RightSidebar} from '../types/constEnums'
import makeMinWidthMediaQuery from '../utils/makeMinWidthMediaQuery'
import MeetingCard from './MeetingCard'
import MeetingsDashEmpty from './MeetingsDashEmpty'
import useTransition from '../hooks/useTransition'
// import useTransition, {TransitionStatus} from '../hooks/useTransition'
// import useInitialRender from '~/hooks/useInitialRender'
// import useIsInitializing from '~/hooks/useIsInitializing'
interface Props {
  viewer: MeetingsDash_viewer | null
}

const desktopDashWidestMediaQuery = makeMinWidthMediaQuery(Breakpoint.DASH_BREAKPOINT_WIDEST)

const Wrapper = styled('div')({
  display: 'flex',
  height: '100%',
  margin: '0 auto',
  width: '100%',
  [desktopDashWidestMediaQuery]: {
    paddingLeft: NavSidebar.WIDTH,
    paddingRight: RightSidebar.WIDTH
  }
})

const InnerContainer = styled('div')<{maybeTabletPlus: boolean}>(({maybeTabletPlus}) => ({
  display: 'flex',
  flexWrap: 'wrap',
  margin: '0 auto auto',
  maxWidth: Layout.TASK_COLUMNS_MAX_WIDTH,
  padding: maybeTabletPlus ? '16px 0 0 16px' : '16px 16px 0',
  width: '100%'
}))

const EmptyContainer = styled('div')({
  display: 'flex',
  flex: 1,
  height: '100%',
  margin: '0 auto',
  maxWidth: Layout.TASK_COLUMNS_MAX_WIDTH,
  padding: 16,
  position: 'relative'
})

const Squiggle = styled('img')({
  bottom: 80,
  display: 'block',
  position: 'absolute',
  right: 160
})

const Flash = styled('img')({
  bottom: 56,
  display: 'block',
  position: 'absolute',
  right: -32
})

const MeetingsDash = (props: Props) => {
  const {viewer} = props
  const teams = viewer?.teams ?? []
  const activeMeetings = teams.flatMap((team) => team.activeMeetings)
  // useTransition wants a key so here ya go
  const meetings = activeMeetings.map((meeting) => ({key: meeting.id, ...meeting}))
  const hasMeetings = activeMeetings.length > 0
  const transitionMeetings = useTransition(meetings)
  const maybeTabletPlus = useBreakpoint(Breakpoint.FUZZY_TABLET)
  const maybeBigDisplay = useBreakpoint(1900)
  // const isInitialRender = useIsInitializing()
  // const isInit = useInitialRender()
  useDocumentTitle('Meetings | Parabol', 'Meetings')
  if (!viewer) return null
  return (
    <Wrapper>
      {hasMeetings ? (
        <InnerContainer maybeTabletPlus={maybeTabletPlus}>
          {transitionMeetings.map(({onTransitionEnd, child, status}, idx) => (
            <MeetingCard key={idx} meeting={child} status={status} onTransitionEnd={onTransitionEnd} />
          ))}
        </InnerContainer>
      ) : (
        <EmptyContainer>
          <MeetingsDashEmpty />
          {maybeBigDisplay ? (
            <>
              <Squiggle src={blueSquiggle} />
              <Flash src={yellowFlashLine} />
            </>
          ) : null}
        </EmptyContainer>
      )}
    </Wrapper>
  )
}

graphql`
  fragment MeetingsDashActiveMeetings on Team {
    activeMeetings {
      id
      ...MeetingCard_meeting
      ...useSnacksForNewMeetings_meetings
    }
  }
`

export default createFragmentContainer(MeetingsDash, {
  viewer: graphql`
    fragment MeetingsDash_viewer on User {
      teams {
        ...MeetingsDashActiveMeetings @relay(mask: false)
      }
    }
  `
})
