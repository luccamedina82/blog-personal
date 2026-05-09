-- 0007_profile_social.sql
alter table profiles
  add column if not exists github_url   text,
  add column if not exists twitter_url  text,
  add column if not exists linkedin_url text;
