'use client'
import { useRef, useState } from 'react'
import { uploadAvatar } from '../actions'

export default function AvatarUploadForm() {
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const formRef = useRef<HTMLFormElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) setPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formRef.current) return
    setUploading(true)
    setError('')
    try {
      const fd = new FormData(formRef.current)
      await uploadAvatar(fd)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      setUploading(false)
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="join-form">
      <div className="avatar-preview-wrap">
        {preview
          ? <img src={preview} alt="Preview" className="avatar-preview" />
          : <div className="avatar-preview avatar-preview--empty"><span>?</span></div>
        }
      </div>
      <div>
        <label className="wsc-label" htmlFor="avatar-file">
          Photo (JPEG / PNG / WebP, max 5 MB)
        </label>
        <input
          id="avatar-file"
          name="file"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required
          className="wsc-input"
          style={{ marginTop: 6 }}
          onChange={handleFileChange}
        />
      </div>
      {error && <p style={{ color: 'var(--error, #f87171)', margin: 0 }}>{error}</p>}
      <button
        type="submit"
        className="wsc-btn wsc-btn-primary"
        style={{ width: '100%' }}
        disabled={uploading}
      >
        {uploading ? 'Uploading…' : 'Save photo and continue'}
      </button>
    </form>
  )
}
