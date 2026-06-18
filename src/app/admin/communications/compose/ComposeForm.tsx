'use client'
import { useActionState, useState, useRef } from 'react'
import { sendCommunicationAction, uploadCommAttachment } from '../actions'

const SENDER_TITLES = [
  'President',
  'Vice President',
  'Education Director',
  'Club Secretary',
  'Social Secretary',
  'Development Manager',
  'Treasurer',
]

type RecipientEntry = {
  email: string
  name: string
  recipient_type: 'member' | 'signup' | 'external'
  source_id?: string
}

type MemberOption = { id: string; name: string; email: string }
type SignupOption = { id: string; name: string; email: string }
type EnquirerOption = { id: string; name: string; email: string }
type MediaOption = { key: string; url: string; label: string }

const initial = { error: null, success: false }

export default function ComposeForm({
  members,
  signups,
  enquirers,
  mediaOptions,
}: {
  members: MemberOption[]
  signups: SignupOption[]
  enquirers: EnquirerOption[]
  mediaOptions: MediaOption[]
}) {
  const [state, formAction, pending] = useActionState(sendCommunicationAction, initial)
  const [recipients, setRecipients] = useState<RecipientEntry[]>([])
  const [attachmentUrls, setAttachmentUrls] = useState<string[]>([])
  const [selectedMedia, setSelectedMedia] = useState<Set<string>>(new Set())
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [extName, setExtName] = useState('')
  const [extEmail, setExtEmail] = useState('')
  const [showMedia, setShowMedia] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function addGroup(group: 'members' | 'signups' | 'enquirers') {
    const source: RecipientEntry[] =
      group === 'members'
        ? members.map(m => ({ email: m.email, name: m.name, recipient_type: 'member', source_id: m.id }))
        : group === 'signups'
        ? signups.map(s => ({ email: s.email, name: s.name, recipient_type: 'signup', source_id: s.id }))
        : enquirers.map(e => ({ email: e.email, name: e.name, recipient_type: 'external', source_id: e.id }))

    setRecipients(prev => {
      const existing = new Set(prev.map(r => r.email))
      return [...prev, ...source.filter(r => !existing.has(r.email))]
    })
  }

  function removeRecipient(email: string) {
    setRecipients(prev => prev.filter(r => r.email !== email))
  }

  function addExternal() {
    const trimEmail = extEmail.trim()
    const trimName = extName.trim() || trimEmail
    if (!trimEmail || !trimEmail.includes('@')) return
    if (recipients.some(r => r.email === trimEmail)) return
    setRecipients(prev => [...prev, { email: trimEmail, name: trimName, recipient_type: 'external' }])
    setExtName('')
    setExtEmail('')
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError(null)
    const fd = new FormData()
    fd.set('file', file)
    const result = await uploadCommAttachment(fd)
    setUploading(false)
    if (result.error || !result.url) {
      setUploadError(result.error ?? 'Upload failed')
      return
    }
    setAttachmentUrls(prev => [...prev, result.url!])
    if (fileRef.current) fileRef.current.value = ''
  }

  function toggleMedia(url: string) {
    setSelectedMedia(prev => {
      const next = new Set(prev)
      if (next.has(url)) next.delete(url)
      else next.add(url)
      return next
    })
  }

  const allAttachmentUrls = [...attachmentUrls, ...Array.from(selectedMedia)]

  if (state.success && !state.error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--ink)', fontSize: 18, fontFamily: 'var(--serif)' }}>Communication sent.</p>
        <a href="/admin/communications" className="wsc-btn wsc-btn-primary wsc-btn-sm" style={{ marginTop: '1rem', display: 'inline-block' }}>
          View all communications
        </a>
      </div>
    )
  }

  return (
    <form
      action={formAction}
      style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 760 }}
    >
      {/* hidden fields */}
      <input type="hidden" name="recipients" value={JSON.stringify(recipients)} />
      <input type="hidden" name="attachment_urls" value={JSON.stringify(allAttachmentUrls)} />

      {/* Subject */}
      <div>
        <label className="wsc-label" htmlFor="comm-subject">Subject</label>
        <input id="comm-subject" name="subject" className="wsc-input" type="text" required placeholder="Email subject line" />
      </div>

      {/* Sender title */}
      <div>
        <label className="wsc-label" htmlFor="comm-title">Sender title</label>
        <select id="comm-title" name="sender_title" className="wsc-input" required>
          <option value="">Select a title…</option>
          {SENDER_TITLES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Body */}
      <div>
        <label className="wsc-label" htmlFor="comm-body">Message</label>
        <textarea id="comm-body" name="body" className="wsc-input wsc-textarea" rows={8} required placeholder="Write your message…" />
      </div>

      {/* Recipients */}
      <div>
        <label className="wsc-label">Recipients</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          <button type="button" className="wsc-btn wsc-btn-sm" onClick={() => addGroup('members')}>
            + All active members ({members.length})
          </button>
          <button type="button" className="wsc-btn wsc-btn-sm" onClick={() => addGroup('signups')}>
            + Past signups ({signups.length})
          </button>
          <button type="button" className="wsc-btn wsc-btn-sm" onClick={() => addGroup('enquirers')}>
            + Past enquirers ({enquirers.length})
          </button>
        </div>

        {recipients.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12, maxHeight: 200, overflowY: 'auto', border: '1px solid var(--rule-soft)', borderRadius: 6, padding: 8 }}>
            {recipients.map(r => (
              <div key={r.email} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
                <span>
                  <span style={{ fontWeight: 500, color: 'var(--ink-2)' }}>{r.name}</span>
                  <span style={{ color: 'var(--ink-4)', marginLeft: 6 }}>{r.email}</span>
                  <span className={`wsc-tag ${r.recipient_type === 'member' ? 'wsc-tag-sage' : r.recipient_type === 'signup' ? 'wsc-tag-gold' : ''}`} style={{ marginLeft: 6 }}>
                    {r.recipient_type}
                  </span>
                </span>
                <button type="button" onClick={() => removeRecipient(r.email)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-4)', fontSize: 16, lineHeight: 1, padding: '0 4px' }}>×</button>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label className="wsc-label" htmlFor="ext-name" style={{ fontSize: 12 }}>Name</label>
            <input id="ext-name" className="wsc-input" value={extName} onChange={e => setExtName(e.target.value)} placeholder="External person" />
          </div>
          <div style={{ flex: 2 }}>
            <label className="wsc-label" htmlFor="ext-email" style={{ fontSize: 12 }}>Email</label>
            <input id="ext-email" className="wsc-input" type="email" value={extEmail} onChange={e => setExtEmail(e.target.value)} placeholder="email@example.com" />
          </div>
          <button type="button" className="wsc-btn wsc-btn-sm" onClick={addExternal} style={{ marginBottom: 1 }}>Add</button>
        </div>

        {recipients.length === 0 && (
          <p style={{ color: 'var(--ink-4)', fontSize: 13, marginTop: 8 }}>No recipients selected.</p>
        )}
        {recipients.length > 0 && (
          <p style={{ color: 'var(--ink-3)', fontSize: 13, marginTop: 8 }}>{recipients.length} recipient{recipients.length !== 1 ? 's' : ''} selected.</p>
        )}
      </div>

      {/* Attachments */}
      <div>
        <label className="wsc-label">Attachments</label>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div>
            <label className="wsc-label" style={{ fontSize: 12 }}>Upload new file (max 10 MB)</label>
            <input ref={fileRef} type="file" onChange={handleFileUpload} disabled={uploading} style={{ display: 'block' }} />
            {uploading && <p style={{ color: 'var(--ink-4)', fontSize: 13, marginTop: 4 }}>Uploading…</p>}
            {uploadError && <p style={{ color: 'var(--error, #ef4444)', fontSize: 13, marginTop: 4 }}>{uploadError}</p>}
          </div>

          {mediaOptions.length > 0 && (
            <div>
              <button type="button" className="wsc-btn wsc-btn-sm" onClick={() => setShowMedia(v => !v)}>
                {showMedia ? 'Hide' : 'Pick from'} media library ({mediaOptions.length} items)
              </button>
              {showMedia && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  {mediaOptions.map(m => (
                    <label key={m.url} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                      <input type="checkbox" checked={selectedMedia.has(m.url)} onChange={() => toggleMedia(m.url)} />
                      {m.label}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {allAttachmentUrls.length > 0 && (
            <ul style={{ fontSize: 13, color: 'var(--ink-2)', margin: 0, paddingLeft: 16 }}>
              {allAttachmentUrls.map(url => (
                <li key={url}>{url.split('/').pop()}</li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Errors */}
      {state.error && (
        <p style={{ color: 'var(--error, #ef4444)', fontSize: 13, margin: 0 }}>{state.error}</p>
      )}

      <div>
        <button type="submit" className="wsc-btn wsc-btn-primary" disabled={pending || uploading}>
          {pending ? 'Sending…' : `Send to ${recipients.length} recipient${recipients.length !== 1 ? 's' : ''}`}
        </button>
      </div>
    </form>
  )
}
