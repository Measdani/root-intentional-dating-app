begin;

alter table if exists public.rh_forest_unmatched_queries
  add column if not exists uncertainty_label text,
  add column if not exists uncertainty_reason text,
  add column if not exists uncertainty_confidence integer not null default 0,
  add column if not exists direct_terms text[] not null default '{}'::text[],
  add column if not exists rejected_topics text[] not null default '{}'::text[];

commit;
