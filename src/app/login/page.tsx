import { login } from './actions'
import Link from 'next/link'

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const resolvedParams = await searchParams;

  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <div style={{ width: "100%", maxWidth: "400px", background: "var(--card-bg)", border: "1px solid var(--card-border)", padding: "2.5rem", borderRadius: "16px", backdropFilter: "blur(10px)" }}>
        <h2 style={{ fontSize: "1.8rem", marginBottom: "2rem", textAlign: "center", fontWeight: "700" }}>Welcome Back</h2>
        
        {resolvedParams.error && (
           <div style={{ padding: "1rem", marginBottom: "1rem", background: "rgba(239, 68, 68, 0.1)", border: "1px solid #ef4444", borderRadius: "8px", color: "#ef4444", textAlign: "center", fontSize: "0.9rem" }}>
              {resolvedParams.error}
           </div>
        )}

        <form style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label htmlFor="email" style={{ fontSize: "0.9rem", color: "#94a3b8" }}>Email</label>
            <input 
              id="email" 
              name="email" 
              type="email" 
              required 
              style={{ padding: "0.8rem", borderRadius: "8px", background: "rgba(0,0,0,0.3)", border: "1px solid var(--card-border)", color: "white", outline: "none" }} 
            />
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label htmlFor="password" style={{ fontSize: "0.9rem", color: "#94a3b8" }}>Password</label>
              <Link href="/forgot-password" style={{ fontSize: "0.8rem", color: "var(--primary)", textDecoration: "none" }}>Forgot Password?</Link>
            </div>
            <input 
              id="password" 
              name="password" 
              type="password" 
              required 
              style={{ padding: "0.8rem", borderRadius: "8px", background: "rgba(0,0,0,0.3)", border: "1px solid var(--card-border)", color: "white", outline: "none" }} 
            />
          </div>

          <button formAction={login} className="btn-primary" style={{ width: "100%", padding: "0.8rem" }}>Log in</button>
          
          <div style={{ textAlign: "center", marginTop: "1rem" }}>
              <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>Don&apos;t have an account? </span>
              <Link href="/signup" style={{ color: "var(--primary)", fontSize: "0.85rem", fontWeight: "bold", textDecoration: "none" }}>Sign up</Link>
          </div>
        </form>
      </div>
    </div>
  )
}
