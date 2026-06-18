import { updateCorrespondenceStatus } from '../actions'

export default function StatusButtons({ id, status }: { id: string; status: string }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {status === 'open' && (
        <form action={updateCorrespondenceStatus}>
          <input type="hidden" name="correspondence_id" value={id} />
          <input type="hidden" name="status" value="in_progress" />
          <button type="submit" className="wsc-btn wsc-btn-sm wsc-btn-ghost">Mark In Progress</button>
        </form>
      )}
      {status !== 'closed' && (
        <form action={updateCorrespondenceStatus}>
          <input type="hidden" name="correspondence_id" value={id} />
          <input type="hidden" name="status" value="closed" />
          <button type="submit" className="wsc-btn wsc-btn-sm wsc-btn-ghost">Close</button>
        </form>
      )}
      {status !== 'open' && (
        <form action={updateCorrespondenceStatus}>
          <input type="hidden" name="correspondence_id" value={id} />
          <input type="hidden" name="status" value="open" />
          <button type="submit" className="wsc-btn wsc-btn-sm wsc-btn-ghost">Reopen</button>
        </form>
      )}
    </div>
  )
}
