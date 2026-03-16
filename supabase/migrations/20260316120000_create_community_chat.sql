-- 커뮤니티 채팅 테이블 생성
-- 단일 익명 그룹 채팅방 (닉네임 기반, 텍스트 전용)

create table if not exists public.community_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  nickname text not null,
  joined_at timestamptz not null default timezone('utc'::text, now()),
  left_at timestamptz null,
  constraint community_members_nickname_length check (char_length(nickname) >= 2 and char_length(nickname) <= 20)
);

-- 활성 멤버에 대해서만 user_id 유니크 보장 (퇴장 후 재입장 허용)
create unique index if not exists community_members_active_user_idx
  on public.community_members(user_id) where left_at is null;

-- 활성 멤버에 대해서만 닉네임 유니크 보장
create unique index if not exists community_members_active_nickname_idx
  on public.community_members(nickname) where left_at is null;

create table if not exists public.community_messages (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.community_members(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists community_members_user_id_idx on public.community_members(user_id);
create index if not exists community_members_left_at_idx on public.community_members(left_at);
create index if not exists community_messages_member_id_idx on public.community_messages(member_id);
create index if not exists community_messages_created_at_idx on public.community_messages(created_at desc);

alter table public.community_members enable row level security;
alter table public.community_messages enable row level security;

-- community_members RLS 정책
drop policy if exists "community_members_select_active" on public.community_members;
create policy "community_members_select_active"
on public.community_members
for select
to authenticated
using (left_at is null);

drop policy if exists "community_members_insert_own" on public.community_members;
create policy "community_members_insert_own"
on public.community_members
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "community_members_update_own" on public.community_members;
create policy "community_members_update_own"
on public.community_members
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- community_messages RLS 정책
drop policy if exists "community_messages_select_active_members" on public.community_messages;
create policy "community_messages_select_active_members"
on public.community_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.community_members members
    where members.user_id = auth.uid()
      and members.left_at is null
  )
);

drop policy if exists "community_messages_insert_active_members" on public.community_messages;
create policy "community_messages_insert_active_members"
on public.community_messages
for insert
to authenticated
with check (
  exists (
    select 1
    from public.community_members members
    where members.id = member_id
      and members.user_id = auth.uid()
      and members.left_at is null
  )
);

alter table public.community_members replica identity full;
alter table public.community_messages replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'community_members'
  ) then
    alter publication supabase_realtime add table public.community_members;
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
      and tablename = 'community_messages'
  ) then
    alter publication supabase_realtime add table public.community_messages;
  end if;
end
$$;
