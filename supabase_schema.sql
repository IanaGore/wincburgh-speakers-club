-- 1. Profiles Table (Extends Supabase Auth)
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  full_name text,
  avatar_url text,
  is_admin boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turn on Row Level Security
alter table public.profiles enable row level security;

-- Profiles Policies
create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- Automatically create a profile when a new user signs up
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 2. Meetings Table (Session Planner Foundation)
create table public.meetings (
  id uuid default gen_random_uuid() primary key,
  meeting_date date not null,
  theme text,
  agenda_notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.meetings enable row level security;

create policy "Meetings are viewable by everyone."
  on meetings for select
  using ( true );

-- (Later we will add admin-only policies for inserting/updating meetings)


-- 3. Meeting Assignments Table (Who is doing what role)
create table public.meeting_assignments (
  id uuid default gen_random_uuid() primary key,
  meeting_id uuid references public.meetings on delete cascade not null,
  role_name text not null, -- e.g., 'Toastmaster', 'Speaker 1', 'Evaluator 1', 'Timekeeper'
  member_id uuid references public.profiles on delete set null, -- null means the role is open/unassigned
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (meeting_id, role_name) -- A role can only exist once per meeting
);

alter table public.meeting_assignments enable row level security;

create policy "Assignments are viewable by everyone."
  on meeting_assignments for select
  using ( true );

create policy "Logged in users can volunteer for an open role"
  on meeting_assignments for update
  using ( auth.uid() is not null )
  with check ( member_id = auth.uid() );


-- 4. Speeches Table (Speech Tracker)
create table public.speeches (
  id uuid default gen_random_uuid() primary key,
  member_id uuid references public.profiles on delete cascade not null,
  meeting_id uuid references public.meetings on delete set null,
  title text not null,
  pathway text, -- e.g., 'Dynamic Leadership'
  project text, -- e.g., 'Ice Breaker'
  evaluator_id uuid references public.profiles on delete set null,
  feedback_notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.speeches enable row level security;

create policy "Speeches are viewable by everyone."
  on speeches for select
  using ( true );

create policy "Members can insert their own speeches."
  on speeches for insert
  with check ( auth.uid() = member_id );

create policy "Members can update their own speeches."
  on speeches for update
  using ( auth.uid() = member_id );
