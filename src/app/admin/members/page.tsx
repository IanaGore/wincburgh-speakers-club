import { createClient } from '@/utils/supabase/server'
import { toggleAdmin, updateMemberRoles, toggleActive } from './actions'

const AVAILABLE_ROLES = [
  "Guest",
  "Member",
  "Social Secretary",
  "Development Manager",
  "Club Secretary",
  "Treasurer",
  "Vice President",
  "President",
  "Education Director"
]

function MemberRow({ profile }: { profile: any }) {
  return (
    <div style={{ padding: "1.5rem", borderBottom: "1px solid var(--card-border)", background: profile.is_active ? "transparent" : "rgba(0,0,0,0.3)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "1.2rem", fontWeight: "bold", color: profile.is_active ? "white" : "#64748b", textDecoration: profile.is_active ? "none" : "line-through" }}>{profile.full_name || 'Unnamed User'}</span>
            {!profile.is_active && <span style={{ background: "rgba(2ef, 68, 68, 0.1)", color: "#ef4444", padding: "0.2rem 0.5rem", borderRadius: "12px", fontSize: "0.8rem" }}>Inactive</span>}
            {profile.is_admin && <span style={{ background: "rgba(16, 185, 129, 0.1)", color: "#10b981", padding: "0.2rem 0.5rem", borderRadius: "12px", fontSize: "0.8rem" }}>Admin</span>}
          </div>
          <div style={{ fontSize: "0.9rem", color: "#cbd5e1", display: "flex", flexDirection: "column", gap: "0.2rem" }}>
            {profile.contact_email && <span>📧 {profile.contact_email}</span>}
            {profile.phone && <span>📱 {profile.phone}</span>}
            {!profile.contact_email && !profile.phone && <span style={{ color: "#64748b", fontStyle: "italic" }}>No contact info provided</span>}
          </div>
        </div>
        
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <form action={toggleActive}>
            <input type="hidden" name="member_id" value={profile.id} />
            <input type="hidden" name="is_active" value={profile.is_active ? 'true' : 'false'} />
            <button type="submit" className="btn-secondary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}>
              {profile.is_active ? 'Mark Inactive' : 'Mark Active'}
            </button>
          </form>
          <form action={toggleAdmin}>
            <input type="hidden" name="member_id" value={profile.id} />
            <input type="hidden" name="is_admin" value={profile.is_admin ? 'true' : 'false'} />
            <button type="submit" className="btn-secondary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}>
              {profile.is_admin ? 'Revoke Admin' : 'Make Admin'}
            </button>
          </form>
        </div>
      </div>
      
      <details style={{ background: "rgba(0,0,0,0.2)", padding: "1rem", borderRadius: "8px", border: "1px solid var(--card-border)" }}>
        <summary style={{ cursor: "pointer", fontSize: "0.9rem", color: "#94a3b8", fontWeight: "bold" }}>Manage Club Positions</summary>
        <form action={updateMemberRoles} style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <input type="hidden" name="member_id" value={profile.id} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {AVAILABLE_ROLES.map(role => {
              const userRoles = profile.club_roles || [];
              return (
                <label key={role} style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "rgba(255,255,255,0.05)", padding: "0.5rem 0.8rem", borderRadius: "8px", border: "1px solid var(--card-border)", cursor: "pointer", fontSize: "0.85rem" }}>
                  <input 
                    type="checkbox" 
                    name="club_roles" 
                    value={role} 
                    defaultChecked={userRoles.includes(role)}
                  />
                  {role}
                </label>
              )
            })}
          </div>
          <div>
            <button type="submit" className="btn-primary" style={{ padding: "0.4rem 1rem", fontSize: "0.85rem" }}>Save Roles</button>
          </div>
        </form>
      </details>
    </div>
  )
}

export default async function AdminMembersPage() {
  const supabase = await createClient()

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, is_admin, club_roles, contact_email, phone, is_active')
    .order('full_name')

  // Group members and guests
  const guests = profiles?.filter(p => (p.club_roles || []).length === 0 || ((p.club_roles || []).length === 1 && p.club_roles.includes('Guest'))) || []
  const members = profiles?.filter(p => (p.club_roles || []).some((r: string) => r !== 'Guest')) || []

  return (
    <div style={{ padding: "clamp(2rem, 5vw, 4rem) 5%", flex: 1, maxWidth: "1200px", margin: "0 auto", width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "1rem", marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "clamp(1.8rem, 5vw, 2.5rem)", fontWeight: "700", margin: 0 }}>Manage Members & Guests</h1>
      </div>
      
      <div style={{ display: "flex", flexDirection: "column", gap: "3rem" }}>
        {/* Members Section */}
        <section>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2 style={{ fontSize: "1.5rem", color: "var(--primary)", margin: 0 }}>Official Members</h2>
            <span style={{ background: "rgba(14, 165, 233, 0.1)", color: "var(--primary)", padding: "0.2rem 0.8rem", borderRadius: "20px", fontSize: "0.9rem", fontWeight: "bold" }}>
              {members.filter(m => m.is_active).length} Active
            </span>
          </div>
          <div style={{ background: "var(--card-bg)", borderRadius: "16px", border: "1px solid var(--card-border)", overflow: "hidden" }}>
            {members.length === 0 ? (
              <p style={{ padding: "2rem", textAlign: "center", color: "#94a3b8" }}>No official members found.</p>
            ) : (
              members.map(profile => <MemberRow key={profile.id} profile={profile} />)
            )}
          </div>
        </section>

        {/* Guests Section */}
        <section>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h2 style={{ fontSize: "1.5rem", color: "#94a3b8", margin: 0 }}>Guests & Unassigned</h2>
            <span style={{ background: "rgba(255, 255, 255, 0.1)", color: "#94a3b8", padding: "0.2rem 0.8rem", borderRadius: "20px", fontSize: "0.9rem", fontWeight: "bold" }}>
              {guests.length} Total
            </span>
          </div>
          <div style={{ background: "var(--card-bg)", borderRadius: "16px", border: "1px solid var(--card-border)", overflow: "hidden" }}>
            {guests.length === 0 ? (
              <p style={{ padding: "2rem", textAlign: "center", color: "#94a3b8" }}>No guests found.</p>
            ) : (
              guests.map(profile => <MemberRow key={profile.id} profile={profile} />)
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
