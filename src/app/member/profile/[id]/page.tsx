import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function PublicProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const profileId = resolvedParams.id;
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', profileId)
    .single()

  if (!profile) {
    return (
      <div style={{ padding: "4rem 5%", textAlign: "center" }}>
        <h1>Profile Not Found</h1>
        <Link href="/member/dashboard" style={{ color: "var(--primary)" }}>Return to Dashboard</Link>
      </div>
    )
  }

  const { data: speeches } = await supabase
    .from('meeting_assignments')
    .select(`
      id, role_name, speech_title, speech_level, speech_length,
      meetings!inner ( meeting_date, theme )
    `)
    .eq('member_id', profileId)
    .not('speech_level', 'is', null)
    
  // Sort speeches by date descending
  const sortedSpeeches = speeches?.sort((a: any, b: any) => {
    return new Date(b.meetings.meeting_date).getTime() - new Date(a.meetings.meeting_date).getTime()
  }) || []

  const userRoles = profile?.club_roles || []

  return (
    <div style={{ padding: "clamp(2rem, 5vw, 4rem) 5%", flex: 1, maxWidth: "1200px", margin: "0 auto", width: "100%" }}>
      <div style={{ marginBottom: "2rem" }}>
        <Link href="/member/dashboard" style={{ color: "var(--primary)", fontSize: "0.9rem", textDecoration: "none" }}>&larr; Back to Dashboard</Link>
      </div>

      <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap", alignItems: "flex-start" }}>
        
        {/* Profile Card */}
        <div style={{ flex: "1 1 350px", background: "var(--card-bg)", padding: "clamp(1.5rem, 4vw, 2rem)", borderRadius: "16px", border: "1px solid var(--card-border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "2rem" }}>
            <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: profile?.avatar_url ? `url(${profile.avatar_url}) center/cover` : "rgba(14, 165, 233, 0.2)", border: "2px solid var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem" }}>
              {!profile?.avatar_url && "👤"}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.2rem" }}>{profile?.full_name || 'Member'}</h3>
              <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.9rem" }}>Club Member</p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label style={{ fontSize: "0.9rem", color: "#94a3b8", marginBottom: "0.5rem" }}>Club Positions</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {userRoles.length === 0 ? (
                <span style={{ color: "#94a3b8", fontSize: "0.85rem", fontStyle: "italic" }}>No roles assigned</span>
              ) : (
                userRoles.map((role: string) => (
                  <span key={role} style={{ background: "rgba(14, 165, 233, 0.2)", color: "var(--primary)", padding: "0.4rem 0.8rem", borderRadius: "12px", fontSize: "0.85rem", border: "1px solid rgba(14, 165, 233, 0.3)" }}>
                    {role}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Speeches Track */}
        <div style={{ flex: "2 1 500px", background: "var(--card-bg)", padding: "clamp(1.5rem, 4vw, 2rem)", borderRadius: "16px", border: "1px solid var(--card-border)" }}>
          <h2 style={{ fontSize: "1.5rem", marginBottom: "0.5rem", color: "var(--primary)" }}>Education Track</h2>
          <p style={{ color: "#94a3b8", marginBottom: "2rem", fontSize: "0.9rem" }}>A record of the speeches completed by {profile.full_name || 'this member'}.</p>

          {sortedSpeeches.length === 0 ? (
            <div style={{ padding: "3rem", border: "1px dashed var(--card-border)", borderRadius: "12px", textAlign: "center", color: "#94a3b8" }}>
              <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>🎤</div>
              No speeches recorded yet.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {sortedSpeeches.map((speech: any) => (
                <div key={speech.id} style={{ display: "flex", flexDirection: "column", gap: "0.5rem", padding: "1.2rem", borderRadius: "12px", background: "rgba(0,0,0,0.2)", border: "1px solid var(--card-border)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
                    <div>
                      <span style={{ display: "inline-block", background: "rgba(14, 165, 233, 0.1)", color: "var(--primary)", padding: "0.2rem 0.6rem", borderRadius: "4px", fontSize: "0.8rem", fontWeight: "bold", marginBottom: "0.5rem" }}>
                        Level {speech.speech_level}
                      </span>
                      <h3 style={{ margin: 0, fontSize: "1.1rem" }}>{speech.speech_title || "Untitled Speech"}</h3>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ margin: 0, fontSize: "0.85rem", color: "#cbd5e1" }}>
                        {new Date(speech.meetings.meeting_date).toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </p>
                      <p style={{ margin: 0, fontSize: "0.8rem", color: "#94a3b8", marginTop: "0.2rem" }}>
                        {speech.speech_length}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
