import { useEffect, useRef } from 'react'

export function useIntervalPoll(callback: () => void, delayMs: number | null) {
  const savedCallback = useRef<() => void>(() => {})

  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  useEffect(() => {
    if (delayMs === null) return

    let id: number | null = null

    const tick = () => {
      savedCallback.current()
      id = window.setTimeout(tick, delayMs)
    }

    id = window.setTimeout(tick, delayMs)

    return () => {
      if (id !== null) {
        window.clearTimeout(id)
      }
    }
  }, [delayMs])
}

