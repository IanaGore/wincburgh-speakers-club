-- Resend retries webhook deliveries. Persist its immutable email ID on every
-- inbound message so retries are acknowledged without duplicating content.

alter table public.enquiry_messages
  add column if not exists resend_email_id text;

alter table public.communication_replies
  add column if not exists resend_email_id text;

alter table public.correspondence_messages
  add column if not exists resend_email_id text;

create unique index if not exists enquiry_messages_resend_email_id_idx
  on public.enquiry_messages (resend_email_id)
  where resend_email_id is not null;

create unique index if not exists communication_replies_resend_email_id_idx
  on public.communication_replies (resend_email_id)
  where resend_email_id is not null;

create unique index if not exists correspondence_messages_resend_email_id_idx
  on public.correspondence_messages (resend_email_id)
  where resend_email_id is not null;

-- Forward repair for databases where 20260617120000 has already run.
grant select, insert, update, delete on public.enquiry_messages to authenticated;
