'use client'
import { useState, InputHTMLAttributes } from 'react'
import { Eye, EyeOff } from 'lucide-react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  id: string
  error?: string
}

export default function Input({ label, id, error, type, ...props }: InputProps) {
  const [showPw, setShowPw] = useState(false)
  const isPassword = type === 'password'
  const inputType = isPassword ? (showPw ? 'text' : 'password') : type

  return (
    <div className="input-field">
      <label className="wsc-label" htmlFor={id}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input id={id} type={inputType} className="wsc-input" {...props} />
        {isPassword && (
          <button
            type="button"
            className="input-field__eye"
            aria-label={showPw ? 'Hide password' : 'Show password'}
            onClick={() => setShowPw(v => !v)}
          >
            {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {error && <p className="input-field__error">{error}</p>}
    </div>
  )
}
