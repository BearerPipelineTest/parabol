import React, {useCallback, useEffect, useLayoutEffect, useRef} from 'react'
import useAtmosphere from 'universal/hooks/useAtmosphere'
import useRefState from 'universal/hooks/useRefState'
import usePortal from 'universal/hooks/usePortal'
import useTransition from 'universal/hooks/useTransition'
import shortid from 'shortid'
import styled from 'react-emotion'
import SnackbarMessage from './SnackbarMessage'

const MAX_SNACKS = 1

const Modal = styled('div')({
  alignItems: 'center',
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  justifyContent: 'flex-end',
  left: 0,
  padding: 8,
  position: 'absolute',
  top: 0,
  width: '100%',
  pointerEvents: 'none'
})

export type SnackbarRemoveFn = (snack: Snack) => boolean

export interface SnackAction {
  label: string
  callback: () => void
}

export interface Snack {
  key: string // string following format: `type` OR `type:variable`
  message: string
  autoDismiss: number // seconds. 0 means never dismiss
  action?: SnackAction
  secondaryAction?: SnackAction
}

const Snackbar = () => {
  const snackQueueRef = useRef<Snack[]>([])
  const [snacksRef, setActiveSnacks] = useRefState<Snack[]>([])
  const atmosphere = useAtmosphere()
  const {openPortal, terminatePortal, portal} = usePortal({id: 'snackbar'})
  const transitionChildren = useTransition(snacksRef.current)
  const transitionChildrenRef = useRef(transitionChildren)

  // used to ensure the snack isn't dismissed when the cursor is on it
  const [hoveredSnackRef, setHoveredSnack] = useRefState<Snack | null>(null)
  const dismissOnLeaveRef = useRef<Snack>()

  transitionChildrenRef.current = transitionChildren

  const filterSnacks = useCallback((removeFn: SnackbarRemoveFn) => {
    const filterFn = (snack: Snack) => !removeFn(snack)
    snackQueueRef.current = snackQueueRef.current.filter(filterFn)
    const nextSnacks = snacksRef.current.filter(filterFn)
    if (nextSnacks.length !== snacksRef.current.length) {
      setActiveSnacks(nextSnacks)
    }
  }, [])

  const dismissSnack = useCallback((snackToDismiss: Snack) => {
    filterSnacks((snack: Snack) => snack === snackToDismiss)
  }, [])

  const showSnack = useCallback((snack: Snack) => {
    setActiveSnacks([...snacksRef.current, snack])
    if (snack.autoDismiss !== 0) {
      setTimeout(() => {
        if (hoveredSnackRef.current === snack) {
          dismissOnLeaveRef.current = snack
        } else {
          dismissSnack(snack)
        }
      }, snack.autoDismiss * 1000)
    }
  }, [])

  const onMouseEnter = (snack: Snack) => () => {
    setHoveredSnack(snack)
  }

  const onMouseLeave = () => {
    if (dismissOnLeaveRef.current) {
      dismissSnack(dismissOnLeaveRef.current)
      dismissOnLeaveRef.current = undefined
    }
    setHoveredSnack(null)
  }

  // handle events
  useEffect(() => {
    const handleAdd = (snack) => {
      const dupeFilter = ({key}: Snack) => key === snack.key
      const snackInQueue = snackQueueRef.current.find(dupeFilter)
      const snackIsActive = snacksRef.current.find(dupeFilter)
      if (snackInQueue || snackIsActive) return
      const keyedSnack = {key: shortid.generate(), ...snack}
      if (transitionChildrenRef.current.length < MAX_SNACKS) {
        showSnack(keyedSnack)
      } else {
        snackQueueRef.current.push(keyedSnack)
      }
    }
    atmosphere.eventEmitter.on('addSnackbar', handleAdd)
    atmosphere.eventEmitter.on('removeSnackbar', filterSnacks)
    return () => {
      atmosphere.eventEmitter.off('addSnackbar', handleAdd)
      atmosphere.eventEmitter.off('removeSnackbar', filterSnacks)
    }
  }, [])

  // handle portal
  useLayoutEffect(() => {
    if (transitionChildren.length === 0 && snackQueueRef.current.length === 0) {
      terminatePortal()
    } else {
      openPortal()
    }
  }, [transitionChildren])

  // handle queue
  useEffect(() => {
    if (snackQueueRef.current.length > 0 && transitionChildren.length < MAX_SNACKS) {
      showSnack(snackQueueRef.current.shift()!)
    }
  }, [transitionChildren])

  return portal(
    <Modal>
      {transitionChildren.map(({child, onTransitionEnd, status}) => {
        return (
          <SnackbarMessage
            key={child.key}
            message={child.message}
            action={child.action}
            secondaryAction={child.secondaryAction}
            status={status}
            onTransitionEnd={onTransitionEnd}
            dismissSnack={() => dismissSnack(child)}
            onMouseEnter={onMouseEnter(child)}
            onMouseLeave={onMouseLeave}
          />
        )
      })}
    </Modal>
  )
}

export default Snackbar
