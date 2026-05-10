'use client'

function getRoleNumber(name: string): number | null {
  const m = name.match(/(\d+)$/)
  return m ? parseInt(m[1]) : null
}

function groupAssignments(assignments: any[]) {
  const speeches   = assignments.filter(a => a.role_name.startsWith('Speech'))
  const evaluators = assignments.filter(a => a.role_name.startsWith('Evaluator'))
  const others     = assignments.filter(a => !a.role_name.startsWith('Speech') && !a.role_name.startsWith('Evaluator'))
  const pairs = speeches.map(s => ({
    speech: s,
    evaluator: evaluators.find(e => getRoleNumber(e.role_name) === getRoleNumber(s.role_name)) ?? null
  }))
  const unpaired = evaluators.filter(e => !speeches.some(s => getRoleNumber(s.role_name) === getRoleNumber(e.role_name)))
  return { pairs, unpaired, others }
}

export default function CopyAgendaButton({ meeting }: { meeting: any }) {
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
