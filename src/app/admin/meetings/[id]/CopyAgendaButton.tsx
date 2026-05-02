'use client'

export default function CopyAgendaButton({ meeting }: { meeting: any }) {
  const handleCopy = () => {
    const dateStr = new Date(meeting.meeting_date).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    let text = `🎙️ *Speakers Club Agenda*\n📅 *Date:* ${dateStr}\n`
    if (meeting.theme) text += `💡 *Theme:* ${meeting.theme}\n`
    text += `\n--- *Roles* ---\n`
    
    // Sort roles nicely if needed, or just map them
    meeting.meeting_assignments.forEach((assignment: any) => {
      const assignee = assignment.member_id ? (assignment.profiles?.full_name || 'Member') : 'OPEN (Volunteer Now!)'
      text += `*${assignment.role_name}:* ${assignee}\n`
    })

    navigator.clipboard.writeText(text)
    alert('Agenda copied to clipboard! You can now paste it directly into WhatsApp or an Email.')
  }

  return (
    <button onClick={handleCopy} className="btn-secondary" style={{ padding: "0.5rem 1rem", fontSize: "0.85rem", cursor: "pointer" }}>
      Copy Agenda to Clipboard
    </button>
  )
}
