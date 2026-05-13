-- supabase/migrations/0017_library_progress_mode.sql

-- Toggle automatic vs manual reading progress tracking per book.
-- Default 'manual' so user keeps full control until they opt-in to auto.
alter table library_books
  add column if not exists progress_mode text not null default 'manual'
    check (progress_mode in ('auto', 'manual'));
