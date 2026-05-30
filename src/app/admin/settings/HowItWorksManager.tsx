'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { addStep, updateStep, deleteStep, reorderSteps } from './actions'

type Step = { id: string; title: string; body: string }

export default function HowItWorksManager({ initialSteps }: { initialSteps: Step[] }) {
  const router = useRouter()
  const [steps, setSteps] = useState<Step[]>(initialSteps)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [isPending, startTransition] = useTransition()

  function editField(id: string, field: 'title' | 'body', value: string) {
    setSteps((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)))
  }

  function handleSave(step: Step) {
    startTransition(async () => {
      await updateStep(step.id, step.title, step.body)
      router.refresh()
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteStep(id)
      router.refresh()
    })
  }

  function handleAdd() {
    startTransition(async () => {
      await addStep()
      router.refresh()
    })
  }

  function handleDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null)
      return
    }
    const next = [...steps]
    const [moved] = next.splice(dragIndex, 1)
    next.splice(targetIndex, 0, moved)
    setSteps(next)
    setDragIndex(null)
    startTransition(async () => {
      await reorderSteps(next.map((s) => s.id))
      router.refresh()
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {steps.length === 0 && (
        <p style={{ color: 'var(--ink-3)', margin: 0 }}>
          No steps yet. Add one below.
        </p>
      )}

      {steps.map((step, i) => (
        <div
          key={step.id}
          draggable
          onDragStart={() => setDragIndex(i)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => handleDrop(i)}
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
              Step {String(i + 1).padStart(2, '0')}
            </span>
          </div>

          <label className="wsc-label" htmlFor={`title-${step.id}`}>Title</label>
          <input
            id={`title-${step.id}`}
            className="wsc-input"
            value={step.title}
            onChange={(e) => editField(step.id, 'title', e.target.value)}
          />

          <label className="wsc-label" htmlFor={`body-${step.id}`}>Body</label>
          <textarea
            id={`body-${step.id}`}
            className="wsc-input"
            rows={3}
            value={step.body}
            onChange={(e) => editField(step.id, 'body', e.target.value)}
          />

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="wsc-btn wsc-btn-primary"
              disabled={isPending}
              onClick={() => handleSave(step)}
            >
              Save
            </button>
            <button
              type="button"
              className="wsc-btn"
              disabled={isPending}
              onClick={() => handleDelete(step.id)}
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
          + Add step
        </button>
      </div>
    </div>
  )
}
