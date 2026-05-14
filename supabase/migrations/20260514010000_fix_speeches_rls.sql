-- Fix overly-permissive speeches UPDATE policy.
-- Previously evaluators could update any column (title, member_id, evaluator_id, etc.)
-- Now: members update their own metadata, evaluators update only feedback_notes.

drop policy if exists "members and evaluators update speeches" on speeches;

-- Members may update metadata on their own speeches (but not evaluator_id / member_id)
create policy "members update own speech metadata"
  on speeches for update
  using (auth.uid() = member_id)
  with check (
    auth.uid() = member_id
    and member_id = (select member_id from speeches s2 where s2.id = speeches.id)
    and evaluator_id = (select evaluator_id from speeches s2 where s2.id = speeches.id)
  );

-- Evaluators may update only feedback_notes on speeches assigned to them.
-- The WITH CHECK prevents them from changing ownership or metadata columns.
create policy "evaluators update feedback_notes"
  on speeches for update
  using (auth.uid() = evaluator_id)
  with check (
    auth.uid() = evaluator_id
    and member_id = (select member_id from speeches s2 where s2.id = speeches.id)
    and evaluator_id = (select evaluator_id from speeches s2 where s2.id = speeches.id)
    and title = (select title from speeches s2 where s2.id = speeches.id)
    and pathway is not distinct from (select pathway from speeches s2 where s2.id = speeches.id)
    and project is not distinct from (select project from speeches s2 where s2.id = speeches.id)
  );
