import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { useInbox } from './hooks/useInbox'

function CustomCursor() {
  const dotRef = useRef<HTMLDivElement | null>(null)
  const ringRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const dot = dotRef.current
    const ring = ringRef.current
    if (!dot || !ring) return

    let rafId: number | null = null
    let targetX = window.innerWidth / 2
    let targetY = window.innerHeight / 2
    let ringX = targetX
    let ringY = targetY

    const isInteractive = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false
      return (
        el.dataset.cursor === 'interactive' ||
        el.tagName === 'BUTTON' ||
        el.tagName === 'A' ||
        el.getAttribute('role') === 'button'
      )
    }

    const onMove = (e: MouseEvent) => {
      targetX = e.clientX
      targetY = e.clientY
      dot.style.transform = `translate3d(${targetX}px, ${targetY}px, 0)`

      if (isInteractive(e.target)) {
        ring.classList.add('cursor-interactive')
      } else {
        ring.classList.remove('cursor-interactive')
      }
    }

    const loop = () => {
      const lerpFactor = 0.18
      ringX += (targetX - ringX) * lerpFactor
      ringY += (targetY - ringY) * lerpFactor
      ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`
      rafId = window.requestAnimationFrame(loop)
    }

    const onLeave = () => {
      dot.classList.add('cursor-hidden')
      ring.classList.add('cursor-hidden')
    }

    const onEnter = () => {
      dot.classList.remove('cursor-hidden')
      ring.classList.remove('cursor-hidden')
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseleave', onLeave)
    window.addEventListener('mouseenter', onEnter)
    rafId = window.requestAnimationFrame(loop)

    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseleave', onLeave)
      window.removeEventListener('mouseenter', onEnter)
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId)
      }
    }
  }, [])

  return (
    <>
      <div ref={dotRef} className="cursor-dot" aria-hidden="true" />
      <div ref={ringRef} className="cursor-ring" aria-hidden="true" />
    </>
  )
}

function App() {
  const {
    inbox,
    emails,
    loading,
    error,
    hasInbox,
    expiresInMs,
    generateInbox,
    refreshEmails,
    destroyInbox,
    copyAddress,
    copied,
  } = useInbox()

  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null)

  const selectedEmail = useMemo(
    () => emails.find((e) => e.id === selectedEmailId) ?? emails[0] ?? null,
    [emails, selectedEmailId],
  )

  useEffect(() => {
    if (!emails.length) {
      setSelectedEmailId(null)
      return
    }
    if (!selectedEmailId) {
      setSelectedEmailId(emails[0].id)
    }
  }, [emails, selectedEmailId])

  const expiresLabel = useMemo(() => {
    if (!inbox) return null
    const totalSeconds = Math.max(0, Math.floor(expiresInMs / 1000))
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    const mm = String(minutes).padStart(2, '0')
    const ss = String(seconds).padStart(2, '0')
    return `${mm}:${ss}`
  }, [expiresInMs, inbox])

  return (
    <>
      <CustomCursor />
      <main className="app-shell">
        <div className="bg-gradient-layer" />
        <div className="bg-orbit-layer" />
        <div className="bg-noise-layer" />

        <div className="app-grid">
          <section className="hero-stack">
            <header
              className="glass-panel hero-card"
              aria-label="modih.in disposable email hero"
            >
              <div className="hero-orbits" aria-hidden="true" />
              <div className="hero-content">
                <div className="neon-pill">
                  <span className="hero-pill-icon" />
                  <span>Disposable inboxes for the modern web</span>
                </div>
                <h1 className="hero-title">
                  Grab your free{' '}
                  <span className="text-gradient">@modih.in</span>{' '}
                  <span>email today.</span>
                </h1>
                <div className="hero-subtitle hero-subtitle-rows">
                  <p>
                    Spin up a beautiful, burner-grade inbox in a click. No
                    signup, no passwords, no nonsense—just a clean
                    <code> random@modih.in </code>
                    address that auto-expires in 30 minutes.
                  </p>
                  <p>
                    <strong>
                      Perfect for trials, newsletters, and one-off verifications
                    </strong>{' '}
                    without sacrificing your real inbox.
                  </p>
                </div>
                <div className="hero-accent-row">
                  <span>
                    <span className="hero-accent-pulse" />
                    Live inbox updates
                  </span>
                  <span>• 30 minute auto-expiry</span>
                  <span>• One-click copy, refresh, delete</span>
                </div>
                <div className="hero-ctas">
                  <button
                    className="pill-button"
                    data-cursor="interactive"
                    onClick={generateInbox}
                    disabled={loading}
                  >
                    {loading ? 'Generating…' : 'Generate disposable inbox'}
                  </button>
                  <button
                    className="pill-button secondary"
                    data-cursor="interactive"
                    onClick={() => {
                      document
                        .getElementById('how-it-works')
                        ?.scrollIntoView({ behavior: 'smooth' })
                    }}
                  >
                    View how it works
                  </button>
                </div>
                <div className="hero-metadata">
                  <span>
                    <span className="badge-dot" />
                    No login. No tracking. Just mail.
                  </span>
                  <span className="hero-metadata-kpi">
                    <span className="hero-kpi-number">30:00</span> ttl per
                    inbox
                  </span>
                </div>
                <div className="hero-code-strip" aria-hidden="true">
                  <span className="hero-code-pill-badge">
                    Now accepting mail at
                  </span>
                  <span className="hero-code-pill-key">inbox@modih.in</span>
                  <span className="hero-code-pill-value">
                    curl -X POST https://modih.in/api/inboxes
                  </span>
                </div>
              </div>
            </header>

            <footer className="section-footer" aria-label="Highlights">
              <span>
                <strong>Zero-config on your side.</strong> All storage,
                routing, and cleanup runs on Cloudflare&apos;s edge.
              </span>
              <span>
                <strong>Privacy-first rendering.</strong> HTML is safely
                sanitized with scripts and trackers stripped.
              </span>
            </footer>
          </section>

          <section aria-label="Temp inbox preview">
            <div className="glass-panel inbox-panel">
              <header className="inbox-header">
                <div className="inbox-header-main">
                  <p className="inbox-label">Live inbox</p>
                  {inbox ? (
                    <div className="inbox-address-row">
                      <span className="inbox-address">
                        {inbox.address}
                      </span>
                      <button
                        className="pill-button secondary inbox-copy-btn"
                        data-cursor="interactive"
                        onClick={copyAddress}
                      >
                        {copied ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  ) : (
                    <p className="inbox-placeholder">
                      Click &ldquo;Generate disposable inbox&rdquo; to get your
                      own <code>random@modih.in</code> address.
                    </p>
                  )}
                </div>
                <div className="inbox-header-meta">
                  {inbox && (
                    <span className="badge">
                      <span className="badge-dot" />
                      Expires in {expiresLabel}
                    </span>
                  )}
                  <div className="inbox-actions">
                    <button
                      className="pill-button secondary"
                      data-cursor="interactive"
                      onClick={refreshEmails}
                      disabled={!inbox}
                    >
                      Refresh
                    </button>
                    <button
                      className="pill-button danger"
                      data-cursor="interactive"
                      onClick={destroyInbox}
                      disabled={!inbox}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </header>

              {error && (
                <div className="inbox-error">
                  <span>{error}</span>
                </div>
              )}

              <div className="inbox-body">
                <div className="inbox-list" aria-label="Email list">
                  {!hasInbox && (
                    <div className="inbox-empty">
                      <p>No inbox yet.</p>
                      <p>Generate one to start catching emails in real time.</p>
                    </div>
                  )}
                  {hasInbox && !emails.length && (
                    <div className="inbox-empty">
                      <p>Waiting for your first email…</p>
                      <p>
                        Send anything to <strong>{inbox?.address}</strong> and
                        it will appear here.
                      </p>
                    </div>
                  )}
                  {emails.map((mail) => (
                    <button
                      key={mail.id}
                      className={`inbox-list-item${
                        selectedEmail?.id === mail.id ? ' selected' : ''
                      }`}
                      type="button"
                      onClick={() => setSelectedEmailId(mail.id)}
                    >
                      <div className="inbox-list-item-top">
                        <span className="inbox-list-subject">
                          {mail.subject}
                        </span>
                        <span className="inbox-list-from">
                          {mail.from || '(unknown sender)'}
                        </span>
                      </div>
                      <div className="inbox-list-meta">
                        <span className="inbox-list-to">
                          to {mail.to.split('@')[0]}
                        </span>
                        <span className="inbox-list-time">
                          {new Date(mail.receivedAt).toLocaleTimeString()}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="inbox-viewer" aria-label="Email content viewer">
                  {!selectedEmail && (
                    <div className="inbox-viewer-empty">
                      <p>Select an email to view its content.</p>
                    </div>
                  )}
                  {selectedEmail && (
                    <>
                      <header className="inbox-viewer-header">
                        <div>
                          <h2 className="inbox-viewer-subject">
                            {selectedEmail.subject}
                          </h2>
                          <p className="inbox-viewer-from">
                            From{' '}
                            <strong>
                              {selectedEmail.from || '(unknown sender)'}
                            </strong>
                          </p>
                        </div>
                      </header>
                      <section className="inbox-viewer-body">
                        <article
                          className="inbox-html"
                          dangerouslySetInnerHTML={{
                            __html:
                              selectedEmail.html ||
                              (selectedEmail.text
                                ? `<pre>${selectedEmail.text}</pre>`
                                : '<p>(no content)</p>'),
                          }}
                        />
                      </section>
                    </>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </>
  )
}

export default App
