import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import EyebrowLabel from '@/components/ui/EyebrowLabel'
import ContactForm from './ContactForm'
import './contact.css'

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>
}) {
  const params = await searchParams
  const success = params.success === 'true'

  return (
    <>
      <Navbar />
      <main>
        <div className="contact-page">
          <div className="contact-page__header">
            <EyebrowLabel color="clay">Get in touch</EyebrowLabel>
            <h1>We&apos;d love to hear from you.</h1>
            <p>
              Questions about the club? Want to come as a guest? Drop us a message and someone from the committee will get back to you — usually within a day or two.
            </p>
          </div>

          <div className="contact-layout">
            {/* Left: form */}
            <div>
              <ContactForm success={success} />
            </div>

            {/* Right: info */}
            <div className="contact-info">
              <div className="contact-find-us">
                <h3>Find us</h3>
                <div className="contact-find-us__detail">
                  <span>📍</span>
                  <div>
                    <strong>Winchburgh Community Centre</strong><br />
                    Main Street, Winchburgh, EH52 6QF
                  </div>
                </div>
                <div className="contact-find-us__detail">
                  <span>🕖</span>
                  <div>1st &amp; 3rd Tuesday · doors 6:30pm</div>
                </div>
                <div className="contact-find-us__detail">
                  <span>🚗</span>
                  <div>Free parking on-site. Step-free entrance. Hearing loop available.</div>
                </div>
              </div>

              <div className="contact-faqs">
                <h3>Common questions</h3>
                <div className="contact-faq">
                  <details>
                    <summary>Do I need to book?</summary>
                    <p>No booking needed for your first three visits. Just turn up. If you&apos;re coming for the first time, a quick message so we can look out for you is always nice — but it&apos;s not required.</p>
                  </details>
                  <details>
                    <summary>Will I have to speak?</summary>
                    <p>Absolutely not. You won&apos;t be put on the spot. Lots of people come along for weeks before they feel ready to take a role. You move at your own pace, full stop.</p>
                  </details>
                  <details>
                    <summary>What does it cost?</summary>
                    <p>Your first three visits are completely free. After that, membership is £30 per quarter — around £2.50 a week. That covers the room, refreshments, and access to all club resources.</p>
                  </details>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <a
                  href="mailto:hello@winchburghspeakers.co.uk"
                  style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--ink-2)', fontSize: 15, textDecoration: 'none' }}
                >
                  <span>✉️</span>
                  hello@winchburghspeakers.co.uk
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
