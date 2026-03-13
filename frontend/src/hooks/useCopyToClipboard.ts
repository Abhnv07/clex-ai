import { useCallback, useState } from 'react'

export function useCopyToClipboard(timeoutMs = 1600) {
  const [copied, setCopied] = useState(false)

  const copy = useCallback(
    async (value: string) => {
      try {
        await navigator.clipboard.writeText(value)
        setCopied(true)
        window.setTimeout(() => setCopied(false), timeoutMs)
      } catch {
        setCopied(false)
      }
    },
    [timeoutMs],
  )

  return { copied, copy }
}

