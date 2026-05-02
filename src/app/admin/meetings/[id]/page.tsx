import { createClient } from '@/utils/supabase/server'
import { addCustomRole, deleteRole } from './actions'
import Link from 'next/link'
import CopyAgendaButton from './CopyAgendaButton'

export default async function ManageMeetingPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const resolvedParams = await params
  const { id } = resolvedParams

  const { data: meeting } = await supabase
    .from('meetings')
    .select('*, meeting_assignments(*, profiles(full_name))')
    .eq('id', id)
    .single()

  if (!meeting) return <div>Meeting not found</div>

  return (
    <div style={{ padding: "4rem 5%", flex: 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "2.5rem" }}>Manage Session: {new Date(meeting.meeting_date).toLocaleDateString()}</h1>
        <Link href="/admin/meetings" style={{ color: "var(--primary)" }}>← Back</Link>
      </div>

      <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>
        {/* Roles List */}
        <div style={{ flex: "2", minWidth: "400px", background: "var(--card-bg)", padding: "2rem", borderRadius: "16px", border: "1px solid var(--card-border)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
             <h2 style={{ fontSize: "1.5rem" }}>Roles</h2>
             <CopyAgendaButton meeting={meeting} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {meeting.meeting_assignments.map((assignment: any) => (
              <div key={assignment.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                <span style={{ fontWeight: "bold" }}>{assignment.role_name}</span>
                <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                   <span style={{ color: assignment.member_id ? "var(--primary)" : "#94a3b8", fontSize: "0.9rem" }}>
                     {assignment.member_id ? assignment.profiles?.full_name || 'Member' : 'Open'}
                   </span>
                   <form action={async () => {
                      'use server'
                      await deleteRole(assignment.id, meeting.id)
                   }}>
                     <button type="submit" style={{ background: "none", color: "#f87171", border: "none", cursor: "pointer", fontSize: "0.85rem" }}>Remove</button>
                   </form>
                </div>
              </div>
            ))}
            {meeting.meeting_assignments.length === 0 && <p style={{color: "#94a3b8"}}>No roles assigned. Add some below.</p>}
          </div>
        </div>

        {/* Add Custom Role */}
        <div style={{ flex: "1", minWidth: "300px", height: "fit-content", background: "var(--card-bg)", padding: "2rem", borderRadius: "16px", border: "1px solid var(--card-border)" }}>
           <h2 style={{ fontSize: "1.5rem", marginBottom: "1.5rem" }}>Add Custom Role</h2>
           <form action={addCustomRole} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <input type="hidden" name="meeting_id" value={meeting.id} />
              <input type="text" name="role_name" placeholder="e.g. 'Guest Speaker'" required style={{ padding: "0.8rem", borderRadius: "8px", background: "rgba(0,0,0,0.3)", border: "1px solid var(--card-border)", color: "white" }} />
              <button type="submit" className="btn-primary">Add Role</button>
           </form>
        </div>
      </div>
    </div>
  )
}
