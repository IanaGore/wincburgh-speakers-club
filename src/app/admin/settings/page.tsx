import { createClient } from '@/utils/supabase/server'
import { updateSettings } from './actions'
import HowItWorksManager from './HowItWorksManager'

export default async function AdminSettingsPage() {
  const supabase = await createClient()

  const { data: settings } = await supabase
    .from('site_settings')
    .select('*')
    .eq('id', 1)
    .single()

  const { data: steps } = await supabase
    .from('how_it_works_steps')
    .select('id, title, body')
    .order('sort_order', { ascending: true })

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--serif)', fontWeight: 500, fontSize: 32, margin: '8px 0 24px', color: 'var(--ink)' }}>Site Settings</h1>

      <div className="wsc-card" style={{ maxWidth: 800, padding: '2rem', margin: '0 auto' }}>
        <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 500, fontSize: 22, margin: '0 0 1.5rem', color: 'var(--ink)' }}>Customize Public Homepage</h2>
        <form action={updateSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label htmlFor="hero_title" className="wsc-label">Hero Title</label>
            <textarea id="hero_title" name="hero_title" defaultValue={settings?.hero_title} required rows={3} className="wsc-input" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label htmlFor="hero_subtitle" className="wsc-label">Hero Subtitle</label>
            <textarea id="hero_subtitle" name="hero_subtitle" defaultValue={settings?.hero_subtitle} required rows={3} className="wsc-input" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label htmlFor="about_text" className="wsc-label">About Us Text</label>
            <textarea id="about_text" name="about_text" defaultValue={settings?.about_text} required rows={5} className="wsc-input" />
          </div>

          <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 500, fontSize: 20, margin: '0.5rem 0 0', color: 'var(--ink)' }}>Venue Details</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label htmlFor="venue_name" className="wsc-label">Venue Name</label>
            <input type="text" id="venue_name" name="venue_name" defaultValue={settings?.venue_name} required className="wsc-input" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label htmlFor="venue_address" className="wsc-label">Venue Address</label>
            <textarea id="venue_address" name="venue_address" defaultValue={settings?.venue_address} required rows={2} className="wsc-input" />
          </div>

          <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 500, fontSize: 20, margin: '0.5rem 0 0', color: 'var(--ink)' }}>How It Works — Header</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label htmlFor="how_it_works_eyebrow" className="wsc-label">Eyebrow Label</label>
            <input type="text" id="how_it_works_eyebrow" name="how_it_works_eyebrow" defaultValue={settings?.how_it_works_eyebrow ?? ''} className="wsc-input" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label htmlFor="how_it_works_heading" className="wsc-label">Heading</label>
            <input type="text" id="how_it_works_heading" name="how_it_works_heading" defaultValue={settings?.how_it_works_heading ?? ''} className="wsc-input" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label htmlFor="how_it_works_heading_em" className="wsc-label">Heading Accent (shown in italics)</label>
            <input type="text" id="how_it_works_heading_em" name="how_it_works_heading_em" defaultValue={settings?.how_it_works_heading_em ?? ''} className="wsc-input" />
          </div>

          <div>
            <button type="submit" className="wsc-btn wsc-btn-primary">Save Changes</button>
          </div>
        </form>

        <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 500, fontSize: 22, margin: '2rem 0 1rem', color: 'var(--ink)' }}>How It Works — Steps</h2>
        <p style={{ color: 'var(--ink-3)', fontSize: 14, margin: '0 0 1rem' }}>
          Drag the cards to reorder. Step numbers update automatically.
        </p>
        <HowItWorksManager initialSteps={steps ?? []} />
      </div>
    </div>
  )
}
