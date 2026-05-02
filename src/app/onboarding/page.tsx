import { completeOnboarding } from './actions'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <div style={{ width: "100%", maxWidth: "400px", background: "var(--card-bg)", border: "1px solid var(--card-border)", padding: "2.5rem", borderRadius: "16px", backdropFilter: "blur(10px)" }}>
        <h2 style={{ fontSize: "1.8rem", marginBottom: "1rem", textAlign: "center", fontWeight: "700" }}>Complete Your Profile</h2>
        <p style={{ textAlign: "center", color: "#94a3b8", marginBottom: "2rem" }}>Tell us a bit about yourself to get started.</p>

        <form action={completeOnboarding} style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label htmlFor="full_name" style={{ fontSize: "0.9rem", color: "#94a3b8" }}>Full Name</label>
            <input
              id="full_name"
              name="full_name"
              type="text"
              required
              style={{ padding: "0.8rem", borderRadius: "8px", background: "rgba(0,0,0,0.3)", border: "1px solid var(--card-border)", color: "white", outline: "none" }}
            />
          </div>

          <button type="submit" className="btn-primary" style={{ width: "100%", padding: "0.8rem", marginTop: "1rem" }}>Save & Continue</button>
        </form>
      </div>
    </div>
  )
}
