import { createClient } from '@/utils/supabase/server'
import { updateSettings } from './actions'
import HowItWorksManager from './HowItWorksManager'
import FacilitiesManager from './FacilitiesManager'

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

  const { data: facilities } = await supabase
    .from('facilities')
    .select('id, icon, label')
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label htmlFor="meeting_day" className="wsc-label">Meeting Day</label>
            <input type="text" id="meeting_day" name="meeting_day" defaultValue={settings?.meeting_day ?? ''} className="wsc-input" placeholder="Tuesday" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label htmlFor="meeting_frequency" className="wsc-label">Meeting Frequency</label>
            <input type="text" id="meeting_frequency" name="meeting_frequency" defaultValue={settings?.meeting_frequency ?? ''} className="wsc-input" placeholder="1st & 3rd of the month" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label htmlFor="meeting_doors_time" className="wsc-label">Doors Open</label>
            <input type="text" id="meeting_doors_time" name="meeting_doors_time" defaultValue={settings?.meeting_doors_time ?? ''} className="wsc-input" placeholder="6:30pm" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label htmlFor="meeting_time" className="wsc-label">Meeting Start Time</label>
            <input type="text" id="meeting_time" name="meeting_time" defaultValue={settings?.meeting_time ?? ''} className="wsc-input" placeholder="7:00pm" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label htmlFor="meeting_end_time" className="wsc-label">Meeting End Time <span style={{ color: 'var(--ink-3)', fontWeight: 400 }}>(optional)</span></label>
            <input type="text" id="meeting_end_time" name="meeting_end_time" defaultValue={settings?.meeting_end_time ?? ''} className="wsc-input" placeholder="9:00pm" />
          </div>

          <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 500, fontSize: 20, margin: '0.5rem 0 0', color: 'var(--ink)' }}>President&apos;s Quote</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label htmlFor="president_quote" className="wsc-label">Quote</label>
            <textarea id="president_quote" name="president_quote" defaultValue={settings?.president_quote ?? ''} rows={3} className="wsc-input" placeholder="You don't need to be confident…" />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label htmlFor="president_name_fallback" className="wsc-label">Fallback Name <span style={{ color: 'var(--ink-3)', fontWeight: 400 }}>(used if no member is assigned the President role)</span></label>
            <input type="text" id="president_name_fallback" name="president_name_fallback" defaultValue={settings?.president_name_fallback ?? ''} className="wsc-input" placeholder="Margaret" />
          </div>

          <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 500, fontSize: 20, margin: '0.5rem 0 0', color: 'var(--ink)' }}>Homepage Call to Action</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label htmlFor="cta_body" className="wsc-label">CTA Text</label>
            <textarea id="cta_body" name="cta_body" defaultValue={settings?.cta_body ?? ''} rows={3} className="wsc-input" placeholder="No booking needed for your first visit…" />
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

        <h2 style={{ fontFamily: 'var(--serif)', fontWeight: 500, fontSize: 22, margin: '2rem 0 1rem', color: 'var(--ink)' }}>Facilities</h2>
        <p style={{ color: 'var(--ink-3)', fontSize: 14, margin: '0 0 1rem' }}>
          Shown on the homepage and contact page. Drag to reorder.
        </p>
        <FacilitiesManager initialFacilities={facilities ?? []} />
      </div>
    </div>
  )
}
