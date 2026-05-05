create table faculty_topic_groups (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid not null references faculty_subjects(id) on delete cascade,
  title text not null,
  order_index integer default 0,
  created_at timestamptz default now()
);

create table faculty_topic_units (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject_id uuid not null references faculty_subjects(id) on delete cascade,
  group_id uuid not null references faculty_topic_groups(id) on delete cascade,
  title text not null,
  order_index integer default 0,
  created_at timestamptz default now()
);

alter table faculty_topics
  add column unit_id uuid references faculty_topic_units(id) on delete set null;

alter table faculty_topic_groups enable row level security;
alter table faculty_topic_units  enable row level security;

create policy "owner_all" on faculty_topic_groups
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "owner_all" on faculty_topic_units
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
