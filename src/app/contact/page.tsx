import ContactForm from './ContactForm'
import EyebrowLabel from '@/components/ui/EyebrowLabel'
import NavbarServer from '@/components/NavbarServer'
import Footer from '@/components/Footer'
import { createClient } from '@/utils/supabase/server'
import { mapsUrl, venueName, venueAddress, VENUE_COLUMNS } from '@/lib/venue'
import './contact.css'

export default async function ContactPage() {
  const supabase = await createClient()
  const { data: settings } = await supabase
    .from('site_settings')
    .select(VENUE_COLUMNS)
    .eq('id', 1)
    .single()
  const { data: facilities } = await supabase
    .from('facilities')
    .select('id, icon, label')
    .order('sort_order', { ascending: true })

  return (
    <>
    <NavbarServer />
    <main className="contact-page">
      <div className="contact-inner">
        <div className="contact-left">
          <EyebrowLabel tone="clay">Get in touch</EyebrowLabel>
          <h1>We&apos;d love to hear from you</h1>
          <p className="contact-intro">Whether you&apos;re curious about visiting, have a question, or just want to say hello — drop us a message and we&apos;ll get back to you soon.</p>
          <ContactForm />
        </div>
        <aside className="contact-right">
          <div className="contact-find-us wsc-card" id="find-us">
            <EyebrowLabel>Find us</EyebrowLabel>
            <h2>{venueName(settings ?? {})}</h2>
            <address>
              <p>{venueAddress(settings ?? {})}</p>
            </address>
            {facilities && facilities.length > 0 && (
              <p className="contact-find-us__access">
                {facilities.map((f) => (
                  <span key={f.id} style={{ display: 'block' }}>{f.icon} {f.label}</span>
                ))}
              </p>
            )}
            <a href={mapsUrl(settings ?? {})} target="_blank" rel="noopener noreferrer" className="wsc-btn wsc-btn-ghost wsc-btn-sm contact-find-us__link">
              Get directions
            </a>
          </div>

          <div className="contact-faqs">
            <EyebrowLabel>Common questions</EyebrowLabel>
            <details className="contact-faq">
              <summary>Do I need to book?</summary>
              <p>No booking needed for your first three visits. Just turn up. If you&apos;d like to let us know you&apos;re coming, you can use the form above — but it&apos;s not required.</p>
            </details>
            <details className="contact-faq">
              <summary>Will I have to speak?</summary>
              <p>Not on your first visit — or your second, or your third. You&apos;re welcome to just watch until you feel ready. Nobody will put you on the spot.</p>
            </details>
            <details className="contact-faq">
              <summary>What does it cost?</summary>
              <p>Your first three visits are completely free. After that, membership is £3 per meeting. No hidden costs, no annual fee.</p>
            </details>
          </div>
        </aside>
      </div>
    </main>
    <Footer />
    </>
  )
}
