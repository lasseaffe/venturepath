// src/components/onboarding/ActionGate.jsx
import { useEffect, useRef } from 'react'

export function ActionGate({ completeOn, onComplete }) {
  const firedRef = useRef(false)
  const onCompleteRef = useRef(onComplete)
  useEffect(() => { onCompleteRef.current = onComplete })

  useEffect(() => {
    firedRef.current = false
    function handleAction(e) {
      if (e.detail?.id === completeOn && !firedRef.current) {
        firedRef.current = true
        onCompleteRef.current()
      }
    }
    window.addEventListener('onboarding:action', handleAction)
    return () => window.removeEventListener('onboarding:action', handleAction)
  }, [completeOn]) // onComplete intentionally excluded via ref
  return null
}
