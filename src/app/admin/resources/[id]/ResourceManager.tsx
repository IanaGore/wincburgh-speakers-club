'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  addResource,
  updateResource,
  togglePublished,
  deleteResource,
  reorderResources,
  uploadResourceFile,
  deleteResourceFile,
} from '../actions'

type ResourceFile = { id: string; file_name: string; storage_path: string; size: number }
type Resource = { id: string; title: string; body: string; is_published: boolean; files: ResourceFile[] }

function formatSize(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

export default function ResourceManager({ roleId, initialResources }: { roleId: string; initialResources: Resource[] }) {
  const router = useRouter()
  const [resources, setResources] = useState<Resource[]>(initialResources)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({})

  function editField(id: string, field: 'title' | 'body', value: string) {
    setResources((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)))
  }

  function handleSave(r: Resource) {
    startTransition(async () => {
      try {
        await updateResource(r.id, r.title, r.body)
        router.refresh()
      } catch {
        setError('Could not save that resource. Please try again.')
      }
    })
  }

  function handleTogglePublished(r: Resource) {
    const next = !r.is_published
    setResources((prev) => prev.map((x) => (x.id === r.id ? { ...x, is_published: next } : x)))
    startTransition(async () => {
      try {
        await togglePublished(r.id, next)
        router.refresh()
      } catch {
        setError('Could not change the publish state. Please reload and try again.')
      }
    })
  }

  function handleDelete(r: Resource) {
    if (!window.confirm(`Delete "${r.title}"${r.files.length ? ` and its ${r.files.length} attachment(s)` : ''}?`)) return
    setResources((prev) => prev.filter((x) => x.id !== r.id))
    startTransition(async () => {
      try {
        await deleteResource(r.id)
        router.refresh()
      } catch {
        setError('Could not delete that resource. Please reload and try again.')
      }
    })
  }

  function handleAdd() {
    startTransition(async () => {
      try {
        const newResource = await addResource(roleId)
        setResources((prev) => [...prev, { ...newResource, files: [] }])
        router.refresh()
      } catch {
        setError('Could not add a resource. Please try again.')
      }
    })
  }

  function handleDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null)
      return
    }
    const next = [...resources]
    const [moved] = next.splice(dragIndex, 1)
    next.splice(targetIndex, 0, moved)
    setResources(next)
    setDragIndex(null)
    startTransition(async () => {
      try {
        await reorderResources(next.map((r) => r.id))
        router.refresh()
      } catch {
        setError('Could not save the new order. Please reload and try again.')
      }
    })
  }

  function handleUpload(r: Resource, file: File | null) {
    if (!file) return
    const formData = new FormData()
    formData.set('resource_id', r.id)
    formData.set('file', file)
    startTransition(async () => {
      try {
        const newFile = await uploadResourceFile(formData)
        setResources((prev) =>
          prev.map((x) => (x.id === r.id ? { ...x, files: [...x.files, newFile] } : x))
        )
        const input = fileInputs.current[r.id]
        if (input) input.value = ''
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not upload that file. Please try again.')
      }
    })
  }

  function handleDeleteFile(r: Resource, f: ResourceFile) {
    if (!window.confirm(`Remove "${f.file_name}"?`)) return
    setResources((prev) =>
      prev.map((x) => (x.id === r.id ? { ...x, files: x.files.filter((y) => y.id !== f.id) } : x))
    )
    startTransition(async () => {
      try {
        await deleteResourceFile(f.id)
        router.refresh()
      } catch {
        setError('Could not remove that attachment. Please reload and try again.')
      }
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {error && (
        <p role="alert" style={{ color: 'var(--clay)', margin: 0, fontSize: 14 }}>
          {error}
        </p>
      )}
      {resources.length === 0 && (
        <p style={{ color: 'var(--ink-3)', margin: 0 }}>No resources yet. Add one below.</p>
      )}

      {resources.map((r, i) => (
        <div
          key={r.id}
          draggable
          onDragStart={() => setDragIndex(i)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => handleDrop(i)}
          onDragEnd={() => setDragIndex(null)}
          className="wsc-card"
          style={{
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.6rem',
            opacity: dragIndex === i ? 0.5 : 1,
            cursor: 'grab',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span aria-hidden style={{ color: 'var(--ink-3)', cursor: 'grab' }}>⠿</span>
            <span style={{ fontWeight: 600, color: 'var(--ink-3)', fontSize: 13 }}>
              Resource {String(i + 1).padStart(2, '0')}
            </span>
            <span
              style={{
                marginLeft: 'auto',
                fontSize: 12,
                fontWeight: 600,
                padding: '0.15rem 0.6rem',
                borderRadius: 999,
                background: r.is_published ? 'oklch(0.93 0.05 150)' : 'var(--rule)',
                color: r.is_published ? 'oklch(0.4 0.1 150)' : 'var(--ink-3)',
              }}
            >
              {r.is_published ? 'Published' : 'Draft'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label className="wsc-label" htmlFor={`title-${r.id}`}>Title</label>
            <input
              id={`title-${r.id}`}
              className="wsc-input"
              value={r.title}
              onChange={(e) => editField(r.id, 'title', e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label className="wsc-label" htmlFor={`body-${r.id}`}>Body</label>
            <textarea
              id={`body-${r.id}`}
              className="wsc-input"
              rows={6}
              value={r.body}
              onChange={(e) => editField(r.id, 'body', e.target.value)}
            />
          </div>

          {r.files.length > 0 && (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {r.files.map((f) => (
                <li key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: 14 }}>
                  <span aria-hidden>📎</span>
                  <span style={{ color: 'var(--ink)' }}>{f.file_name}</span>
                  <span style={{ color: 'var(--ink-3)', fontSize: 12 }}>{formatSize(f.size)}</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteFile(r, f)}
                    disabled={isPending}
                    style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--clay)', cursor: 'pointer', fontSize: 13 }}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="wsc-btn wsc-btn-primary"
              disabled={isPending}
              onClick={() => handleSave(r)}
            >
              Save
            </button>
            <button
              type="button"
              className="wsc-btn"
              disabled={isPending}
              onClick={() => handleTogglePublished(r)}
            >
              {r.is_published ? 'Unpublish' : 'Publish'}
            </button>
            <label className="wsc-btn" style={{ cursor: 'pointer' }}>
              + Attach file
              <input
                ref={(el) => { fileInputs.current[r.id] = el }}
                type="file"
                accept=".pdf,.doc,.docx,image/jpeg,image/png,image/webp"
                style={{ display: 'none' }}
                disabled={isPending}
                onChange={(e) => handleUpload(r, e.target.files?.[0] ?? null)}
              />
            </label>
            <button
              type="button"
              className="wsc-btn"
              disabled={isPending}
              onClick={() => handleDelete(r)}
              style={{ color: 'var(--clay)' }}
            >
              Delete
            </button>
          </div>
        </div>
      ))}

      <div>
        <button type="button" className="wsc-btn" disabled={isPending} onClick={handleAdd}>
          + Add resource
        </button>
      </div>
    </div>
  )
}
