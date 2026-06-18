-- supabase/migrations/20260618000000_communications.sql

create table communications (
  id uuid primary key default gen_random_uuid(),
  subject text not null,
  body text not null,
  sender_title text not null,
  sent_by uuid references auth.users(id) on delete set null,
  sent_at timestamptz,
  status text not null default 'draft' check (status in ('draft', 'sent')),
  attachment_urls text[] not null default '{}'
);

create table communication_recipients (
  id uuid primary key default gen_random_uuid(),
  communication_id uuid not null references communications(id) on delete cascade,
  email text not null,
  name text not null,
  recipient_type text not null check (recipient_type in ('member', 'signup', 'external')),
  source_id uuid,
  unique (communication_id, email)
);

create table communication_replies (
  id uuid primary key default gen_random_uuid(),
  communication_id uuid not null references communications(id) on delete cascade,
  from_email text not null,
  from_name text not null,
  body text not null,
  received_at timestamptz not null default now()
);

create index if not exists communication_recipients_communication_id_idx
  on communication_recipients(communication_id);

create index if not exists communication_replies_communication_id_idx
  on communication_replies(communication_id);

alter table communications enable row level security;
alter table communication_recipients enable row level security;
alter table communication_replies enable row level security;

create policy "admin_all_communications" on communications
  for all using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

create policy "admin_all_communication_recipients" on communication_recipients
  for all using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

create policy "admin_read_communication_replies" on communication_replies
  for select using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );
