create table public.site_settings (
  id integer primary key default 1,
  hero_title text not null default 'UNCAP YOUR POTENTIAL. MASTER THE ART OF SPEAKING.',
  hero_subtitle text not null default 'Find your voice, build confidence, and become an impactful speaker in our vibrant community.',
  about_text text not null default 'We are a friendly community dedicated to helping you become a better public speaker.',
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Ensure only one row exists
alter table public.site_settings add constraint single_row check (id = 1);

insert into public.site_settings (id) values (1) on conflict do nothing;

alter table public.site_settings enable row level security;
create policy "Settings are viewable by everyone." on site_settings for select using (true);
create policy "Anyone can update settings" on site_settings for update using (auth.uid() is not null);
