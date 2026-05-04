'use client'

export default function ScrollButton({ targetId, className, children }: {
  targetId: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <button
      className={className}
      onClick={() => document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' })}
    >
      {children}
    </button>
  )
}
