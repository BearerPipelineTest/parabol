import {Team_team} from '__generated__/Team_team.graphql'
import React, {Component, lazy, Suspense} from 'react'
import styled from 'react-emotion'
import {commitLocalUpdate, createFragmentContainer, graphql} from 'react-relay'
import {RouteComponentProps, withRouter} from 'react-router-dom'
import DashContent from 'universal/components/Dashboard/DashContent'
import DashHeader from 'universal/components/Dashboard/DashHeader'
import DashMain from 'universal/components/Dashboard/DashMain'
import DashSearchControl from 'universal/components/Dashboard/DashSearchControl'
import DashboardAvatars from 'universal/components/DashboardAvatars/DashboardAvatars'
import FlatButton from 'universal/components/FlatButton'
import Icon from 'universal/components/Icon'
import IconLabel from 'universal/components/IconLabel'
import withAtmosphere, {
  WithAtmosphereProps
} from 'universal/decorators/withAtmosphere/withAtmosphere'
import EditableTeamName from 'universal/modules/teamDashboard/components/EditTeamName/EditableTeamName'
import TeamCallsToAction from 'universal/modules/teamDashboard/components/TeamCallsToAction/TeamCallsToAction'
import {PALETTE} from 'universal/styles/paletteV2'
// import DebugButton from 'universal/modules/userDashboard/components/UserDashMain/DebugButton'

const TeamViewNavBlock = styled('div')({
  display: 'flex',
  flexWrap: 'nowrap'
})

const StyledButton = styled(FlatButton)({
  paddingLeft: '1rem',
  paddingRight: '1rem'
})

const IconButton = styled(StyledButton)({
  color: PALETTE.TEXT_LIGHT,
  marginRight: 16,
  padding: '3px 0',
  width: 32,
  ':hover,:focus,:active': {
    color: PALETTE.TEXT_MAIN
  }
})

const RelativeDashMain = styled(DashMain)({
  position: 'relative'
})

const TeamDashHeaderInner = styled('div')({
  alignItems: 'center',
  display: 'flex',
  width: '100%'
})

const BackIcon = styled(Icon)({
  color: 'inherit'
})

const MeetingInProgressModal = lazy(() =>
  import(/* webpackChunkName: 'MeetingInProgressModal' */ '../MeetingInProgressModal/MeetingInProgressModal')
)
const UnpaidTeamModalRoot = lazy(() =>
  import(/* webpackChunkName: 'UnpaidTeamModalRoot' */ 'universal/modules/teamDashboard/containers/UnpaidTeamModal/UnpaidTeamModalRoot')
)

interface Props extends WithAtmosphereProps, RouteComponentProps<{}> {
  team: Team_team | null
  isSettings: boolean
}

class Team extends Component<Props> {
  componentWillReceiveProps (nextProps) {
    const {team: oldTeam} = this.props
    if (oldTeam && oldTeam.contentFilter) {
      if (!nextProps.team || nextProps.team.id !== oldTeam.id) {
        this.setContentFilter('')
      }
    }
  }

  componentWillUnmount () {
    if (this.props.team && this.props.team.contentFilter) {
      this.setContentFilter('')
    }
  }

  setContentFilter (nextValue) {
    const {atmosphere, team} = this.props
    if (!team) return
    const {id: teamId} = team
    commitLocalUpdate(atmosphere, (store) => {
      const teamProxy = store.get(teamId)
      teamProxy && teamProxy.setValue(nextValue, 'contentFilter')
    })
  }

  updateFilter = (e) => {
    this.setContentFilter(e.target.value)
  }
  goToTeamSettings = () => {
    const {history, team} = this.props
    if (!team) return
    const {id: teamId} = team
    history.push(`/team/${teamId}/settings/`)
  }
  goToTeamDashboard = () => {
    const {history, team} = this.props
    if (!team) return
    const {id: teamId} = team
    history.push(`/team/${teamId}/`)
  }

  render () {
    const {children, isSettings, team} = this.props
    if (!team) return null
    const {id: teamId, isPaid, meetingId} = team
    const hasActiveMeeting = Boolean(meetingId)
    const hasOverlay = hasActiveMeeting || !isPaid

    return (
      <RelativeDashMain>
        <Suspense fallback={''}>
          <MeetingInProgressModal team={team} />
          {!isPaid && <UnpaidTeamModalRoot teamId={teamId} />}
        </Suspense>
        <DashHeader
          area={isSettings ? 'teamSettings' : 'teamDash'}
          hasOverlay={hasOverlay}
          key={`team${isSettings ? 'Dash' : 'Settings'}Header`}
        >
          <TeamDashHeaderInner>
            {isSettings ? (
              <>
                <IconButton
                  aria-label='Back to Team Dashboard'
                  key='1'
                  onClick={this.goToTeamDashboard}
                >
                  <BackIcon>arrow_back</BackIcon>
                </IconButton>
                <EditableTeamName team={team} />
              </>
            ) : (
              <DashSearchControl
                onChange={this.updateFilter}
                placeholder='Search Team Tasks & Agenda'
              />
            )}
            {/*<DebugButton />*/}
          </TeamDashHeaderInner>
          <TeamViewNavBlock>
            {!isSettings && (
              <StyledButton aria-label='Team Settings' key='2' onClick={this.goToTeamSettings}>
                <IconLabel icon='settings' label='Team Settings' />
              </StyledButton>
            )}
            <DashboardAvatars team={team} />
            {!isSettings && <TeamCallsToAction teamId={teamId} />}
          </TeamViewNavBlock>
        </DashHeader>
        <DashContent hasOverlay={hasOverlay} padding='0'>
          {children}
        </DashContent>
      </RelativeDashMain>
    )
  }
}

export default createFragmentContainer(withAtmosphere(withRouter(Team)), {
  team: graphql`
    fragment Team_team on Team {
      contentFilter
      id
      isPaid
      meetingId
      ...MeetingInProgressModal_team
      ...DashboardAvatars_team
      ...EditableTeamName_team
    }
  `
})