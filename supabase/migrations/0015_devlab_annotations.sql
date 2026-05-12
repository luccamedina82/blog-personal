-- DevLab inline AI review annotations
-- Highlights de color sobre rangos de texto en bloques `text` con sugerencias IA.

create table devlab_annotations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  post_id uuid not null references devlab_posts(id) on delete cascade,
  block_id text not null,
  original_text text not null,
  suggestion text not null,
  rationale text,
  kind text not null check (kind in ('grammar','style','clarity','suggestion')),
  status text not null check (status in ('pending','accepted','dismissed')) default 'pending',
  created_at timestamptz default now()
);

create index devlab_annotations_post_idx on devlab_annotations(post_id, status);

alter table devlab_annotations enable row level security;
create policy "owner_all" on devlab_annotations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
