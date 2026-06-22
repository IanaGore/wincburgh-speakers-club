'use client'

import { groupAssignments } from '@/lib/assignments'

type AgendaAssignment = {
  role_name: string
  member_id?: string | null
  profiles?: { full_name?: string | null } | null
  speech_title?: string | null
  speech_level?: string | null
  speech_length?: string | null
}

export default function CopyAgendaButton({ meeting }: { meeting: {
  meeting_date: string
  theme?: string | null
  meeting_assignments?: AgendaAssignment[]
} }) {
  const handleCopy = () => {
    const dateStr = new Date(meeting.meeting_date).toLocaleDateString('en-GB', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    })

    let text = `🎙️ *Speakers Club Programme*\n📅 *Date:* ${dateStr}\n`
    if (meeting.theme) text += `💡 *Theme:* ${meeting.theme}\n`
    text += `\n`

    const { pairs, unpaired, others } = groupAssignments(meeting.meeting_assignments ?? [])

    for (const a of others) {
      const name = a.member_id ? (a.profiles?.full_name || 'Member') : 'OPEN'
      text += `*${a.role_name}:* ${name}\n`
    }

    if (others.length > 0 && pairs.length > 0) text += `\n`

    for (const { speech, evaluator } of pairs) {
      const speakerName = speech.member_id ? (speech.profiles?.full_name || 'Member') : 'OPEN'
      text += `*${speech.role_name}:* ${speakerName}\n`
      if (speech.member_id && speech.speech_title) {
        const level  = speech.speech_level ? `[${speech.speech_level}] ` : ''
        const length = speech.speech_length ? ` (${speech.speech_length})` : ''
        text += `  _${level}"${speech.speech_title}"${length}_\n`
      }
      if (evaluator) {
        const evalName = evaluator.member_id ? (evaluator.profiles?.full_name || 'Member') : 'OPEN'
        text += `  *${evaluator.role_name}:* ${evalName}\n`
      }
      text += `\n`
    }

    for (const a of unpaired) {
      const name = a.member_id ? (a.profiles?.full_name || 'Member') : 'OPEN'
      text += `*${a.role_name}:* ${name}\n`
    }

    navigator.clipboard.writeText(text.trim())
    alert('Programme copied to clipboard! You can now paste it into WhatsApp or an email.')
  }

  return (
    <button onClick={handleCopy} className="wsc-btn wsc-btn-sm wsc-btn-ghost">
      Copy Programme
    </button>
  )
}
