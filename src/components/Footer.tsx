import Link from 'next/link'
import Wordmark from './Wordmark'
import './Footer.css'

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__grid">
        <div className="site-footer__brand">
          <Wordmark />
          <p>
            A friendly community of speakers in Winchburgh, West Lothian. We meet on the 1st and 3rd Tuesday of every month at the Winchburgh Community Centre.
          </p>
        </div>

        <div className="site-footer__col">
          <h4>Visit</h4>
          <ul>
            <li><Link href="/#meetings">Upcoming meetings</Link></li>
            <li><Link href="/contact">Find us</Link></li>
            <li><Link href="/contact">Get in touch</Link></li>
          </ul>
        </div>

        <div className="site-footer__col">
          <h4>About</h4>
          <ul>
            <li><Link href="/#about">How it works</Link></li>
            <li><Link href="/#about">What to expect</Link></li>
            <li><Link href="/login">Member login</Link></li>
          </ul>
        </div>

        <div className="site-footer__col">
          <h4>Stay in touch</h4>
          <p style={{ fontSize: 14, color: 'var(--ink-3)', marginBottom: 12 }}>
            Occasional updates, no spam.
          </p>
          <form className="site-footer__newsletter" onSubmit={(e) => e.preventDefault()}>
            <input type="email" placeholder="your@email.com" aria-label="Email address" />
            <button type="submit">Join</button>
          </form>
        </div>
      </div>

      <div className="site-footer__bar">
        <span>© {new Date().getFullYear()} Winchburgh Speakers Club</span>
        <Link href="/contact">Contact us</Link>
      </div>
    </footer>
  )
}
