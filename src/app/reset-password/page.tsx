import { resetPassword } from './actions'
import Navbar from '@/components/Navbar'

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ message?: string }> }) {
  const resolvedParams = await searchParams;

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Navbar />
      <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "3rem", borderRadius: "16px", border: "1px solid var(--card-border)", width: "100%", maxWidth: "400px", backdropFilter: "blur(10px)" }}>
          <h1 style={{ textAlign: "center", fontSize: "2rem", marginBottom: "0.5rem" }}>New Password</h1>
          <p style={{ textAlign: "center", color: "#94a3b8", marginBottom: "2rem" }}>Enter your new secure password</p>

          {resolvedParams.message && <p style={{ color: "#ef4444", marginBottom: "1rem", textAlign: "center", fontSize: "0.9rem" }}>{resolvedParams.message}</p>}

          <form action={resetPassword} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <label htmlFor="password" style={{ color: "#94a3b8", fontSize: "0.9rem" }}>New Password</label>
              <input id="password" name="password" type="password" required style={{ padding: "0.8rem", borderRadius: "8px", background: "rgba(0,0,0,0.3)", border: "1px solid var(--card-border)", color: "white" }} />
            </div>
            <button type="submit" className="btn-primary" style={{ marginTop: "1rem" }}>Save New Password</button>
          </form>
        </div>
      </main>
    </div>
  )
}
