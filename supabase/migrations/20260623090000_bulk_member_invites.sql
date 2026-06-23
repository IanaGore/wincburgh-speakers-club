create table public.bulk_invite_batches (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references auth.users(id) on delete set null,
  file_name text not null,
  file_type text not null check (file_type in ('csv', 'xlsx')),
  status text not null default 'draft' check (status in ('draft', 'ready', 'processing', 'completed', 'failed')),
  row_count integer not null default 0,
  valid_count integer not null default 0,
  invalid_count integer not null default 0,
  skipped_count integer not null default 0,
  error_message text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create table public.bulk_invite_batch_rows (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.bulk_invite_batches(id) on delete cascade,
  row_number integer not null,
  email text not null,
  first_name text not null,
  last_name text,
  status text not null default 'pending' check (status in ('pending', 'valid', 'invalid', 'skipped', 'sent', 'failed')),
  error text,
  signup_id uuid references public.signups(id) on delete set null,
  unique (batch_id, email)
);

create table public.invite_send_locks (
  name text primary key,
  acquired_at timestamptz not null default now()
);

alter table public.bulk_invite_batches enable row level security;
alter table public.bulk_invite_batch_rows enable row level security;
alter table public.invite_send_locks enable row level security;

create policy "admins manage bulk invite batches" on public.bulk_invite_batches
  for all using (
    exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.is_admin = true)
  );

create policy "admins manage bulk invite batch rows" on public.bulk_invite_batch_rows
  for all using (
    exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.is_admin = true)
  );

create policy "admins manage invite send locks" on public.invite_send_locks
  for all using (
    exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.is_admin = true)
  );
