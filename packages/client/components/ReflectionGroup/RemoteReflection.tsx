import styled from '@emotion/styled'
import graphql from 'babel-plugin-relay/macro'
import React, {RefObject, useEffect, useMemo, useRef} from 'react'
import {commitLocalUpdate, createFragmentContainer} from 'react-relay'
import useAtmosphere from '../../hooks/useAtmosphere'
import useEditorState from '../../hooks/useEditorState'
import {Elevation} from '../../styles/elevation'
import {BezierCurve, DragAttribute, ElementWidth, Times, ZIndex} from '../../types/constEnums'
import {DeepNonNullable} from '../../types/generics'
import {getMinTop} from '../../utils/retroGroup/updateClonePosition'
import {keyframes} from '@emotion/core'
import {RemoteReflection_meeting} from '../../__generated__/RemoteReflection_meeting.graphql'
import {RemoteReflection_reflection} from '../../__generated__/RemoteReflection_reflection.graphql'
import ReflectionCardRoot from '../ReflectionCard/ReflectionCardRoot'
import ReflectionEditorWrapper from '../ReflectionEditorWrapper'
import getBBox from '../RetroReflectPhase/getBBox'
import UserDraggingHeader, {RemoteReflectionArrow} from '../UserDraggingHeader'
import useSpotlightResults from '~/hooks/useSpotlightResults'

// original from https://codepen.io/Maelig/pen/KrjAgq
// scale(0.75)
// translate(-39.5px, 1px)
// transform determined by hand by delta(kanban el, floating el)
// round all decimals, convert to relative
const triquetaPath = `path('m0 0c0 10-8 18-18 18s-18-8-18-18c3-2 6-2 9-2c10 0 18 8 18 18c0 6-3 12-9 16c-6-3-9-9-9-16c0-10 8-18 18-18c3 0 6 0 9 2z')`

const spotlightWiggle = keyframes`
  100% {
    offset-distance: 100%;
  }
`

const RemoteReflectionModal = styled('div')<{
  isInViewerSpotlightResults: boolean
  isDropping?: boolean | null
  transform?: string
  isSpotlight?: boolean
}>(({isInViewerSpotlightResults, isDropping, transform, isSpotlight}) => ({
  position: 'absolute',
  left: 0,
  top: 0,
  boxShadow: isDropping ? Elevation.CARD_SHADOW : Elevation.CARD_DRAGGING,
  pointerEvents: 'none',
  transition: `all ${
    isDropping ? Times.REFLECTION_REMOTE_DROP_DURATION : Times.REFLECTION_DROP_DURATION
  }ms ${BezierCurve.DECELERATE}`,
  transform,
  transformOrigin: '0 0',
  offsetPath: triquetaPath,
  offsetRotate: '0deg',
  animation: isSpotlight && !isDropping ? `${spotlightWiggle} 4s linear infinite;` : undefined,
  zIndex: isInViewerSpotlightResults
    ? ZIndex.REFLECTION_IN_FLIGHT_SPOTLIGHT
    : ZIndex.REFLECTION_IN_FLIGHT
}))

const HeaderModal = styled('div')({
  position: 'absolute',
  left: 0,
  top: 0,
  pointerEvents: 'none',
  width: ElementWidth.REFLECTION_CARD
})

const windowDims = {
  innerWidth: window.innerWidth,
  innerHeight: window.innerHeight
}

const OFFSCREEN_PADDING = 16
const getCoords = (
  remoteDrag: DeepNonNullable<NonNullable<RemoteReflection_reflection['remoteDrag']>>
) => {
  const {
    targetId,
    clientHeight,
    clientWidth,
    clientX,
    clientY,
    targetOffsetX,
    targetOffsetY
  } = remoteDrag
  const targetEl = targetId
    ? (document.querySelector(`div[${DragAttribute.DROPPABLE}='${targetId}']`) as HTMLElement)
    : null
  if (targetEl) {
    const targetBBox = getBBox(targetEl)!
    const minTop = getMinTop(-1, targetEl)
    return {
      left: targetBBox.left + targetOffsetX,
      top: targetBBox.top + targetOffsetY,
      minTop
    }
  }
  return {
    left: (clientX / clientWidth) * windowDims.innerWidth,
    top: (clientY / clientHeight) * windowDims.innerHeight
  }
}

const getHeaderTransform = (ref: RefObject<HTMLDivElement>, topPadding = 18) => {
  if (!ref.current) return {}
  const bbox = ref.current.getBoundingClientRect()
  const minLeft = -ElementWidth.REFLECTION_CARD + OFFSCREEN_PADDING * 8
  const minTop = OFFSCREEN_PADDING + topPadding
  const maxLeft = windowDims.innerWidth - ElementWidth.REFLECTION_CARD - OFFSCREEN_PADDING
  const maxTop = windowDims.innerHeight - OFFSCREEN_PADDING
  const headerLeft = Math.max(minLeft, Math.min(maxLeft, bbox.left))
  const headerTop = Math.max(minTop, Math.min(maxTop, bbox.top))
  const isFloatingHeader = headerLeft !== bbox.left || headerTop !== bbox.top
  if (!isFloatingHeader) return {}
  const arrow =
    headerTop === maxTop
      ? 'arrow_downward'
      : headerLeft === maxLeft
      ? 'arrow_forward'
      : headerLeft === minLeft
      ? 'arrow_back'
      : ('arrow_upward' as RemoteReflectionArrow)
  return {
    arrow,
    headerTransform: `translate(${headerLeft}px,${headerTop}px)`
  }
}

/*
  Having the dragging transform in inline style results in a smoother motion.
  Animations don't work in inline style but these still need to have the correct
  transform applied, thus switch between applying the transformation in inline style
  and in the styled component depending on situation
*/
const getStyle = (
  remoteDrag: RemoteReflection_reflection['remoteDrag'],
  isDropping: boolean | null,
  isSpotlight: boolean,
  style: React.CSSProperties
) => {
  if (isSpotlight && !isDropping) return {transform: style.transform}
  if (isDropping || !remoteDrag?.clientX) return {nextStyle: style}
  const {left, top, minTop} = getCoords(remoteDrag as any)
  const {zIndex} = style
  return {nextStyle: {transform: `translate(${left}px,${top}px)`, zIndex}, minTop}
}

interface Props {
  style: React.CSSProperties
  reflection: RemoteReflection_reflection
  meeting: RemoteReflection_meeting
}

const RemoteReflection = (props: Props) => {
  const {meeting, reflection, style} = props
  const {id: reflectionId, content, isDropping, reflectionGroupId} = reflection
  const {meetingMembers, spotlightGroup} = meeting
  const remoteDrag = reflection.remoteDrag as DeepNonNullable<
    RemoteReflection_reflection['remoteDrag']
  >
  const ref = useRef<HTMLDivElement>(null)
  const [editorState] = useEditorState(content)
  const timeoutRef = useRef(0)
  const atmosphere = useAtmosphere()
  const spotlightResultGroups = useSpotlightResults(spotlightGroup?.id, '') // TODO: add search query
  const isInViewerSpotlightResults = useMemo(
    () => !!spotlightResultGroups?.find(({id}) => id === reflectionGroupId),
    [spotlightResultGroups]
  )

  useEffect(() => {
    timeoutRef.current = window.setTimeout(
      () => {
        commitLocalUpdate(atmosphere, (store) => {
          const reflection = store.get(reflectionId)!
          reflection.setValue(true, 'isDropping')
        })
      },
      remoteDrag?.isSpotlight
        ? Times.REFLECTION_SPOTLIGHT_DRAG_STALE_TIMEOUT
        : Times.REFLECTION_DRAG_STALE_TIMEOUT
    )
    return () => {
      window.clearTimeout(timeoutRef.current)
    }
  }, [remoteDrag])

  useEffect(() => {
    if (!remoteDrag || !meeting) return
    const remoteDragUser = meetingMembers.find((user) => user.userId === remoteDrag.dragUserId)
    if (!remoteDragUser || !remoteDragUser.user.isConnected) {
      commitLocalUpdate(atmosphere, (store) => {
        const reflection = store.get(reflectionId)!
        reflection.setValue(true, 'isDropping')
      })
    }
  }, [remoteDrag, meetingMembers])

  if (!remoteDrag) return null
  const {dragUserId, dragUserName, isSpotlight} = remoteDrag

  const {nextStyle, transform, minTop} = getStyle(remoteDrag, isDropping, isSpotlight, style)

  const {headerTransform, arrow} = getHeaderTransform(ref, minTop)
  console.log({transform})
  return (
    <>
      <RemoteReflectionModal
        ref={ref}
        style={nextStyle}
        isDropping={isDropping}
        isSpotlight={isSpotlight}
        isInViewerSpotlightResults={isInViewerSpotlightResults}
        transform={transform}
      >
        <ReflectionCardRoot>
          {!headerTransform && <UserDraggingHeader userId={dragUserId} name={dragUserName} />}
          <ReflectionEditorWrapper editorState={editorState} readOnly />
        </ReflectionCardRoot>
      </RemoteReflectionModal>
      {headerTransform && (
        <HeaderModal>
          <UserDraggingHeader
            userId={dragUserId}
            name={dragUserName}
            style={{transform: headerTransform}}
            arrow={arrow}
          />
        </HeaderModal>
      )}
    </>
  )
}

export default createFragmentContainer(RemoteReflection, {
  reflection: graphql`
    fragment RemoteReflection_reflection on RetroReflection {
      id
      content
      isDropping
      reflectionGroupId
      remoteDrag {
        dragUserId
        dragUserName
        isSpotlight
        clientHeight
        clientWidth
        clientX
        clientY
        targetId
        targetOffsetX
        targetOffsetY
      }
    }
  `,
  meeting: graphql`
    fragment RemoteReflection_meeting on RetrospectiveMeeting {
      id
      meetingMembers {
        userId
        user {
          isConnected
        }
      }
      spotlightGroup {
        id
      }
    }
  `
})
