'use client'

export default function NavAnchorLink({ targetId, children }: {
  targetId: string
  children: React.ReactNode
}) {
  return (
    <a
      href={`#${targetId}`}
      onClick={(e) => {
        e.preventDefault()
        document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' })
      }}
    >
      {children}
    </a>
  )
}
