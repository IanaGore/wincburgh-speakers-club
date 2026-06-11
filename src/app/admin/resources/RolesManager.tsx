'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { addRole, updateRole, deleteRole, reorderRoles } from './actions'

type Role = { id: string; name: string; slug: string; description: string; resourceCount: number }

export default function RolesManager({ initialRoles }: { initialRoles: Role[] }) {
  const router = useRouter()
  const [roles, setRoles] = useState<Role[]>(initialRoles)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function editField(id: string, field: 'name' | 'slug' | 'description', value: string) {
    setRoles((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)))
  }

  function handleSave(r: Role) {
    startTransition(async () => {
      try {
        await updateRole(r.id, r.name, r.slug, r.description)
        router.refresh()
      } catch {
        setError('Could not save that role. Please try again.')
      }
    })
  }

  function handleDelete(r: Role) {
    if (!window.confirm(`Delete "${r.name}" and all ${r.resourceCount} of its resources?`)) return
    setRoles((prev) => prev.filter((x) => x.id !== r.id))
    startTransition(async () => {
      try {
        await deleteRole(r.id)
        router.refresh()
      } catch {
        setError('Could not delete that role. Please reload and try again.')
      }
    })
  }

  function handleAdd() {
    startTransition(async () => {
      try {
        const newRole = await addRole()
        setRoles((prev) => [...prev, { ...newRole, resourceCount: 0 }])
        router.refresh()
      } catch {
        setError('Could not add a role. Please try again.')
      }
    })
  }

  function handleDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null)
      return
    }
    const next = [...roles]
    const [moved] = next.splice(dragIndex, 1)
    next.splice(targetIndex, 0, moved)
    setRoles(next)
    setDragIndex(null)
    startTransition(async () => {
      try {
        await reorderRoles(next.map((r) => r.id))
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
      {roles.length === 0 && (
        <p style={{ color: 'var(--ink-3)', margin: 0 }}>No roles yet. Add one below.</p>
      )}

      {roles.map((r, i) => (
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
              Role {String(i + 1).padStart(2, '0')}
            </span>
            <Link
              href={`/admin/resources/${r.id}`}
              style={{ marginLeft: 'auto', color: 'var(--clay)', fontWeight: 600, fontSize: 14 }}
            >
              Manage resources ({r.resourceCount}) →
            </Link>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1 }}>
              <label className="wsc-label" htmlFor={`name-${r.id}`}>Name</label>
              <input
                id={`name-${r.id}`}
                className="wsc-input"
                value={r.name}
                onChange={(e) => editField(r.id, 'name', e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', width: 200 }}>
              <label className="wsc-label" htmlFor={`slug-${r.id}`}>Slug</label>
              <input
                id={`slug-${r.id}`}
                className="wsc-input"
                value={r.slug}
                onChange={(e) => editField(r.id, 'slug', e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label className="wsc-label" htmlFor={`description-${r.id}`}>Description</label>
            <input
              id={`description-${r.id}`}
              className="wsc-input"
              value={r.description}
              onChange={(e) => editField(r.id, 'description', e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
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
          + Add role
        </button>
      </div>
    </div>
  )
}
