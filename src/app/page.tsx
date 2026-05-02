import Link from "next/link";
import { createClient } from '@/utils/supabase/server'
import Navbar from '@/components/Navbar'

export default async function Home() {
  const supabase = await createClient()

  // Fetch actual upcoming meetings
  const { data: events } = await supabase
    .from('meetings')
    .select('*, meeting_assignments(id, member_id)')
    .gte('meeting_date', new Date().toISOString().split('T')[0])
    .order('meeting_date', { ascending: true })
    .limit(3)

  // Fetch top 3 latest news
  const { data: news } = await supabase
    .from('news_posts')
    .select('*')
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .limit(3)

  // Fetch settings
  const { data: settings } = await supabase
    .from('site_settings')
    .select('*')
    .eq('id', 1)
    .single()

  const heroTitle = settings?.hero_title || "UNCAP YOUR POTENTIAL.\nMASTER THE ART\nOF SPEAKING."
  const heroSubtitle = settings?.hero_subtitle || "Find your voice, build confidence, and become an impactful speaker in our vibrant community."

  return (
    <>
      <Navbar />

      <main style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>

        <section className="hero">
          <div className="hero-content">
            <h1 style={{ whiteSpace: "pre-line" }}>{heroTitle}</h1>
            <p style={{ whiteSpace: "pre-line" }}>{heroSubtitle}</p>
            <div className="hero-actions">
              <Link href="/login" className="btn-primary">JOIN US →</Link>
              <Link href="#about" className="btn-secondary">LEARN MORE</Link>
            </div>
          </div>
          {/* We would put a nice 3D illustration or image here in the future */}
          <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
             <div style={{ width: "300px", height: "400px", background: "rgba(255,255,255,0.05)", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(5px)" }}>
                 <span style={{ fontSize: "4rem" }}>🎤</span>
             </div>
          </div>
        </section>

        {/* Latest News Section */}
        <section id="news" className="events-section" style={{ marginBottom: "2rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "1.5rem" }}>
             <h2 className="events-title" style={{ marginBottom: 0 }}>Latest News</h2>
             <Link href="/news" style={{ color: "var(--primary)", fontSize: "0.9rem", fontWeight: "bold" }}>View All →</Link>
          </div>
          <div className="events-grid">
            {news?.map(post => (
              <div key={post.id} className="event-card" style={{ background: "rgba(15, 23, 42, 0.4)" }}>
                <div className="event-date">{new Date(post.published_at).toLocaleDateString()}</div>
                <h3 className="event-title">{post.title}</h3>
                <p className="event-desc">{post.content.substring(0, 100)}...</p>
                <div className="event-footer">
                  <Link href={`/news/${post.id}`} className="btn-secondary" style={{ padding: "0.4rem 1rem", fontSize: "0.8rem" }}>Read Article</Link>
                </div>
              </div>
            ))}
            {(!news || news.length === 0) && <p style={{color: "#94a3b8"}}>No recent news.</p>}
          </div>
        </section>

        <section id="events" className="events-section">
          <h2 className="events-title">Upcoming Events</h2>
          <div className="events-grid">
            {events?.map(event => {
              const dateStr = new Date(event.meeting_date).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }).toUpperCase()
              const filledRoles = event.meeting_assignments?.filter((a: any) => a.member_id).length || 0
              const totalRoles = event.meeting_assignments?.length || 0

              return (
                <div key={event.id} className="event-card">
                  <div className="event-date">{dateStr} | 7:00 PM</div>
                  <h3 className="event-title">Club Meeting</h3>
                  <p className="event-desc">{event.theme ? `Theme: ${event.theme}` : 'Standard Club Session with prepared speeches and evaluations.'}</p>
                  <div className="event-footer" style={{ flexDirection: "column", gap: "0.5rem", alignItems: "flex-start" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                      <span>📍 {settings?.venue_name || 'Local Venue'}</span>
                      <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>{filledRoles}/{totalRoles} Roles Filled</span>
                    </div>
                    <span style={{ color: "#94a3b8", fontSize: "0.85rem", whiteSpace: "pre-wrap" }}>{settings?.venue_address || ''}</span>
                  </div>
                </div>
              )
            })}
            
            {(!events || events.length === 0) && (
              <p style={{color: "#94a3b8"}}>No public events scheduled currently.</p>
            )}
          </div>
        </section>

        <section id="about" className="events-section" style={{ marginBottom: "4rem" }}>
           <h2 className="events-title">About Us</h2>
           <div style={{ background: "var(--card-bg)", padding: "2.5rem", borderRadius: "16px", border: "1px solid var(--card-border)", color: "#cbd5e1", lineHeight: "1.8", whiteSpace: "pre-line" }}>
              {settings?.about_text || "Welcome to the Speakers Club."}
           </div>
        </section>
      </main>
    </>
  );
}
