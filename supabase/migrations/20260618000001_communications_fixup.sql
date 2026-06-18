-- Add FK indexes (idempotent — IF NOT EXISTS guards against re-run on fresh installs)
create index if not exists communication_recipients_communication_id_idx
  on communication_recipients(communication_id);

create index if not exists communication_replies_communication_id_idx
  on communication_replies(communication_id);
