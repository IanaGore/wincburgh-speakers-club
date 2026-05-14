create table if not exists speeches (
  id           uuid primary key default gen_random_uuid(),
  member_id    uuid not null references profiles(id) on delete cascade,
  evaluator_id uuid references profiles(id) on delete set null,
  meeting_id   uuid references meetings(id) on delete set null,
  title        text not null,
  pathway      text,
  project      text,
  feedback_notes text,
  created_at   timestamptz not null default now()
);

-- Indexes
create index if not exists speeches_member_id_idx    on speeches(member_id);
create index if not exists speeches_evaluator_id_idx on speeches(evaluator_id);
create index if not exists speeches_meeting_id_idx   on speeches(meeting_id);

-- RLS
alter table speeches enable row level security;

-- Members can see their own speeches and speeches they are evaluating
create policy "members read own speeches"
  on speeches for select
  using (auth.uid() = member_id or auth.uid() = evaluator_id);

-- Members can insert their own speeches
create policy "members insert own speeches"
  on speeches for insert
  with check (auth.uid() = member_id);

-- Members can delete their own speeches
create policy "members delete own speeches"
  on speeches for delete
  using (auth.uid() = member_id);

-- Evaluators can update feedback_notes on speeches assigned to them;
-- members can update their own speech metadata
create policy "members and evaluators update speeches"
  on speeches for update
  using (auth.uid() = member_id or auth.uid() = evaluator_id);

-- Admins can read all speeches
create policy "admins read all speeches"
  on speeches for select
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
        and profiles.is_admin = true
    )
  );
