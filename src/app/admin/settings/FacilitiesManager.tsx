'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { addFacility, updateFacility, deleteFacility, reorderFacilities } from './actions'

type Facility = { id: string; icon: string; label: string }

export default function FacilitiesManager({ initialFacilities }: { initialFacilities: Facility[] }) {
  const router = useRouter()
  const [facilities, setFacilities] = useState<Facility[]>(initialFacilities)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function editField(id: string, field: 'icon' | 'label', value: string) {
    setFacilities((prev) => prev.map((f) => (f.id === id ? { ...f, [field]: value } : f)))
  }

  function handleSave(f: Facility) {
    startTransition(async () => {
      try {
        await updateFacility(f.id, f.icon, f.label)
        router.refresh()
      } catch {
        setError('Could not save that facility. Please try again.')
      }
    })
  }

  function handleDelete(id: string) {
    setFacilities((prev) => prev.filter((f) => f.id !== id))
    startTransition(async () => {
      try {
        await deleteFacility(id)
        router.refresh()
      } catch {
        setError('Could not delete that facility. Please reload and try again.')
      }
    })
  }

  function handleAdd() {
    startTransition(async () => {
      try {
        const newFacility = await addFacility()
        setFacilities((prev) => [...prev, newFacility])
        router.refresh()
      } catch {
        setError('Could not add a facility. Please try again.')
      }
    })
  }

  function handleDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null)
      return
    }
    const next = [...facilities]
    const [moved] = next.splice(dragIndex, 1)
    next.splice(targetIndex, 0, moved)
    setFacilities(next)
    setDragIndex(null)
    startTransition(async () => {
      try {
        await reorderFacilities(next.map((f) => f.id))
        router.refresh()
      } catch {
        setError('Could not save the new order. Please reload and try again.')
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
      {facilities.length === 0 && (
        <p style={{ color: 'var(--ink-3)', margin: 0 }}>
          No facilities yet. Add one below.
        </p>
      )}

      {facilities.map((f, i) => (
        <div
          key={f.id}
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
              Facility {String(i + 1).padStart(2, '0')}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', width: 80 }}>
              <label className="wsc-label" htmlFor={`icon-${f.id}`}>Icon</label>
              <input
                id={`icon-${f.id}`}
                className="wsc-input"
                value={f.icon}
                maxLength={4}
                style={{ textAlign: 'center' }}
                onChange={(e) => editField(f.id, 'icon', e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1 }}>
              <label className="wsc-label" htmlFor={`label-${f.id}`}>Label</label>
              <input
                id={`label-${f.id}`}
                className="wsc-input"
                value={f.label}
                onChange={(e) => editField(f.id, 'label', e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="wsc-btn wsc-btn-primary"
              disabled={isPending}
              onClick={() => handleSave(f)}
            >
              Save
            </button>
            <button
              type="button"
              className="wsc-btn"
              disabled={isPending}
              onClick={() => handleDelete(f.id)}
              style={{ color: 'var(--clay)' }}
            >
              Delete
            </button>
          </div>
        </div>
      ))}

      <div>
        <button
          type="button"
          className="wsc-btn"
          disabled={isPending}
          onClick={handleAdd}
        >
          + Add facility
        </button>
      </div>
    </div>
  )
}
