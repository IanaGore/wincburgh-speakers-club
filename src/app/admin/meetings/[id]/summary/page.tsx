import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { toggleAttendance, saveSummary } from './actions'
import PrintButton from './PrintButton'

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

export default async function MeetingSummaryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: meeting } = await supabase
    .from('meetings')
    .select('*, meeting_assignments(*, profiles(full_name))')
    .eq('id', id)
    .single()

  if (!meeting) notFound()

  // Fetch all members for attendance (is_active col only exists after migration)
  const { data: allMembers } = await supabase
    .from('profiles')
    .select('id, full_name, club_roles')
    .not('full_name', 'is', null)
    .order('full_name')

  // Ensure attendance rows exist for all active members (upsert on visit)
  if (allMembers && allMembers.length > 0) {
    await supabase
      .from('meeting_attendance')
      .upsert(
        allMembers.map(m => ({ meeting_id: id, member_id: m.id, attended: false })),
        { onConflict: 'meeting_id,member_id', ignoreDuplicates: true }
      )
  }

  // Fetch attendance records
  const { data: attendanceRows } = await supabase
    .from('meeting_attendance')
    .select('member_id, attended')
    .eq('meeting_id', id)

  const attendanceMap: Record<string, boolean> = {}
  for (const row of attendanceRows ?? []) {
    attendanceMap[row.member_id] = row.attended
  }

  const presentCount = Object.values(attendanceMap).filter(Boolean).length
  const totalCount   = allMembers?.length ?? 0

  const dateStr = new Date(meeting.meeting_date).toLocaleDateString('en-GB', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  const { pairs, unpaired, others } = groupAssignments(meeting.meeting_assignments ?? [])

  return (
    <div style={{ padding: "4rem 5%", flex: 1 }}>
      {/* Header */}
      <div className="no-print" style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <h1 style={{ fontSize: "2.2rem", margin: 0 }}>Session Summary</h1>
          <PrintButton />
        </div>
        <Link href={`/admin/meetings/${id}`} className="btn-secondary" style={{ display: "inline-block", marginTop: "1rem", padding: "0.5rem 1.2rem", fontSize: "0.9rem", textDecoration: "none" }}>
          ← Back to Roles
        </Link>
      </div>

      {/* ===== SECTION A: PROGRAMME (printable) ===== */}
      <div style={{ background: "var(--card-bg)", padding: "2rem", borderRadius: "16px", border: "1px solid var(--card-border)", marginBottom: "2rem" }} id="programme">
        {/* Print header — only visible when printing */}
        <div className="print-only" style={{ display: "none", marginBottom: "1.5rem", textAlign: "center" }}>
          <h2 style={{ fontSize: "1.6rem", margin: 0 }}>🎙️ Winchburgh Speakers Club</h2>
          <p style={{ color: "#94a3b8", margin: "0.3rem 0 0" }}>Session Programme</p>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
          <div>
            <h2 style={{ fontSize: "1.5rem", margin: 0, color: "var(--primary)" }}>{dateStr}</h2>
            {meeting.theme && <p style={{ color: "#94a3b8", margin: "0.3rem 0 0" }}>Theme: {meeting.theme}</p>}
          </div>
        </div>

        {/* Standalone roles */}
        {others.length > 0 && (
          <div style={{ marginBottom: "1.5rem" }}>
            {others.map((a: any) => (
              <div key={a.id} style={{ display: "flex", justifyContent: "space-between", padding: "0.6rem 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <span style={{ fontWeight: "600" }}>{a.role_name}</span>
                <span style={{ color: a.member_id ? "#cbd5e1" : "#64748b" }}>{a.member_id ? (a.profiles?.full_name || 'Member') : 'Open'}</span>
              </div>
            ))}
          </div>
        )}

        {/* Speech / evaluator pairs */}
        {pairs.map(({ speech, evaluator }: any) => (
          <div key={speech.id} style={{ marginBottom: "1.2rem", paddingBottom: "1.2rem", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <span style={{ fontWeight: "700" }}>{speech.role_name}</span>
              <span style={{ color: speech.member_id ? "#cbd5e1" : "#64748b" }}>{speech.member_id ? (speech.profiles?.full_name || 'Member') : 'Open'}</span>
            </div>
            {speech.member_id && speech.speech_title && (
              <div style={{ paddingLeft: "1rem", marginTop: "0.3rem", fontSize: "0.88rem", color: "#94a3b8" }}>
                {speech.speech_level && <span style={{ color: "var(--primary)", marginRight: "0.4rem" }}>[{speech.speech_level}]</span>}
                <em>"{speech.speech_title}"</em>
                {speech.speech_length && <span style={{ marginLeft: "0.4rem", color: "#64748b" }}>({speech.speech_length})</span>}
              </div>
            )}
            {evaluator && (
              <div style={{ paddingLeft: "1.5rem", marginTop: "0.5rem", display: "flex", justifyContent: "space-between", borderLeft: "2px solid rgba(14, 165, 233, 0.2)" }}>
                <span style={{ fontSize: "0.9rem", color: "#94a3b8" }}>{evaluator.role_name}</span>
                <span style={{ fontSize: "0.9rem", color: evaluator.member_id ? "#cbd5e1" : "#64748b" }}>{evaluator.member_id ? (evaluator.profiles?.full_name || 'Member') : 'Open'}</span>
              </div>
            )}
          </div>
        ))}

        {unpaired.map((a: any) => (
          <div key={a.id} style={{ display: "flex", justifyContent: "space-between", padding: "0.6rem 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <span style={{ fontWeight: "600" }}>{a.role_name}</span>
            <span style={{ color: a.member_id ? "#cbd5e1" : "#64748b" }}>{a.member_id ? (a.profiles?.full_name || 'Member') : 'Open'}</span>
          </div>
        ))}
      </div>

      {/* ===== SECTION B: ATTENDANCE ===== */}
      <div className="no-print" style={{ background: "var(--card-bg)", padding: "2rem", borderRadius: "16px", border: "1px solid var(--card-border)", marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1.2rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
          <h2 style={{ fontSize: "1.4rem", margin: 0 }}>Attendance</h2>
          <span style={{ background: "rgba(14, 165, 233, 0.1)", color: "var(--primary)", padding: "0.3rem 0.8rem", borderRadius: "12px", fontSize: "0.9rem", fontWeight: "600" }}>
            {presentCount} / {totalCount} present
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "0.6rem" }}>
          {allMembers?.map(member => {
            const attended = attendanceMap[member.id] ?? false
            return (
              <form key={member.id} action={toggleAttendance} style={{ display: "contents" }}>
                <input type="hidden" name="meeting_id" value={id} />
                <input type="hidden" name="member_id" value={member.id} />
                <input type="hidden" name="attended" value={attended ? 'true' : 'false'} />
                <button
                  type="submit"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.7rem 1rem",
                    borderRadius: "10px",
                    border: `1px solid ${attended ? "rgba(16,185,129,0.4)" : "var(--card-border)"}`,
                    background: attended ? "rgba(16,185,129,0.1)" : "rgba(0,0,0,0.2)",
                    cursor: "pointer",
                    color: "white",
                    textAlign: "left",
                    transition: "all 0.15s"
                  }}
                >
                  <span style={{ fontSize: "0.9rem", fontWeight: "500" }}>{member.full_name}</span>
                  <span style={{ fontSize: "0.8rem", color: attended ? "#10b981" : "#64748b", fontWeight: "600" }}>
                    {attended ? "Present" : "Absent"}
                  </span>
                </button>
              </form>
            )
          })}
        </div>
      </div>

      {/* ===== SECTION C: SESSION NOTES ===== */}
      <div className="no-print" style={{ background: "var(--card-bg)", padding: "2rem", borderRadius: "16px", border: "1px solid var(--card-border)" }}>
        <h2 style={{ fontSize: "1.4rem", marginBottom: "1.2rem" }}>Session Notes</h2>
        <form action={saveSummary} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <input type="hidden" name="meeting_id" value={id} />
          <textarea
            name="summary"
            rows={8}
            defaultValue={meeting.summary || ''}
            placeholder="Write up what happened on the night — highlights, attendance notes, any actions for the committee..."
            style={{
              padding: "1rem",
              borderRadius: "8px",
              background: "rgba(0,0,0,0.3)",
              border: "1px solid var(--card-border)",
              color: "white",
              fontSize: "0.95rem",
              lineHeight: "1.6",
              resize: "vertical",
              outline: "none"
            }}
          />
          <div>
            <button type="submit" className="btn-primary" style={{ padding: "0.6rem 1.5rem" }}>Save Notes</button>
          </div>
        </form>
      </div>
    </div>
  )
}
