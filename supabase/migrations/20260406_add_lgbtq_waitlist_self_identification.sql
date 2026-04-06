begin;

alter table public.rh_lgbtq_waitlist_submissions
  add column if not exists self_identification text,
  add column if not exists self_identification_recorded_at timestamptz;

commit;
