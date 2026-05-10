'use client'
import { useRef, useState } from 'react'
import { uploadMediaPhoto } from './actions'

const MEDIA_SLOTS = [
  { key: 'homepage_hero',           label: 'Homepage Hero (primary)' },
  { key: 'homepage_hero_secondary', label: 'Homepage Hero (secondary)' },
  { key: 'about_hero',              label: 'About Page Hero' },
  { key: 'meetings_hero',           label: 'Meetings Page Hero' },
]

interface MediaRow {
  key: string
  storage_path: string
  alt_text: string | null
}

interface Props {
  existing: MediaRow[]
  bucketUrl: string
}

export default function MediaUploader({ existing, bucketUrl }: Props) {
  const [uploading, setUploading] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [success, setSuccess] = useState<Record<string, boolean>>({})
  const formRefs = useRef<Record<string, HTMLFormElement | null>>({})

  async function handleUpload(key: string, form: HTMLFormElement) {
    setUploading(key)
    setErrors(prev => ({ ...prev, [key]: '' }))
    setSuccess(prev => ({ ...prev, [key]: false }))
    try {
      const fd = new FormData(form)
      await uploadMediaPhoto(fd)
      setSuccess(prev => ({ ...prev, [key]: true }))
    } catch (e) {
      setErrors(prev => ({ ...prev, [key]: e instanceof Error ? e.message : 'Upload failed' }))
    } finally {
      setUploading(null)
    }
  }

  return (
    <div className="media-grid">
      {MEDIA_SLOTS.map(slot => {
        const row = existing.find(r => r.key === slot.key)
        const imgUrl = row ? `${bucketUrl}/${row.storage_path}` : null

        return (
          <div key={slot.key} className="media-card wsc-card">
            <h3 className="media-card__label">{slot.label}</h3>
            <div className="media-card__preview">
              {imgUrl
                ? <img src={imgUrl} alt={row?.alt_text ?? slot.label} className="media-card__img" />
                : <span className="media-card__empty">No image set</span>
              }
            </div>
            <form
              ref={el => { formRefs.current[slot.key] = el }}
              onSubmit={e => { e.preventDefault(); if (formRefs.current[slot.key]) handleUpload(slot.key, formRefs.current[slot.key]!) }}
              className="media-card__form"
            >
              <input type="hidden" name="key" value={slot.key} />
              <div className="media-card__field">
                <label className="wsc-label" htmlFor={`alt-${slot.key}`}>Alt text</label>
                <input
                  id={`alt-${slot.key}`}
                  name="alt_text"
                  type="text"
                  defaultValue={row?.alt_text ?? ''}
                  className="wsc-input"
                  placeholder={slot.label}
                />
              </div>
              <div className="media-card__field">
                <label className="wsc-label" htmlFor={`file-${slot.key}`}>Image (JPEG / PNG / WebP, max 5 MB)</label>
                <input
                  id={`file-${slot.key}`}
                  name="file"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="wsc-input"
                  required
                />
              </div>
              <button
                type="submit"
                className="wsc-btn wsc-btn-primary wsc-btn-sm"
                disabled={uploading === slot.key}
              >
                {uploading === slot.key ? 'Uploading…' : 'Upload'}
              </button>
              {errors[slot.key] && <p className="media-card__error">{errors[slot.key]}</p>}
              {success[slot.key] && <p className="media-card__success">Uploaded ✓</p>}
            </form>
          </div>
        )
      })}
    </div>
  )
}
