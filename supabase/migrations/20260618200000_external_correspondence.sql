-- External correspondence tables
-- Captures emails to president@winchburghspeakersclub.uk for secretary review

create table external_correspondence (
  id          uuid        primary key default gen_random_uuid(),
  subject     text        not null,
  from_email  text        not null,
  from_name   text        not null default '',
  status      text        not null default 'open'
                          check (status in ('open', 'in_progress', 'closed')),
  received_at timestamptz not null default now()
);

create table correspondence_messages (
  id                  uuid        primary key default gen_random_uuid(),
  correspondence_id   uuid        not null
                                  references external_correspondence(id)
                                  on delete cascade,
  direction           text        not null check (direction in ('inbound', 'outbound')),
  body                text        not null,
  from_email          text        not null,
  from_name           text        not null default '',
  sent_at             timestamptz not null default now(),
  sent_by             uuid        references auth.users(id) on delete set null
);

create index on correspondence_messages(correspondence_id);

alter table external_correspondence  enable row level security;
alter table correspondence_messages  enable row level security;

create policy "admin_all" on external_correspondence
  for all to authenticated
  using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

create policy "admin_all" on correspondence_messages
  for all to authenticated
  using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );
