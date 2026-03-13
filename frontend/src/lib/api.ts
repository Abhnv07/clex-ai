export type Inbox = {
  id: string
  address: string
  createdAt: number
  expiresAt: number
}

export type Email = {
  id: string
  inboxId: string
  from: string | null
  to: string
  subject: string
  html: string
  text: string | null
  receivedAt: number
}

export type EmailsResponse = {
  emails: Email[]
  latestReceivedAt: number
}

const BASE = ''

async function handleJson<T>(res: Response): Promise<T> {
  const data = await res.json()
  if (!res.ok) {
    const message = data?.error || res.statusText
    throw new Error(message)
  }
  return data as T
}

export async function createInbox(): Promise<Inbox> {
  const res = await fetch(`${BASE}/api/inboxes`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
  })
  return handleJson<Inbox>(res)
}

export async function getInbox(id: string): Promise<Inbox> {
  const res = await fetch(`${BASE}/api/inboxes/${encodeURIComponent(id)}`)
  return handleJson<Inbox>(res)
}

export async function deleteInbox(id: string): Promise<{ ok: boolean }> {
  const res = await fetch(`${BASE}/api/inboxes/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
  return handleJson<{ ok: boolean }>(res)
}

export async function getInboxEmails(
  id: string,
  since?: number,
): Promise<EmailsResponse> {
  const url = new URL(`${BASE}/api/inboxes/${encodeURIComponent(id)}/emails`, window.location.origin)
  if (since && since > 0) {
    url.searchParams.set('since', String(since))
  }
  const res = await fetch(url.toString())
  return handleJson<EmailsResponse>(res)
}

