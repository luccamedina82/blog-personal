-- Migration 0002: shadowing categories
-- Run in Supabase SQL Editor (already applied 2026-05-04)

create table shadowing_categories (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz default now()
);

alter table shadowing_categories enable row level security;

create policy "owner_all" on shadowing_categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table shadowing_sessions
  add column category_id uuid references shadowing_categories(id) on delete set null;
