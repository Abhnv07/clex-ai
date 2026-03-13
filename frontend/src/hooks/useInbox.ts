import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Email, Inbox } from '../lib/api'
import { createInbox, deleteInbox, getInboxEmails } from '../lib/api'
import { useCopyToClipboard } from './useCopyToClipboard'
import { useIntervalPoll } from './useIntervalPoll'

type InboxState = {
  inbox: Inbox | null
  emails: Email[]
  loading: boolean
  error: string | null
}

export function useInbox() {
  const [state, setState] = useState<InboxState>({
    inbox: null,
    emails: [],
    loading: false,
    error: null,
  })
  const [latestReceivedAt, setLatestReceivedAt] = useState<number>(0)

  const { copied, copy } = useCopyToClipboard()

  const hasInbox = !!state.inbox

  const sortedEmails = useMemo(
    () => [...state.emails].sort((a, b) => b.receivedAt - a.receivedAt),
    [state.emails],
  )

  const loadEmails = useCallback(
    async (opts?: { incremental?: boolean }) => {
      if (!state.inbox) return
      try {
        const since = opts?.incremental ? latestReceivedAt : undefined
        const { emails, latestReceivedAt: newLatest } = await getInboxEmails(
          state.inbox.id,
          since,
        )
        setState((prev) => ({
          ...prev,
          emails: opts?.incremental ? [...emails, ...prev.emails] : emails,
        }))
        setLatestReceivedAt((prev) => Math.max(prev, newLatest))
      } catch (err) {
        console.error(err)
      }
    },
    [state.inbox, latestReceivedAt],
  )

  const generateInbox = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }))
    try {
      const inbox = await createInbox()
      setState({
        inbox,
        emails: [],
        loading: false,
        error: null,
      })
      setLatestReceivedAt(0)
      void copy(inbox.address)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to create inbox'
      setState((prev) => ({ ...prev, loading: false, error: message }))
    }
  }, [copy])

  const refreshEmails = useCallback(async () => {
    await loadEmails({ incremental: false })
  }, [loadEmails])

  const destroyInbox = useCallback(async () => {
    if (!state.inbox) return
    try {
      await deleteInbox(state.inbox.id)
    } catch (err) {
      console.error(err)
    } finally {
      setState({
        inbox: null,
        emails: [],
        loading: false,
        error: null,
      })
      setLatestReceivedAt(0)
    }
  }, [state.inbox])

  useEffect(() => {
    if (!state.inbox) return
    void loadEmails({ incremental: false })
  }, [state.inbox, loadEmails])

  useIntervalPoll(
    () => {
      if (!state.inbox) return
      if (document.visibilityState !== 'visible') return
      void loadEmails({ incremental: true })
    },
    state.inbox ? 5000 : null,
  )

  const expiresInMs = state.inbox
    ? Math.max(0, state.inbox.expiresAt - Date.now())
    : 0

  return {
    inbox: state.inbox,
    emails: sortedEmails,
    loading: state.loading,
    error: state.error,
    copied,
    hasInbox,
    expiresInMs,
    generateInbox,
    refreshEmails,
    destroyInbox,
    copyAddress: () => {
      if (!state.inbox) return
      void copy(state.inbox.address)
    },
  }
}

