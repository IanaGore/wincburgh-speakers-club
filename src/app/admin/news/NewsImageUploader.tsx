'use client'
import { useEffect, useRef, useState } from 'react'
import { uploadMediaPhoto } from '../media/actions'

interface Props {
  postId: string
  existingImageUrl: string | null
  existingAltText: string | null
}

export default function NewsImageUploader({ postId, existingImageUrl, existingAltText }: Props) {
  const mediaKey = `news_post_${postId}`
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(existingImageUrl)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!formRef.current) return
    setUploading(true)
    setError('')
    setSuccess(false)
    try {
      const fd = new FormData(formRef.current)
      await uploadMediaPhoto(fd)
      setSuccess(true)
      const file = fd.get('file') as File | null
      if (file && file.size > 0) setPreviewUrl(URL.createObjectURL(file))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
      {previewUrl && (
        <img
          src={previewUrl}
          alt={existingAltText ?? 'News image'}
          style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '6px', marginBottom: '0.75rem' }}
        />
      )}
      <form ref={formRef} onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <input type="hidden" name="key" value={mediaKey} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label className="wsc-label" htmlFor={`alt-${postId}`}>Alt text</label>
          <input
            id={`alt-${postId}`}
            name="alt_text"
            type="text"
            defaultValue={existingAltText ?? ''}
            className="wsc-input"
            placeholder="Describe the image"
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <label className="wsc-label" htmlFor={`file-${postId}`}>
            {previewUrl ? 'Replace image' : 'Add image'} (JPEG / PNG / WebP, max 5 MB)
          </label>
          <input
            id={`file-${postId}`}
            name="file"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="wsc-input"
            required
          />
        </div>
        <button
          type="submit"
          className="wsc-btn wsc-btn-sm wsc-btn-primary"
          disabled={uploading}
          style={{ alignSelf: 'flex-start' }}
        >
          {uploading ? 'Uploading…' : previewUrl ? 'Replace Image' : 'Upload Image'}
        </button>
        {error && <p style={{ color: 'var(--error)', fontSize: '0.85rem', margin: 0 }}>{error}</p>}
        {success && <p style={{ color: 'oklch(0.55 0.18 145)', fontSize: '0.85rem', margin: 0 }}>Uploaded ✓</p>}
      </form>
    </div>
  )
}
