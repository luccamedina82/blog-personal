alter table devlab_categories alter column user_id set default auth.uid();
alter table devlab_posts     alter column user_id set default auth.uid();
