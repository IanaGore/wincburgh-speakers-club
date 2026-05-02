import { createClient } from '@/utils/supabase/server'
import { toggleAdmin } from './actions'

export default async function AdminMembersPage() {
  const supabase = await createClient()

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, is_admin')
    .order('full_name')

  return (
    <div style={{ padding: "4rem 5%", flex: 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "2.5rem" }}>Admin: Manage Members</h1>
      </div>
      
      <div style={{ background: "var(--card-bg)", padding: "2rem", borderRadius: "16px", border: "1px solid var(--card-border)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {profiles?.map(profile => (
            <div key={profile.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1rem", borderBottom: "1px solid var(--card-border)" }}>
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
          ))}
        </div>
      </div>
    </div>
  )
}
