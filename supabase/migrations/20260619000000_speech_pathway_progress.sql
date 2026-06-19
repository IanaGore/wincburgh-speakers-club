create table if not exists public.speech_pathway_progress (
  id            uuid primary key default gen_random_uuid(),
  member_id     uuid not null references public.profiles(id) on delete cascade,
  pathway_code  text not null check (pathway_code in ('F1','F2','F3','F4','F5','A1','A2','A3','A4','A5')),
  completed     boolean not null default false,
  completed_at  date,
  speech_title  text,
  unique (member_id, pathway_code)
);

alter table public.speech_pathway_progress enable row level security;

create policy "Members can read own pathway progress"
  on public.speech_pathway_progress for select
  using (auth.uid() = member_id);

create policy "Members can insert own pathway progress"
  on public.speech_pathway_progress for insert
  with check (auth.uid() = member_id);

create policy "Members can update own pathway progress"
  on public.speech_pathway_progress for update
  using (auth.uid() = member_id);

create policy "Admins can read all pathway progress"
  on public.speech_pathway_progress for select
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.is_admin = true
    )
  );

create index if not exists speech_pathway_progress_member_id_idx
  on public.speech_pathway_progress(member_id);

-- Grant PostgREST/supabase-js access (RLS policies control row-level access)
grant select on public.speech_pathway_progress to authenticated;
grant insert, update on public.speech_pathway_progress to authenticated;
