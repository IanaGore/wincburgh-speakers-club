import { createClient } from '@/utils/supabase/server'
import { toggleAdmin, updateMemberRoles, toggleMemberActive } from './actions'

const AVAILABLE_ROLES = [
  "Guest",
  "Member",
  "Social Secretary",
  "Development Manager",
  "Club Secretary",
  "Vice President",
  "President",
  "Education Director",
  "Treasurer"
]

const MEMBER_ROLES = [
  "Member",
  "Social Secretary",
  "Development Manager",
  "Club Secretary",
  "Vice President",
  "President",
  "Education Director",
  "Treasurer"
]

function MemberRow({ profile }: { profile: any }) {
  const userRoles = profile.club_roles || []
  const isActive = profile.is_active !== false

  return (
    <div style={{ padding: "1.2rem", borderBottom: "1px solid var(--card-border)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.5rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
            <span style={{ fontSize: "1.1rem", fontWeight: "bold" }}>{profile.full_name || 'Unnamed User'}</span>
            {profile.is_admin && (
              <span style={{ background: "rgba(16, 185, 129, 0.1)", color: "#10b981", padding: "0.15rem 0.5rem", borderRadius: "12px", fontSize: "0.75rem", fontWeight: "600" }}>Admin</span>
            )}
            <span style={{
              background: isActive ? "rgba(16, 185, 129, 0.1)" : "rgba(245, 158, 11, 0.1)",
              color: isActive ? "#10b981" : "#f59e0b",
              padding: "0.15rem 0.5rem",
              borderRadius: "12px",
              fontSize: "0.75rem",
              fontWeight: "600"
            }}>
              {isActive ? "Active" : "Inactive"}
            </span>
          </div>
          {(profile.contact_email || profile.phone) && (
            <div style={{ marginTop: "0.3rem", fontSize: "0.85rem", color: "#94a3b8" }}>
              {profile.contact_email && <span>{profile.contact_email}</span>}
              {profile.contact_email && profile.phone && <span style={{ margin: "0 0.4rem" }}>·</span>}
              {profile.phone && <span>{profile.phone}</span>}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <form action={toggleMemberActive}>
            <input type="hidden" name="member_id" value={profile.id} />
            <input type="hidden" name="is_active" value={isActive ? 'true' : 'false'} />
            <button type="submit" className="btn-secondary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}>
              {isActive ? 'Deactivate' : 'Reactivate'}
            </button>
          </form>
          <form action={toggleAdmin}>
            <input type="hidden" name="member_id" value={profile.id} />
            <input type="hidden" name="is_admin" value={profile.is_admin ? 'true' : 'false'} />
            <button type="submit" className="btn-secondary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}>
              {profile.is_admin ? 'Revoke Admin' : 'Make Admin'}
            </button>
          </form>
        </div>
      </div>

      <details style={{ background: "rgba(0,0,0,0.2)", padding: "1rem", borderRadius: "8px", border: "1px solid var(--card-border)" }}>
        <summary style={{ cursor: "pointer", fontSize: "0.9rem", color: "#94a3b8" }}>Manage Club Positions</summary>
        <form action={updateMemberRoles} style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <input type="hidden" name="member_id" value={profile.id} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {AVAILABLE_ROLES.map(role => (
              <label key={role} style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "rgba(255,255,255,0.05)", padding: "0.5rem 0.8rem", borderRadius: "8px", border: "1px solid var(--card-border)", cursor: "pointer", fontSize: "0.85rem" }}>
                <input
                  type="checkbox"
                  name="club_roles"
                  value={role}
                  defaultChecked={userRoles.includes(role)}
                />
                {role}
              </label>
            ))}
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

  const members = profiles?.filter(p => p.club_roles?.some((r: string) => MEMBER_ROLES.includes(r))) ?? []
  const guests  = profiles?.filter(p => !p.club_roles?.some((r: string) => MEMBER_ROLES.includes(r))) ?? []

  return (
    <div style={{ padding: "4rem 5%", flex: 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "2.5rem" }}>Admin: Manage Members</h1>
      </div>

      {/* Members section */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "1.4rem", margin: 0 }}>Members</h2>
          <span style={{ background: "rgba(14, 165, 233, 0.1)", color: "var(--primary)", padding: "0.2rem 0.7rem", borderRadius: "12px", fontSize: "0.85rem", fontWeight: "600" }}>{members.length}</span>
        </div>
        <div style={{ background: "var(--card-bg)", borderRadius: "16px", border: "1px solid var(--card-border)" }}>
          {members.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#94a3b8" }}>No members yet. Assign the Member role or an officer role to a user.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {members.map(profile => <MemberRow key={profile.id} profile={profile} />)}
            </div>
          )}
        </div>
      </div>

      {/* Guests section */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "1.4rem", margin: 0 }}>Guests</h2>
          <span style={{ background: "rgba(14, 165, 233, 0.1)", color: "var(--primary)", padding: "0.2rem 0.7rem", borderRadius: "12px", fontSize: "0.85rem", fontWeight: "600" }}>{guests.length}</span>
        </div>
        <div style={{ background: "var(--card-bg)", borderRadius: "16px", border: "1px solid var(--card-border)" }}>
          {guests.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#94a3b8" }}>No guests.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {guests.map(profile => <MemberRow key={profile.id} profile={profile} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
