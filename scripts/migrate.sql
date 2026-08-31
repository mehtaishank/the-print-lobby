-- =============================================================================
-- Campus Print — Supabase schema
-- Run this in Supabase Dashboard → SQL Editor → New query → Run
-- =============================================================================

-- Orders table
create table if not exists orders (
  id            text primary key,
  code          text not null,
  access_token  text not null,
  status        text not null default 'awaiting_options',
  original_name text,
  kind          text,
  converted     boolean default false,
  pages         integer default 0,
  options       jsonb,
  price         jsonb,
  phone         text,
  payment       jsonb,
  history       jsonb default '[]'::jsonb,
  created_at    timestamptz not null default now(),
  paid_at       timestamptz
);

-- Index for the staff dashboard (list by newest first)
create index if not exists orders_created_at_idx on orders (created_at desc);

-- OTPs table (kept for when you add WhatsApp/SMS OTP later)
create table if not exists otps (
  phone         text primary key,
  code_hash     text,
  expires_at    bigint,
  attempts      integer default 0,
  sends         jsonb default '[]'::jsonb
);

-- =============================================================================
-- Storage bucket for uploaded files
-- =============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'print-files',
  'print-files',
  false,
  52428800,  -- 50 MB
  array['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/msword']
)
on conflict (id) do nothing;

-- Only the service role (server) can read/write — customers never access storage directly
create policy "service only" on storage.objects
  for all to authenticated
  using (bucket_id = 'print-files');
