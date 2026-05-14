'use client'

export default function SpeechesError({ error }: { error: Error }) {
  return (
    <main style={{ padding: '2rem', fontFamily: 'monospace' }}>
      <h1>Speeches page error</h1>
      <pre style={{ background: '#111', color: '#f66', padding: '1rem', borderRadius: '8px', whiteSpace: 'pre-wrap' }}>
        {error.message}
        {'\n\n'}
        {error.stack}
      </pre>
    </main>
  )
}
