'use client'

import { useState } from 'react'
import Link from 'next/link'
import { login } from './actions'
import { createClient } from '@/utils/supabase/client'

interface LoginFormProps {
  error?: string
}

export default function LoginForm({ error }: LoginFormProps) {
  const [showPw, setShowPw] = useState(false)
  const [magicSent, setMagicSent] = useState(false)
  const [magicLoading, setMagicLoading] = useState(false)
  const [email, setEmail] = useState('')

  async function handleMagicLink() {
    if (!email) return
    setMagicLoading(true)
    const supabase = createClient()
    await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    setMagicSent(true)
    setMagicLoading(false)
  }

  return (
    <div className="login-form">
      <span className="wsc-eyebrow">Member portal</span>
      <h1>Sign in to your portal</h1>
      <p className="login-form__sub">
        Good to have you back. Sign in with your email and password, or get a magic link sent straight to your inbox.
      </p>

      {error && <div className="login-form__error">{error}</div>}
      {magicSent && (
        <div className="login-form__magic-sent">
          Magic link sent! Check your inbox and click the link to sign in.
        </div>
      )}

      <form>
        <div className="login-form__fields">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label htmlFor="email" className="wsc-label">Email address</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="wsc-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label htmlFor="password" className="wsc-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                id="password"
                name="password"
                type={showPw ? 'text' : 'password'}
                required
                autoComplete="current-password"
                className="wsc-input"
                style={{ paddingRight: 48 }}
              />
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
            </div>
          </div>
        </div>

        <div className="login-form__forgot">
          <Link href="/forgot-password">Forgotten your password?</Link>
        </div>

        <label className="login-form__keep">
          <input type="checkbox" name="remember" />
          Keep me signed in
        </label>

        <button type="submit" formAction={login} className="login-form__submit">
          Sign in
        </button>
      </form>

      <div className="login-form__or">or</div>

      <button
        type="button"
        onClick={handleMagicLink}
        disabled={magicLoading || !email}
        className="login-form__magic"
      >
        {magicLoading ? 'Sending…' : '✉ Email me a sign-in link'}
      </button>

      <p className="login-form__help">
        Not a member yet?{' '}
        <Link href="/contact" style={{ color: 'var(--clay)', textDecoration: 'underline', textUnderlineOffset: 3 }}>
          Come to a meeting
        </Link>
      </p>
    </div>
  )
}
