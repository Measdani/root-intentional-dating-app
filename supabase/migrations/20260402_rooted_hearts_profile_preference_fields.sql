alter table public.users
  add column if not exists financial_mindset text;

alter table public.users
  add column if not exists lifestyle_alignment text;
