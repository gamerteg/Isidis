import { useEffect, useRef } from 'react'

interface UseAutoRefreshOptions {
  enabled?: boolean
  intervalMs?: number
}

export function useAutoRefresh(
  refresh: () => void | Promise<void>,
  options: UseAutoRefreshOptions = {}
) {
  const { enabled = true, intervalMs = 30_000 } = options
  const refreshRef = useRef(refresh)

  useEffect(() => {
    refreshRef.current = refresh
  }, [refresh])

  useEffect(() => {
    if (!enabled) {
      return
    }

    const runRefresh = () => {
      void refreshRef.current()
    }

    const intervalId = window.setInterval(runRefresh, intervalMs)
    const handleFocus = () => runRefresh()
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        runRefresh()
      }
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [enabled, intervalMs])
}
