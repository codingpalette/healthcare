create table if not exists public.chat_rooms (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete cascade,
  trainer_id uuid not null references public.profiles(id) on delete cascade,
  member_last_read_at timestamptz null,
  trainer_last_read_at timestamptz null,
  last_message_at timestamptz null,
  last_message_preview text null,
  last_message_type text null check (last_message_type in ('text', 'feedback', 'meal_share', 'workout_share')),
  last_message_sender_id uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  unique (member_id, trainer_id)
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.chat_rooms(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  message_type text not null default 'text' check (message_type in ('text', 'feedback', 'meal_share', 'workout_share')),
  content text null,
  attachment_payload jsonb null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists chat_rooms_member_id_idx on public.chat_rooms(member_id);
create index if not exists chat_rooms_trainer_id_idx on public.chat_rooms(trainer_id);
create index if not exists chat_rooms_last_message_at_idx on public.chat_rooms(last_message_at desc);
create index if not exists chat_messages_room_id_created_at_idx on public.chat_messages(room_id, created_at asc);
create index if not exists chat_messages_sender_id_idx on public.chat_messages(sender_id);

create or replace function public.set_chat_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists set_chat_rooms_updated_at on public.chat_rooms;
create trigger set_chat_rooms_updated_at
before update on public.chat_rooms
for each row
execute function public.set_chat_updated_at();

drop trigger if exists set_chat_messages_updated_at on public.chat_messages;
create trigger set_chat_messages_updated_at
before update on public.chat_messages
for each row
execute function public.set_chat_updated_at();

alter table public.chat_rooms enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists "chat_rooms_select_participants" on public.chat_rooms;
create policy "chat_rooms_select_participants"
on public.chat_rooms
for select
to authenticated
using (auth.uid() = member_id or auth.uid() = trainer_id);

drop policy if exists "chat_rooms_insert_participants" on public.chat_rooms;
create policy "chat_rooms_insert_participants"
on public.chat_rooms
for insert
to authenticated
with check (auth.uid() = member_id or auth.uid() = trainer_id);

drop policy if exists "chat_rooms_update_participants" on public.chat_rooms;
create policy "chat_rooms_update_participants"
on public.chat_rooms
for update
to authenticated
using (auth.uid() = member_id or auth.uid() = trainer_id)
with check (auth.uid() = member_id or auth.uid() = trainer_id);

drop policy if exists "chat_messages_select_participants" on public.chat_messages;
create policy "chat_messages_select_participants"
on public.chat_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.chat_rooms rooms
    where rooms.id = room_id
      and (rooms.member_id = auth.uid() or rooms.trainer_id = auth.uid())
  )
);

drop policy if exists "chat_messages_insert_sender" on public.chat_messages;
create policy "chat_messages_insert_sender"
on public.chat_messages
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and exists (
    select 1
    from public.chat_rooms rooms
    where rooms.id = room_id
      and (rooms.member_id = auth.uid() or rooms.trainer_id = auth.uid())
  )
);

drop policy if exists "chat_messages_update_sender" on public.chat_messages;
create policy "chat_messages_update_sender"
on public.chat_messages
for update
to authenticated
using (
  sender_id = auth.uid()
  and exists (
    select 1
    from public.chat_rooms rooms
    where rooms.id = room_id
      and (rooms.member_id = auth.uid() or rooms.trainer_id = auth.uid())
  )
)
with check (
  sender_id = auth.uid()
  and exists (
    select 1
    from public.chat_rooms rooms
    where rooms.id = room_id
      and (rooms.member_id = auth.uid() or rooms.trainer_id = auth.uid())
  )
);

drop policy if exists "chat_messages_delete_sender" on public.chat_messages;
create policy "chat_messages_delete_sender"
on public.chat_messages
for delete
to authenticated
using (
  sender_id = auth.uid()
  and exists (
    select 1
    from public.chat_rooms rooms
    where rooms.id = room_id
      and (rooms.member_id = auth.uid() or rooms.trainer_id = auth.uid())
  )
);

alter table public.chat_rooms replica identity full;
alter table public.chat_messages replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'chat_rooms'
  ) then
    alter publication supabase_realtime add table public.chat_rooms;
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'chat_messages'
  ) then
    alter publication supabase_realtime add table public.chat_messages;
  end if;
end
$$;
