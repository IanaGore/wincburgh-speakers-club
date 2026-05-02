import { createClient } from '@/utils/supabase/server'
import { updateSettings } from './actions'
import Link from 'next/link'

export default async function AdminSettingsPage() {
  const supabase = await createClient()

  const { data: settings } = await supabase
    .from('site_settings')
    .select('*')
    .eq('id', 1)
    .single()

  return (
    <div style={{ padding: "4rem 5%", flex: 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "2.5rem" }}>Admin: Site Settings</h1>
      </div>
      
      <div style={{ background: "var(--card-bg)", padding: "2rem", borderRadius: "16px", border: "1px solid var(--card-border)", maxWidth: "800px" }}>
        <h2 style={{ fontSize: "1.5rem", marginBottom: "1.5rem" }}>Customize Public Homepage</h2>
        <form action={updateSettings} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label htmlFor="hero_title" style={{ color: "#94a3b8", fontSize: "0.9rem" }}>Hero Title</label>
            <textarea id="hero_title" name="hero_title" defaultValue={settings?.hero_title} required rows={3} style={{ padding: "0.8rem", borderRadius: "8px", background: "rgba(0,0,0,0.3)", border: "1px solid var(--card-border)", color: "white" }} />
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label htmlFor="hero_subtitle" style={{ color: "#94a3b8", fontSize: "0.9rem" }}>Hero Subtitle</label>
            <textarea id="hero_subtitle" name="hero_subtitle" defaultValue={settings?.hero_subtitle} required rows={3} style={{ padding: "0.8rem", borderRadius: "8px", background: "rgba(0,0,0,0.3)", border: "1px solid var(--card-border)", color: "white" }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label htmlFor="about_text" style={{ color: "#94a3b8", fontSize: "0.9rem" }}>About Us Text</label>
            <textarea id="about_text" name="about_text" defaultValue={settings?.about_text} required rows={5} style={{ padding: "0.8rem", borderRadius: "8px", background: "rgba(0,0,0,0.3)", border: "1px solid var(--card-border)", color: "white" }} />
          </div>

          <button type="submit" className="btn-primary" style={{ alignSelf: "flex-start", marginTop: "1rem" }}>Save Changes</button>
        </form>
      </div>
    </div>
  )
}
