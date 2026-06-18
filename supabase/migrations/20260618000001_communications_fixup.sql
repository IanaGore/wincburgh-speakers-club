-- Fix communications.sent_by FK to use ON DELETE SET NULL
alter table communications drop constraint communications_sent_by_fkey;
alter table communications
  add constraint communications_sent_by_fkey
  foreign key (sent_by) references auth.users(id) on delete set null;

-- Add check constraints
alter table communications
  add constraint communications_status_check
  check (status in ('draft', 'sent'));

alter table communication_recipients
  add constraint communication_recipients_type_check
  check (recipient_type in ('member', 'signup', 'external'));

-- Add unique constraint
alter table communication_recipients
  add constraint communication_recipients_unique_email
  unique (communication_id, email);

-- Add FK indexes
create index if not exists communication_recipients_communication_id_idx
  on communication_recipients(communication_id);

create index if not exists communication_replies_communication_id_idx
  on communication_replies(communication_id);
