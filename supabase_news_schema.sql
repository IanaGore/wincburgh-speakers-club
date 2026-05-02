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
create policy "Anyone can insert news" on news_posts for insert with check (auth.uid() is not null);
create policy "Anyone can update news" on news_posts for update using (auth.uid() is not null);
create policy "Anyone can delete news" on news_posts for delete using (auth.uid() is not null);
