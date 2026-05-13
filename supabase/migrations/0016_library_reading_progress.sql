-- supabase/migrations/0016_library_reading_progress.sql

-- Track last page read per book to compute reading progress
alter table library_books
  add column if not exists last_page_read integer;
