import { createClient } from '@/utils/supabase/server'
import { toggleAdmin, updateMemberRoles } from './actions'

const AVAILABLE_ROLES = [
  "Guest",
  "Member",
  "Social Secretary",
  "Development Manager",
  "Club Secretary",
  "Vice President",
  "President",
  "Education Director"
]

export default async function AdminMembersPage() {
  const supabase = await createClient()

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, is_admin, club_roles')
    .order('full_name')

  return (
    <div style={{ padding: "4rem 5%", flex: 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "2.5rem" }}>Admin: Manage Members</h1>
      </div>
      
      <div style={{ background: "var(--card-bg)", padding: "2rem", borderRadius: "16px", border: "1px solid var(--card-border)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {profiles?.map(profile => (
            <div key={profile.id} style={{ padding: "1rem", borderBottom: "1px solid var(--card-border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <div>
                  <span style={{ fontSize: "1.1rem", fontWeight: "bold" }}>{profile.full_name || 'Unnamed User'}</span>
                  {profile.is_admin && <span style={{ marginLeft: "1rem", background: "rgba(16, 185, 129, 0.1)", color: "#10b981", padding: "0.2rem 0.5rem", borderRadius: "12px", fontSize: "0.8rem" }}>Admin</span>}
                </div>
                <form action={toggleAdmin}>
                  <input type="hidden" name="member_id" value={profile.id} />
                  <input type="hidden" name="is_admin" value={profile.is_admin ? 'true' : 'false'} />
                  <button type="submit" className="btn-secondary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}>
                    {profile.is_admin ? 'Revoke Admin' : 'Make Admin'}
                  </button>
                </form>
              </div>
              
              <details style={{ background: "rgba(0,0,0,0.2)", padding: "1rem", borderRadius: "8px", border: "1px solid var(--card-border)" }}>
                <summary style={{ cursor: "pointer", fontSize: "0.9rem", color: "#94a3b8" }}>Manage Club Positions</summary>
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
          ))}
        </div>
      </div>
    </div>
  )
}
