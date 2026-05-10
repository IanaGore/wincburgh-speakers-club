import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import PhotoSlot from '@/components/ui/PhotoSlot'
import EyebrowLabel from '@/components/ui/EyebrowLabel'
import Button from '@/components/ui/Button'
import Tag from '@/components/ui/Tag'
import './page.css'

function formatDay(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric' })
}

function formatMonth(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', { month: 'short' }).toUpperCase()
}

export default async function Home() {
  const supabase = await createClient()

  const { data: events } = await supabase
    .from('meetings')
    .select('*')
    .gte('meeting_date', new Date().toISOString().split('T')[0])
    .order('meeting_date', { ascending: true })
    .limit(3)

  const { data: news } = await supabase
    .from('news_posts')
    .select('*')
    .eq('is_published', true)
    .order('published_at', { ascending: false })
    .limit(3)

  const { count: memberCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })

  const nextMeeting = events?.[0]

  return (
    <>
      <Navbar />

      <main>
        {/* Hero */}
        <section className="home-hero">
          <div>
            <div className="home-hero__eyebrow">
              <EyebrowLabel>Winchburgh · West Lothian</EyebrowLabel>
            </div>
            <h1>
              The warmest room in Winchburgh{' '}
              <em>on a Tuesday.</em>
            </h1>
            <p className="home-hero__body">
              We&apos;re a friendly bunch who meet twice a month to practise speaking, try new things, and have a proper cup of tea. No experience needed. No booking required for your first visit.
            </p>
            <div className="home-hero__actions">
              <Button href="/signup" variant="primary">Come to a meeting</Button>
              <Button href="/#about" variant="ghost">What happens?</Button>
            </div>
            {memberCount != null && (
              <div className="home-hero__avatars">
                <div className="home-hero__avatar-stack">
                  <PhotoSlot width={40} height={40} label="" style={{ borderRadius: '50%' }} />
                  <PhotoSlot width={40} height={40} label="" style={{ borderRadius: '50%' }} />
                  <PhotoSlot width={40} height={40} label="" style={{ borderRadius: '50%' }} />
                </div>
                <span className="home-hero__member-count">
                  <strong>{memberCount}+</strong> members and growing
                </span>
              </div>
            )}
          </div>

          <div className="home-hero__visual">
            <PhotoSlot
              label="member at lectern"
              className="home-hero__photo-large"
              style={{ width: '75%', height: '80%', top: 0, left: 0, position: 'absolute' }}
            />
            <PhotoSlot
              label="audience"
              className="home-hero__photo-small"
              style={{ width: '55%', height: '55%', bottom: 0, right: 0, position: 'absolute', background: 'oklch(0.72 0.09 200 / 0.25)' }}
            />
            {nextMeeting && (
              <div className="home-hero__meeting-pill">
                <div className="home-hero__date-badge">
                  <div className="day">{formatDay(nextMeeting.meeting_date)}</div>
                  <div className="month">{formatMonth(nextMeeting.meeting_date)}</div>
                </div>
                <div className="home-hero__pill-info">
                  <div className="label">Next meeting</div>
                  <div className="title">{nextMeeting.theme || 'Members\' Meeting'}</div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* How it works */}
        <section className="home-how" id="about">
          <div className="home-how__inner">
            <div className="home-how__header">
              <EyebrowLabel tone="clay">How it works</EyebrowLabel>
              <h2>We keep it simple. <em>You keep your seat.</em></h2>
            </div>
            <div className="home-how__steps">
              {[
                {
                  num: 'Step 01',
                  title: 'Just turn up',
                  body: 'No booking needed for your first three visits. The kettle goes on at half six. Meeting starts at seven. Someone will meet you at the door.',
                },
                {
                  num: 'Step 02',
                  title: 'Watch and listen',
                  body: "You won't be asked to speak until you're ready. Watch how it works, ask questions, eat a biscuit. There's absolutely no pressure.",
                },
                {
                  num: 'Step 03',
                  title: 'Find your pace',
                  body: "When you're ready, take a role. Give a speech. Get feedback. We follow the Pathways programme — or we can just be your Tuesday-night practice ground.",
                },
              ].map((step) => (
                <div key={step.num} className="home-how__step">
                  <div className="home-how__step-num">{step.num}</div>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pull-quote */}
        <section className="home-quote">
          <div className="home-quote__inner">
            <span className="home-quote__mark">&ldquo;</span>
            <blockquote>
              You don&apos;t need to be confident. You don&apos;t need to have anything to say. You just need to turn up.
            </blockquote>
            <p className="home-quote__attribution">— Margaret, Club President</p>
          </div>
        </section>

        {/* News */}
        {news && news.length > 0 && (
          <section className="home-news" id="news">
            <div className="home-news__inner">
              <div className="home-news__header">
                <h2>From the club</h2>
                <Link href="/news" className="wsc-btn wsc-btn-ghost wsc-btn-sm">All news →</Link>
              </div>
              <div className="home-news__grid">
                {news.map((post: any) => (
                  <article key={post.id} className="home-news__card">
                    <PhotoSlot height={180} label="news image" style={{ borderRadius: 0 }} />
                    <div className="home-news__card-body">
                      <div className="home-news__card-meta">
                        <Tag variant="clay">Update</Tag>
                        <span className="home-news__card-date">
                          {new Date(post.published_at).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                      <h3>{post.title}</h3>
                      <p>{post.excerpt || post.content?.slice(0, 100)}</p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Village map + venue */}
        <section className="home-venue" id="meetings">
          <div className="home-venue__inner">
            <div className="home-venue__map">
              <svg viewBox="0 0 400 300" xmlns="http://www.w3.org/2000/svg">
                <rect width="400" height="300" fill="oklch(0.95 0.014 230)" rx="16" />
                {/* Roads */}
                <path d="M 20 150 L 380 150" stroke="oklch(0.88 0.025 230)" strokeWidth="8" strokeLinecap="round" />
                <path d="M 200 20 L 200 280" stroke="oklch(0.88 0.025 230)" strokeWidth="8" strokeLinecap="round" />
                <path d="M 80 80 L 320 220" stroke="oklch(0.88 0.025 230)" strokeWidth="6" strokeLinecap="round" />
                {/* Canal */}
                <path d="M 0 200 Q 100 190 200 200 Q 300 210 400 200" stroke="var(--sage)" strokeWidth="5" fill="none" strokeLinecap="round" />
                {/* Labels */}
                <text x="50" y="140" fontFamily="JetBrains Mono, monospace" fontSize="9" fill="oklch(0.55 0.040 240)" letterSpacing="1">MAIN STREET</text>
                <text x="205" y="100" fontFamily="JetBrains Mono, monospace" fontSize="9" fill="oklch(0.55 0.040 240)" letterSpacing="1" transform="rotate(90 205 100)">SCHOOL RD</text>
                <text x="60" y="215" fontFamily="JetBrains Mono, monospace" fontSize="8" fill="var(--sage)" letterSpacing="1">UNION CANAL</text>
                {/* Venue pin */}
                <circle cx="200" cy="150" r="14" fill="var(--clay)" />
                <circle cx="200" cy="150" r="6" fill="white" />
                <text x="215" y="135" fontFamily="JetBrains Mono, monospace" fontSize="9" fill="var(--clay-deep)" fontWeight="500">Community Centre</text>
              </svg>
            </div>

            <div className="home-venue__info">
              <EyebrowLabel tone="clay">Find us</EyebrowLabel>
              <h2>It is the warmest room in Winchburgh on a Tuesday. <em>Honest.</em></h2>
              <div className="home-venue__detail">
                <div className="home-venue__detail-icon">📍</div>
                <div>
                  <strong>Winchburgh Community Centre</strong><br />
                  Main Street, Winchburgh, EH52 6QF
                </div>
              </div>
              <div className="home-venue__detail">
                <div className="home-venue__detail-icon">🕖</div>
                <div>
                  <strong>1st &amp; 3rd Tuesday of the month</strong><br />
                  Doors 6:30pm · Meeting 7:00pm
                </div>
              </div>
              <div className="home-venue__access">
                ✅ Step-free access &nbsp;·&nbsp; 🔊 Hearing loop &nbsp;·&nbsp; 🚗 Free parking on-site
              </div>
              <div style={{ marginTop: 28 }}>
                <Button href="https://maps.google.com/?q=Winchburgh+Community+Centre" variant="ghost">
                  Get directions →
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* CTA strip */}
        <section className="home-cta">
          <div className="home-cta__inner">
            <EyebrowLabel>Ready when you are</EyebrowLabel>
            <h2>Come and <em>try us.</em></h2>
            <p>
              No booking needed for your first visit. Margaret, our president, will drop you a quick hello in the next day or two.
            </p>
            <div className="home-cta__actions">
              <Button href="/signup" variant="primary">Come to a meeting</Button>
              <Button href="/contact" variant="ghost-light">Get in touch</Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}
