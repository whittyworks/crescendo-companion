-- =============================================================
-- Crescendo Companion - schema, RLS, and policies
-- Run this in Supabase: SQL Editor -> New query -> paste -> Run
-- =============================================================

-- ----- user_access -------------------------------------------
create table if not exists public.user_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  has_companion_access boolean not null default false,
  access_expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.user_access enable row level security;

drop policy if exists "user_access: select own" on public.user_access;
create policy "user_access: select own"
  on public.user_access
  for select
  using (auth.uid() = user_id);

-- ----- conversations -----------------------------------------
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists conversations_user_id_updated_at_idx
  on public.conversations (user_id, updated_at desc);

alter table public.conversations enable row level security;

drop policy if exists "conversations: select own" on public.conversations;
create policy "conversations: select own"
  on public.conversations for select
  using (auth.uid() = user_id);

drop policy if exists "conversations: insert own" on public.conversations;
create policy "conversations: insert own"
  on public.conversations for insert
  with check (auth.uid() = user_id);

drop policy if exists "conversations: update own" on public.conversations;
create policy "conversations: update own"
  on public.conversations for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "conversations: delete own" on public.conversations;
create policy "conversations: delete own"
  on public.conversations for delete
  using (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists conversations_set_updated_at on public.conversations;
create trigger conversations_set_updated_at
  before update on public.conversations
  for each row execute function public.set_updated_at();

-- ----- messages ----------------------------------------------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_id_created_at_idx
  on public.messages (conversation_id, created_at asc);

alter table public.messages enable row level security;

drop policy if exists "messages: select via own conversation" on public.messages;
create policy "messages: select via own conversation"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists "messages: insert via own conversation" on public.messages;
create policy "messages: insert via own conversation"
  on public.messages for insert
  with check (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists "messages: delete via own conversation" on public.messages;
create policy "messages: delete via own conversation"
  on public.messages for delete
  using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and c.user_id = auth.uid()
    )
  );
