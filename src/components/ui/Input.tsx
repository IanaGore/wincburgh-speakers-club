'use client'

import { useState } from 'react'

interface InputProps {
  id: string
  name: string
  type?: 'text' | 'email' | 'password' | 'tel' | 'checkbox'
  label?: string
  placeholder?: string
  required?: boolean
  defaultValue?: string
  autoComplete?: string
}

export default function Input({
  id,
  name,
  type = 'text',
  label,
  placeholder,
  required,
  defaultValue,
  autoComplete,
}: InputProps) {
  const [showPw, setShowPw] = useState(false)

  if (type === 'checkbox') {
    return (
      <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
        <input
          id={id}
          name={name}
          type="checkbox"
          style={{ accentColor: 'var(--gold)', width: 18, height: 18 }}
        />
        <span className="wsc-label" style={{ margin: 0, cursor: 'pointer' }}>
          {label}
        </span>
      </label>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label && (
        <label htmlFor={id} className="wsc-label">
          {label}
        </label>
      )}
      <div style={{ position: 'relative' }}>
        <input
          id={id}
          name={name}
          type={type === 'password' ? (showPw ? 'text' : 'password') : type}
          placeholder={placeholder}
          required={required}
          defaultValue={defaultValue}
          autoComplete={autoComplete}
          className="wsc-input"
        />
        {type === 'password' && (
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            aria-label={showPw ? 'Hide password' : 'Show password'}
            style={{
              position: 'absolute',
              right: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--ink-3)',
              fontSize: 18,
              lineHeight: 1,
              padding: 4,
            }}
          >
            {showPw ? '🙈' : '👁'}
          </button>
        )}
      </div>
    </div>
  )
}
