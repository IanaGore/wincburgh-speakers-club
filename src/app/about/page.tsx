import { createClient } from '@/utils/supabase/server'
import NavbarServer from '@/components/NavbarServer'
import Footer from '@/components/Footer'
import PhotoSlot from '@/components/ui/PhotoSlot'
import Link from 'next/link'
import './about.css'

export const metadata = { title: 'About | Winchburgh Speakers Club' }

export default async function AboutPage() {
  const supabase = await createClient()
  const { data: settings } = await supabase
    .from('site_settings')
    .select('about_mission, about_body')
    .eq('id', 1)
    .single()

  const mission = settings?.about_mission ?? 'A friendly public speaking club helping members build confidence.'
  const body    = settings?.about_body    ?? 'We meet regularly to practise speeches and support each other to grow.'

  return (
    <div className="about-page">
      <NavbarServer />
      <main>
        <section className="about-hero">
          <PhotoSlot mediaKey="about_hero" width="100%" height="100%" label="about hero" style={{ position: 'absolute', inset: 0 }} />
          <div className="about-hero__overlay">
            <h1 className="about-hero__title">Winchburgh Speakers Club</h1>
            <p className="about-hero__mission">{mission}</p>
            <Link href="/get-started?intent=attend" className="wsc-btn wsc-btn-primary">Come to a meeting</Link>
          </div>
        </section>

        <section className="about-content">
          <p className="about-body">{body}</p>
        </section>

        <section className="about-cta">
          <div className="about-cta__inner">
            <h2 className="about-cta__heading">Ready to give it a try?</h2>
            <p className="about-cta__tagline">Your first three visits are free.</p>
            <Link href="/get-started?intent=attend" className="wsc-btn wsc-btn-primary wsc-btn-lg">RSVP for a meeting</Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
