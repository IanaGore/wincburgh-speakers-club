-- Add venue details to site settings
alter table public.site_settings
add column if not exists venue_name text default 'Wincburgh Village Hall',
add column if not exists venue_address text default 'Wincburgh, West Lothian';

-- Create Contact Messages table
create table if not exists public.contact_messages (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  email text not null,
  message text not null,
  is_read boolean default false
);

alter table public.contact_messages enable row level security;

-- Public can insert messages
create policy "Anyone can insert contact messages" 
  on public.contact_messages for insert 
  with check (true);

-- Admins can view and update messages
create policy "Admins can view messages" 
  on public.contact_messages for select 
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

create policy "Admins can update messages" 
  on public.contact_messages for update 
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

create policy "Admins can delete messages" 
  on public.contact_messages for delete 
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));
