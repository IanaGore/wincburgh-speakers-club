import { submitContactForm } from './actions'
import Navbar from '@/components/Navbar'

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ success?: string }> }) {
  const resolvedParams = await searchParams;

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Navbar />
      <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "clamp(2rem, 5vw, 4rem) 5%" }}>
        <div style={{ width: "100%", maxWidth: "600px", background: "var(--card-bg)", border: "1px solid var(--card-border)", padding: "clamp(1.5rem, 5vw, 3rem)", borderRadius: "16px", backdropFilter: "blur(10px)" }}>
          <h1 style={{ fontSize: "clamp(2rem, 5vw, 2.5rem)", marginBottom: "1rem", textAlign: "center", fontWeight: "700" }}>Contact Us</h1>
          <p style={{ textAlign: "center", color: "#94a3b8", marginBottom: "2.5rem", lineHeight: "1.6", fontSize: "clamp(0.9rem, 4vw, 1rem)" }}>
            Have questions about the Wincburgh Speakers Club? Want to join as a guest? Drop us a message below and the committee will get back to you!
          </p>
          
          {resolvedParams.success && (
             <div style={{ padding: "1.5rem", marginBottom: "2rem", background: "rgba(16, 185, 129, 0.1)", border: "1px solid #10b981", borderRadius: "8px", color: "#10b981", textAlign: "center", fontWeight: "600" }}>
                Thanks for reaching out! We have received your message.
             </div>
          )}

          <form action={submitContactForm} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: "200px", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <label htmlFor="name" style={{ fontSize: "0.9rem", color: "#94a3b8" }}>Your Name</label>
                <input 
                  id="name" 
                  name="name" 
                  type="text" 
                  required 
                  style={{ padding: "0.8rem", borderRadius: "8px", background: "rgba(0,0,0,0.3)", border: "1px solid var(--card-border)", color: "white", outline: "none" }} 
                />
              </div>

              <div style={{ flex: 1, minWidth: "200px", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <label htmlFor="email" style={{ fontSize: "0.9rem", color: "#94a3b8" }}>Email Address</label>
                <input 
                  id="email" 
                  name="email" 
                  type="email" 
                  required 
                  style={{ padding: "0.8rem", borderRadius: "8px", background: "rgba(0,0,0,0.3)", border: "1px solid var(--card-border)", color: "white", outline: "none" }} 
                />
              </div>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <label htmlFor="message" style={{ fontSize: "0.9rem", color: "#94a3b8" }}>Message</label>
              <textarea 
                id="message" 
                name="message" 
                rows={5}
                required 
                style={{ padding: "0.8rem", borderRadius: "8px", background: "rgba(0,0,0,0.3)", border: "1px solid var(--card-border)", color: "white", outline: "none", resize: "vertical" }} 
              />
            </div>

            <button type="submit" className="btn-primary" style={{ padding: "1rem", fontSize: "1rem", marginTop: "1rem" }}>Send Message</button>
          </form>
        </div>
      </main>
    </div>
  )
}
