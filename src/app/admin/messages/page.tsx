import { createClient } from '@/utils/supabase/server'
import { markAsRead } from './actions'
import DeleteMessageButton from './DeleteMessageButton'

export default async function AdminMessagesPage() {
  const supabase = await createClient()

  const { data: messages } = await supabase
    .from('contact_messages')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div style={{ padding: "4rem 5%", flex: 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "2.5rem" }}>Admin: Contact Messages</h1>
      </div>
      
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {messages?.length === 0 ? (
          <div style={{ padding: "3rem", border: "1px dashed var(--card-border)", borderRadius: "12px", textAlign: "center", color: "#94a3b8" }}>
            No messages yet.
          </div>
        ) : (
          messages?.map(msg => (
            <div key={msg.id} style={{ 
              background: msg.is_read ? "rgba(0,0,0,0.2)" : "rgba(14, 165, 233, 0.1)", 
              border: "1px solid", 
              borderColor: msg.is_read ? "var(--card-border)" : "var(--primary)", 
              padding: "1.5rem", 
              borderRadius: "12px",
              display: "flex",
              flexDirection: "column",
              gap: "1rem"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h3 style={{ fontSize: "1.2rem", fontWeight: "bold", margin: 0, color: "white" }}>{msg.name}</h3>
                  <a href={`mailto:${msg.email}`} style={{ color: "var(--primary)", fontSize: "0.9rem" }}>{msg.email}</a>
                </div>
                <div style={{ color: "#94a3b8", fontSize: "0.85rem", textAlign: "right" }}>
                  {new Date(msg.created_at).toLocaleString()}
                  {!msg.is_read && <span style={{ display: "inline-block", marginLeft: "0.5rem", background: "var(--primary)", color: "white", padding: "0.1rem 0.4rem", borderRadius: "8px", fontSize: "0.7rem", fontWeight: "bold" }}>NEW</span>}
                </div>
              </div>
              
              <div style={{ background: "rgba(0,0,0,0.3)", padding: "1rem", borderRadius: "8px", whiteSpace: "pre-wrap", color: "#cbd5e1", lineHeight: "1.5" }}>
                {msg.message}
              </div>

              <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
                {!msg.is_read && (
                  <form action={markAsRead}>
                    <input type="hidden" name="message_id" value={msg.id} />
                    <button type="submit" className="btn-secondary" style={{ padding: "0.4rem 1rem", fontSize: "0.85rem", borderColor: "var(--primary)", color: "var(--primary)" }}>Mark as Read</button>
                  </form>
                )}
                <DeleteMessageButton messageId={msg.id} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
