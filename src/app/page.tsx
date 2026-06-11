import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import NavbarServer from '@/components/NavbarServer'
import Footer from '@/components/Footer'
import PhotoSlot from '@/components/ui/PhotoSlot'
import EyebrowLabel from '@/components/ui/EyebrowLabel'
import Button from '@/components/ui/Button'
import Tag from '@/components/ui/Tag'
import { formatScheduleLine, formatTimesLine, mapsUrl, venueName, venueAddress, VENUE_COLUMNS } from '@/lib/venue'
import { presidentQuote, getPresidentName, PRESIDENT_COLUMNS } from '@/lib/president'
import { ctaBody, CTA_COLUMNS } from '@/lib/cta'
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

  // Batch-fetch news images — one query, no N+1 (mirrors /news list page)
  const newsMediaKeys = (news ?? []).map((p: any) => `news_post_${p.id}`)
  const { data: newsMediaRows } = newsMediaKeys.length > 0
    ? await supabase.from('media').select('key, storage_path, alt_text').in('key', newsMediaKeys)
    : { data: [] }
  const newsBucketUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/site-media`
  const newsImageByKey: Record<string, { storage_path: string; alt_text: string | null }> = Object.fromEntries(
    (newsMediaRows ?? []).map((r: any) => [r.key, r])
  )

  const { count: memberCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })

  const { data: settings } = await supabase
    .from('site_settings')
    .select(`how_it_works_eyebrow, how_it_works_heading, how_it_works_heading_em, ${VENUE_COLUMNS}, ${PRESIDENT_COLUMNS}, ${CTA_COLUMNS}`)
    .eq('id', 1)
    .single()

  const presidentName = await getPresidentName(supabase, settings ?? {})

  const { data: howItWorksSteps } = await supabase
    .from('how_it_works_steps')
    .select('id, title, body')
    .order('sort_order', { ascending: true })

  const { data: facilities } = await supabase
    .from('facilities')
    .select('id, icon, label')
    .order('sort_order', { ascending: true })

  const nextMeeting = events?.[0]

  return (
    <>
      <NavbarServer />

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
              mediaKey="homepage_hero"
              label="member at lectern"
              className="home-hero__photo-large"
              style={{ width: '75%', height: '80%', top: 0, left: 0, position: 'absolute' }}
            />
            <PhotoSlot
              mediaKey="homepage_hero_secondary"
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
              <EyebrowLabel tone="clay">{settings?.how_it_works_eyebrow ?? 'How it works'}</EyebrowLabel>
              <h2>
                {settings?.how_it_works_heading ?? 'We keep it simple.'}{' '}
                {settings?.how_it_works_heading_em && <em>{settings.how_it_works_heading_em}</em>}
              </h2>
            </div>
            {howItWorksSteps && howItWorksSteps.length > 0 && (
              <div className="home-how__steps">
                {howItWorksSteps.map((step, i) => (
                  <div key={step.id} className="home-how__step">
                    <div className="home-how__step-num">Step {String(i + 1).padStart(2, '0')}</div>
                    <h3>{step.title}</h3>
                    <p>{step.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Pull-quote */}
        <section className="home-quote">
          <div className="home-quote__inner">
            <span className="home-quote__mark">&ldquo;</span>
            <blockquote>
              {presidentQuote(settings ?? {})}
            </blockquote>
            <p className="home-quote__attribution">— {presidentName}, Club President</p>
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
                {news.map((post: any) => {
                  const newsImage = newsImageByKey[`news_post_${post.id}`]
                  const newsImageUrl = newsImage ? `${newsBucketUrl}/${newsImage.storage_path}` : null
                  return (
                  <article key={post.id} className="home-news__card">
                    {newsImageUrl ? (
                      <img
                        src={newsImageUrl}
                        alt={newsImage?.alt_text ?? post.title}
                        style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }}
                      />
                    ) : (
                      <PhotoSlot height={180} label="news image" style={{ borderRadius: 0 }} />
                    )}
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
                  )
                })}
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
                  <strong>{venueName(settings ?? {})}</strong><br />
                  {venueAddress(settings ?? {})}
                </div>
              </div>
              <div className="home-venue__detail">
                <div className="home-venue__detail-icon">🕖</div>
                <div>
                  <strong>{formatScheduleLine(settings ?? {})}</strong><br />
                  {formatTimesLine(settings ?? {})}
                </div>
              </div>
              {facilities && facilities.length > 0 && (
                <div className="home-venue__access">
                  {facilities.map((f, i) => (
                    <span key={f.id}>
                      {i > 0 && <>&nbsp;·&nbsp;</>}
                      {f.icon} {f.label}
                    </span>
                  ))}
                </div>
              )}
              <div style={{ marginTop: 28 }}>
                <Button href={mapsUrl(settings ?? {})} variant="ghost">
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
              {ctaBody(settings ?? {})}
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
