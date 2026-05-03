'use client'

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="btn-secondary"
      style={{ padding: "0.5rem 1rem", fontSize: "0.85rem", cursor: "pointer" }}
    >
      Print Programme
    </button>
  )
}
