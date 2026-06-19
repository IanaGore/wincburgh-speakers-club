'use client'

import { useState } from 'react'
import { markPathwayComplete, unmarkPathwayComplete } from './actions'
import { PATHWAY_DEFINITIONS } from '@/lib/pathways'

type ProgressEntry = {
  pathway_code: string
  completed: boolean
  completed_at: string | null
  speech_title: string | null
}

interface PathwayTrackerProps {
  progress: ProgressEntry[]
}

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function PathwayItem({
  code,
  name,
  entry,
}: {
  code: string
  name: string
  entry: ProgressEntry | undefined
}) {
  const [showForm, setShowForm] = useState(false)
  const done = entry?.completed ?? false

  return (
    <div className={`pathway-item${done ? ' pathway-item--done' : ''}`}>
      <div className="pathway-item__left">
        <span className={`pathway-item__check${done ? ' pathway-item__check--done' : ''}`}>
          {done ? '✓' : ''}
        </span>
        <div className="pathway-item__text">
          <span className="pathway-item__code">{code}</span>
          <span className="pathway-item__name">{name}</span>
          {done && (entry?.speech_title || entry?.completed_at) && (
            <span className="pathway-item__detail">
              {entry?.speech_title && `"${entry.speech_title}"`}
              {entry?.speech_title && entry?.completed_at && ' · '}
              {entry?.completed_at && fmtDate(entry.completed_at)}
            </span>
          )}
        </div>
      </div>
      <div className="pathway-item__right">
        {done ? (
          <form action={unmarkPathwayComplete}>
            <input type="hidden" name="pathwayCode" value={code} />
            <button type="submit" className="pathway-item__undo">Undo</button>
          </form>
        ) : (
          <button
            type="button"
            className="pathway-item__mark-btn"
            onClick={() => setShowForm(s => !s)}
          >
            {showForm ? 'Cancel' : 'Mark done'}
          </button>
        )}
      </div>
      {showForm && !done && (
        <form action={markPathwayComplete} className="pathway-item__form">
          <input type="hidden" name="pathwayCode" value={code} />
          <input
            type="text"
            name="speechTitle"
            placeholder="Speech title (optional)"
            className="wsc-input pathway-item__form-input"
          />
          <input
            type="date"
            name="completedAt"
            className="wsc-input pathway-item__form-input"
          />
          <button type="submit" className="wsc-btn wsc-btn-primary wsc-btn-sm">
            Confirm
          </button>
        </form>
      )}
    </div>
  )
}

function PathwaySection({
  title,
  items,
  progress,
}: {
  title: string
  items: readonly { code: string; name: string }[]
  progress: ProgressEntry[]
}) {
  const progressMap = Object.fromEntries(progress.map(p => [p.pathway_code, p]))
  const doneCount = items.filter(i => progressMap[i.code]?.completed).length

  return (
    <div className="pathway-section">
      <div className="pathway-section__header">
        <span className="pathway-section__title">{title}</span>
        <span className="pathway-section__count">{doneCount} of {items.length}</span>
      </div>
      <div className="pathway-section__bar">
        <div
          className="pathway-section__bar-fill"
          style={{ width: `${(doneCount / items.length) * 100}%` }}
        />
      </div>
      <div className="pathway-section__items">
        {items.map(item => (
          <PathwayItem
            key={item.code}
            code={item.code}
            name={item.name}
            entry={progressMap[item.code]}
          />
        ))}
      </div>
    </div>
  )
}

export default function PathwayTracker({ progress }: PathwayTrackerProps) {
  return (
    <section className="speeches-section">
      <h2>Pathway Progress</h2>
      <div className="pathway-tracker">
        <PathwaySection
          title="Foundation"
          items={PATHWAY_DEFINITIONS.foundation}
          progress={progress}
        />
        <PathwaySection
          title="Advanced"
          items={PATHWAY_DEFINITIONS.advanced}
          progress={progress}
        />
      </div>
    </section>
  )
}
