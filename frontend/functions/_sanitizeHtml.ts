const BLOCKED_TAGS = ['script', 'style', 'iframe', 'object', 'embed', 'link']

const DANGEROUS_ATTR_PREFIXES = ['on'] // onload, onclick, etc.
const DANGEROUS_ATTR_NAMES = ['style']

const URL_ATTRS = ['href', 'src', 'xlink:href']

function isSafeUrl(url: string): boolean {
  const trimmed = url.trim().toLowerCase()
  if (!trimmed) return true
  if (trimmed.startsWith('javascript:')) return false
  if (trimmed.startsWith('data:')) return false
  return true
}

export function sanitizeHtml(input: string | null | undefined): string {
  if (!input) return ''

  // Remove blocked tags entirely (opening, closing, and their content in a naive way)
  let html = input
  for (const tag of BLOCKED_TAGS) {
    const pattern = new RegExp(
      `<${tag}[^>]*>[\\s\\S]*?<\\/${tag}>`,
      'gi',
    )
    html = html.replace(pattern, '')
  }

  // Remove any remaining standalone opening/closing tags of blocked types
  for (const tag of BLOCKED_TAGS) {
    const openPattern = new RegExp(`<${tag}[^>]*>`, 'gi')
    const closePattern = new RegExp(`<\\/${tag}>`, 'gi')
    html = html.replace(openPattern, '').replace(closePattern, '')
  }

  // Strip dangerous attributes (on*, style) and javascript/data URLs
  html = html.replace(/<([^>]+)>/gi, (full, inside) => {
    const parts = inside.split(/\s+/)
    if (parts.length === 0) return full

    const tagName = parts[0]
    const attrs: string[] = []

    for (let i = 1; i < parts.length; i++) {
      const part = parts[i]
      if (!part) continue
      const [rawName, ...rest] = part.split('=')
      if (!rawName) continue
      const name = rawName.toLowerCase()

      if (DANGEROUS_ATTR_PREFIXES.some((p) => name.startsWith(p))) continue
      if (DANGEROUS_ATTR_NAMES.includes(name)) continue

      if (URL_ATTRS.includes(name) && rest.length > 0) {
        const valueJoined = rest.join('=')
        const value = valueJoined.replace(/^['"]|['"]$/g, '')
        if (!isSafeUrl(value)) continue
      }

      attrs.push(part)
    }

    const rebuilt = [tagName, ...attrs].join(' ')
    return `<${rebuilt}>`
  })

  return html
}

