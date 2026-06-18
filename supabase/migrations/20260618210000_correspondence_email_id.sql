alter table external_correspondence
  add column if not exists resend_email_id text unique;
