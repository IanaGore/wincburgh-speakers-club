import './Wordmark.css'

export default function Wordmark({ tone = 'dark' }: { tone?: 'dark' | 'light' }) {
  return (
    <div className={`wordmark wordmark--${tone}`}>
      <span className="wordmark__serif">Winchburgh</span>
      <span className="wordmark__mono">Speakers Club · est. 2021</span>
    </div>
  )
}
