'use client'
import { useActionState } from 'react'
import { completeConversion } from './actions'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

const initial: { error: string | null } = { error: null }

export default function JoinForm({ token, firstName, lastName, email }: {
  token: string; firstName: string; lastName: string; email: string
}) {
  const [state, formAction, pending] = useActionState(completeConversion, initial)

  return (
    <form action={formAction} className="join-form">
      <input type="hidden" name="token" value={token} />
      <div className="join-form__prefilled">
        <p className="wsc-label">Name</p>
        <p>{firstName} {lastName}</p>
      </div>
      <div className="join-form__prefilled">
        <p className="wsc-label">Email</p>
        <p>{email}</p>
        <input type="hidden" name="email" value={email} />
      </div>
      <Input id="password" name="password" label="Choose a password" type="password" required minLength={8} placeholder="At least 8 characters" />
      {state?.error && <p className="input-field__error">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? 'Setting up your account…' : 'Create my account'}
      </Button>
    </form>
  )
}
