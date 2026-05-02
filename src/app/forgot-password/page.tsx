import { forgotPassword } from './actions'
import Link from 'next/link'
import Navbar from '@/components/Navbar'

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ message?: string, success?: string }> }) {
  const resolvedParams = await searchParams;

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Navbar />
      <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ background: "rgba(15, 23, 42, 0.6)", padding: "3rem", borderRadius: "16px", border: "1px solid var(--card-border)", width: "100%", maxWidth: "400px", backdropFilter: "blur(10px)" }}>
          <h1 style={{ textAlign: "center", fontSize: "2rem", marginBottom: "0.5rem" }}>Reset Password</h1>
          <p style={{ textAlign: "center", color: "#94a3b8", marginBottom: "2rem" }}>Enter your email to receive a reset link</p>

          {resolvedParams.message && <p style={{ color: "#ef4444", marginBottom: "1rem", textAlign: "center", fontSize: "0.9rem" }}>{resolvedParams.message}</p>}
          {resolvedParams.success && <p style={{ color: "#10b981", marginBottom: "1rem", textAlign: "center", fontSize: "0.9rem", background: "rgba(16, 185, 129, 0.1)", padding: "1rem", borderRadius: "8px" }}>{resolvedParams.success}</p>}

          {!resolvedParams.success && (
            <form action={forgotPassword} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <label htmlFor="email" style={{ color: "#94a3b8", fontSize: "0.9rem" }}>Email</label>
                <input id="email" name="email" type="email" required style={{ padding: "0.8rem", borderRadius: "8px", background: "rgba(0,0,0,0.3)", border: "1px solid var(--card-border)", color: "white" }} />
              </div>
              <button type="submit" className="btn-primary" style={{ marginTop: "1rem" }}>Send Reset Link</button>
            </form>
          )}

          <div style={{ textAlign: "center", marginTop: "2rem" }}>
            <Link href="/login" style={{ color: "var(--primary)", textDecoration: "none", fontSize: "0.9rem" }}>Back to Login</Link>
          </div>
        </div>
      </main>
    </div>
  )
}
