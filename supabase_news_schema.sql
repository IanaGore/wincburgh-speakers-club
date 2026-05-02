create table public.news_posts (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  content text not null,
  author_id uuid references public.profiles on delete set null,
  published_at timestamp with time zone default timezone('utc'::text, now()) not null,
  is_published boolean default true
);

alter table public.news_posts enable row level security;

-- Public read access
create policy "News posts are viewable by everyone."
  on news_posts for select
  using ( is_published = true );

-- Temporary open edit access (to be locked down to is_admin later)
create policy "Admins can insert news" on news_posts for insert with check (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));
create policy "Admins can update news" on news_posts for update using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));
create policy "Admins can delete news" on news_posts for delete using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));
