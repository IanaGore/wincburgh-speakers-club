-- Extend contact_messages status to include 'spam'
alter table public.contact_messages
  drop constraint if exists contact_messages_status_check,
  add constraint contact_messages_status_check
    check (status in ('new', 'replied', 'closed', 'spam'));
