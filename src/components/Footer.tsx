import Link from 'next/link'
import Wordmark from './Wordmark'
import './Footer.css'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner">
        <div className="footer__brand">
          <Wordmark />
          <p className="footer__tagline">Winchburgh&apos;s home for public speaking, storytelling, and connecting.</p>
        </div>
        <div className="footer__col">
          <h4>Visit</h4>
          <ul>
            <li><Link href="/meetings">Upcoming meetings</Link></li>
            <li><Link href="/get-started?intent=ask#find-us">Find us</Link></li>
            <li><Link href="/get-started?intent=ask#find-us">Accessibility</Link></li>
          </ul>
        </div>
        <div className="footer__col">
          <h4>About</h4>
          <ul>
            <li><Link href="/about">About the club</Link></li>
            <li><Link href="/news">News</Link></li>
            <li><Link href="/about#pathways">Speaking pathways</Link></li>
          </ul>
        </div>
        <div className="footer__col">
          <h4>Contact</h4>
          <ul>
            <li><a href="mailto:hello@winchburghsc.co.uk">hello@winchburghsc.co.uk</a></li>
            <li><Link href="/get-started?intent=ask">Send a message</Link></li>
            <li><a href="https://www.facebook.com" target="_blank" rel="noopener noreferrer">Facebook</a></li>
          </ul>
        </div>
      </div>
      <div className="footer__bar">
        <span style={{ fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--ink-4)' }}>
          © {new Date().getFullYear()} Winchburgh Speakers Club
        </span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--ink-4)' }}>
          est. 2018
        </span>
      </div>
    </footer>
  )
}
