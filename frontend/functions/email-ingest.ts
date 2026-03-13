import type { Env } from './_utils'

type EmailMessage = {
  from: string
  to: string
  headers: Map<string, string>
  raw: ReadableStream
  setReject: (reason: string) => void
  setBounce: (options: { code?: number; message?: string }) => void
  getText: () => Promise<string>
  getHtml: () => Promise<string | null>
}

export default {
  async email(message: EmailMessage, env: Env, ctx: ExecutionContext) {
    const toAddress = (message.to || '').toLowerCase().trim()
    const [localPart] = toAddress.split('@')

    if (!localPart) {
      message.setReject('Missing local part')
      return
    }

    const inboxAddress = `${localPart}@modih.in`
    const inboxRow = await env.DB.prepare(
      `
        SELECT id, expires_at
        FROM inboxes
        WHERE address = ?1
      `,
    )
      .bind(inboxAddress)
      .first<{ id: string; expires_at: number }>()

    if (!inboxRow) {
      message.setReject('Inbox not found')
      return
    }

    if (inboxRow.expires_at <= Date.now()) {
      message.setReject('Inbox expired')
      return
    }

    const textBody = await message.getText()
    const htmlBody = await message.getHtml()

    const id = crypto.randomUUID()
    const receivedAt = Date.now()

    ctx.waitUntil(
      env.DB.prepare(
        `
          INSERT INTO emails (
            id,
            inbox_id,
            from_address,
            to_address,
            subject,
            html_body,
            text_body,
            received_at
          )
          VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
        `,
      )
        .bind(
          id,
          inboxRow.id,
          message.from || null,
          inboxAddress,
          message.headers.get('subject') || null,
          htmlBody,
          textBody,
          receivedAt,
        )
        .run(),
    )
  },
} satisfies ExportedHandler<Env>

