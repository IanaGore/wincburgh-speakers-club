'use client'

import { deleteSpeech } from './actions'

export default function DeleteSpeechButton({ speechId }: { speechId: string }) {
  function handleSubmit(e: React.FormEvent) {
    if (!confirm('Delete this speech entry?')) e.preventDefault()
  }

  return (
    <form action={deleteSpeech} onSubmit={handleSubmit}>
      <input type="hidden" name="speechId" value={speechId} />
      <button type="submit" className="speech-delete-btn">Delete</button>
    </form>
  )
}
