// src/components/onboarding/ActionGate.tsx
import { useEffect, useRef } from 'react'

interface ActionGateProps {
  completeOn: string
  onComplete: () => void
  active?: boolean
}

/**
 * Listens for a window-level CustomEvent named 'onboarding:action' with
 * `detail.id === completeOn`. Fires `onComplete` exactly once per active
 * mount. Use `active={false}` to disarm.
 *
 * The `onCompleteRef` pattern stabilises the callback so re-renders that
 * change `onComplete` do not re-attach the listener.
 */
export function ActionGate({ completeOn, onComplete, active = true }: ActionGateProps) {
  const firedRef = useRef(false)
  const onCompleteRef = useRef(onComplete)

  useEffect(() => {
    onCompleteRef.current = onComplete
  })

  useEffect(() => {
    if (!active) return
    firedRef.current = false

    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ id: string }>
      if (ce.detail?.id === completeOn && !firedRef.current) {
        firedRef.current = true
        onCompleteRef.current()
      }
    }

    window.addEventListener('onboarding:action', handler)
    return () => window.removeEventListener('onboarding:action', handler)
  }, [completeOn, active])

  return null
}
