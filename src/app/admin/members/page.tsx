import { createClient } from '@/utils/supabase/server'
import { toggleAdmin, updateMemberRoles, toggleActive, inviteMember } from './actions'

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
    <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--rule-soft)', background: profile.is_active ? 'transparent' : 'var(--paper-2)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '1.05rem', fontWeight: 600, color: profile.is_active ? 'var(--ink)' : 'var(--ink-4)', textDecoration: profile.is_active ? 'none' : 'line-through' }}>
              {profile.full_name || 'Unnamed User'}
            </span>
            {!profile.is_active && <span className="wsc-tag wsc-tag-gold">Inactive</span>}
            {profile.is_admin && <span className="wsc-tag wsc-tag-sage">Admin</span>}
          </div>
          <div style={{ fontSize: '0.9rem', color: 'var(--ink-3)', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
            {profile.contact_email && <span>{profile.contact_email}</span>}
            {profile.phone && <span>{profile.phone}</span>}
            {!profile.contact_email && !profile.phone && <span style={{ color: 'var(--ink-4)', fontStyle: 'italic' }}>No contact info provided</span>}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <form action={toggleActive}>
            <input type="hidden" name="member_id" value={profile.id} />
            <input type="hidden" name="is_active" value={profile.is_active ? 'true' : 'false'} />
            <button type="submit" className="wsc-btn wsc-btn-sm wsc-btn-ghost">
              {profile.is_active ? 'Mark Inactive' : 'Mark Active'}
            </button>
          </form>
          <form action={toggleAdmin}>
            <input type="hidden" name="member_id" value={profile.id} />
            <input type="hidden" name="is_admin" value={profile.is_admin ? 'true' : 'false'} />
            <button type="submit" className="wsc-btn wsc-btn-sm wsc-btn-ghost">
              {profile.is_admin ? 'Revoke Admin' : 'Make Admin'}
            </button>
          </form>
        </div>
      </div>

      <details style={{ background: 'var(--paper-2)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--rule)' }}>
        <summary style={{ cursor: 'pointer', fontSize: '0.9rem', color: 'var(--ink-3)', fontWeight: 600 }}>Manage Club Positions</summary>
        <form action={updateMemberRoles} style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input type="hidden" name="member_id" value={profile.id} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {AVAILABLE_ROLES.map(role => {
              const userRoles = profile.club_roles || []
              return (
                <label key={role} className="wsc-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--paper)', padding: '0.5rem 0.8rem', borderRadius: '8px', border: '1px solid var(--rule)', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--ink-2)' }}>
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
            <button type="submit" className="wsc-btn wsc-btn-sm wsc-btn-primary">Save Roles</button>
          </div>
        </form>
      </details>
    </div>
  )
}

export default async function AdminMembersPage({
  searchParams,
}: {
  searchParams: Promise<{ invited?: string; invite_error?: string }>
}) {
  const { invited, invite_error: inviteError } = await searchParams
  const supabase = await createClient()

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, is_admin, club_roles, contact_email, phone, is_active')
    .order('full_name')

  const guests = profiles?.filter(p => (p.club_roles || []).length === 0 || ((p.club_roles || []).length === 1 && p.club_roles.includes('Guest'))) || []
  const members = profiles?.filter(p => (p.club_roles || []).some((r: string) => r !== 'Guest')) || []

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 500, fontSize: 32, margin: '8px 0 24px', color: 'var(--ink)' }}>Members &amp; Guests</h1>

      {invited && (
        <div style={{ padding: '12px 16px', background: 'oklch(0.93 0.06 160)', border: '1px solid oklch(0.70 0.12 160)', borderRadius: 8, color: 'oklch(0.30 0.10 160)', fontSize: 14, marginBottom: 16 }}>
          Invite sent to {decodeURIComponent(invited)}.
        </div>
      )}
      {inviteError === 'duplicate' && (
        <div style={{ padding: '12px 16px', background: 'oklch(0.95 0.04 25)', border: '1px solid oklch(0.80 0.10 25)', borderRadius: 8, color: 'oklch(0.40 0.15 25)', fontSize: 14, marginBottom: 16 }}>
          An account already exists for that email address.
        </div>
      )}
      {(inviteError === 'invalid' || inviteError === 'failed') && (
        <div style={{ padding: '12px 16px', background: 'oklch(0.95 0.04 25)', border: '1px solid oklch(0.80 0.10 25)', borderRadius: 8, color: 'oklch(0.40 0.15 25)', fontSize: 14, marginBottom: 16 }}>
          Something went wrong. Please check the details and try again.
        </div>
      )}

      <details style={{ marginBottom: '1.5rem', background: 'var(--paper-2)', borderRadius: 12, border: '1px solid var(--rule)', padding: '1rem 1.25rem' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 600, color: 'var(--ink)', fontSize: '0.95rem', userSelect: 'none' }}>
          + Invite a member directly
        </summary>
        <p style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 8, marginBottom: 16 }}>
          Send an invite link to someone who is already a club member. They will receive an email to set up their account.
        </p>
        <form action={inviteMember} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 400 }}>
          <div>
            <label className="wsc-label" htmlFor="inv-fname">First name *</label>
            <input id="inv-fname" name="first_name" type="text" required className="wsc-input" placeholder="First name" />
          </div>
          <div>
            <label className="wsc-label" htmlFor="inv-lname">Last name <span style={{ color: 'var(--ink-4)', fontWeight: 400 }}>(optional)</span></label>
            <input id="inv-lname" name="last_name" type="text" className="wsc-input" placeholder="Last name" />
          </div>
          <div>
            <label className="wsc-label" htmlFor="inv-email">Email address *</label>
            <input id="inv-email" name="email" type="email" required className="wsc-input" placeholder="member@example.com" />
          </div>
          <div>
            <button type="submit" className="wsc-btn wsc-btn-primary">Send invite</button>
          </div>
        </form>
      </details>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
        {/* Members Section */}
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 500, fontSize: 20, margin: 0, color: 'var(--ink)' }}>Official Members</h2>
            <span className="wsc-tag wsc-tag-clay">{members.filter(m => m.is_active).length} Active</span>
          </div>
          <div className="wsc-card" style={{ overflow: 'hidden' }}>
            {members.length === 0 ? (
              <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--ink-3)' }}>No official members found.</p>
            ) : (
              members.map(profile => <MemberRow key={profile.id} profile={profile} />)
            )}
          </div>
        </section>

        {/* Guests Section */}
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 500, fontSize: 20, margin: 0, color: 'var(--ink)' }}>Guests &amp; Unassigned</h2>
            <span className="wsc-tag">{guests.length} Total</span>
          </div>
          <div className="wsc-card" style={{ overflow: 'hidden' }}>
            {guests.length === 0 ? (
              <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--ink-3)' }}>No guests found.</p>
            ) : (
              guests.map(profile => <MemberRow key={profile.id} profile={profile} />)
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
