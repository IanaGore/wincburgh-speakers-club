create table public.enquiry_messages (
  id uuid primary key default gen_random_uuid(),
  enquiry_id uuid not null references public.contact_messages(id) on delete cascade,
  direction text not null check (direction in ('outbound', 'inbound')),
  body text not null,
  sent_at timestamptz not null default now(),
  sent_by uuid references auth.users(id)
);

alter table public.enquiry_messages enable row level security;

create policy "Admins only"
  on public.enquiry_messages
  for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

grant select, insert, update, delete on public.enquiry_messages to authenticated;
