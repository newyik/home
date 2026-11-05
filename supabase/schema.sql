-- ============================================================
-- 一起买 · Supabase 数据库初始化脚本
-- 在 Supabase Dashboard → SQL Editor 里整段粘贴并运行即可。
-- 重复运行也是安全的（表、函数、策略、触发器都会重建）。
-- ============================================================

-- ---------- 表 ----------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '我' check (char_length(display_name) between 1 and 24),
  avatar_color text not null default '#d9613d',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null default '我们的小家' check (char_length(name) between 1 and 40),
  invite_code text not null unique check (invite_code ~ '^[A-Z0-9]{6}$'),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.household_members (
  household_id uuid not null references public.households (id) on delete cascade,
  -- 直接指向 profiles，PostgREST 才能用 profiles!inner 嵌套查询成员资料。
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id),
  -- 这个版本里一个人只属于一个小家，逻辑更简单。
  unique (user_id)
);

create index if not exists household_members_household_idx
  on public.household_members (household_id);

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  quantity text not null default '1' check (char_length(quantity) between 1 and 20),
  note text check (note is null or char_length(note) <= 200),
  category text not null default 'other'
    check (category in ('food', 'daily', 'clean', 'medicine', 'other')),
  done boolean not null default false,
  created_by uuid references auth.users (id) on delete set null,
  created_by_name text not null default '有人',
  completed_by_name text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists items_household_idx
  on public.items (household_id, done, created_at desc);

create table if not exists public.roadtrip_places (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  name_ja text not null default '' check (char_length(name_ja) <= 60),
  prefecture_code text not null check (prefecture_code ~ '^[0-9]{2}$'),
  prefecture_name text not null check (char_length(prefecture_name) between 1 and 20),
  region text not null check (char_length(region) between 1 and 10),
  lat double precision not null check (lat between 24 and 46),
  lng double precision not null check (lng between 122 and 146),
  category text not null default 'other'
    check (category in ('nature', 'onsen', 'city', 'food', 'shrine', 'park', 'other')),
  status text not null default 'planned'
    check (status in ('planned', 'visited')),
  visited_on date,
  note text not null default '' check (char_length(note) <= 500),
  rating smallint check (rating between 1 and 5),
  created_by uuid references auth.users (id) on delete set null,
  created_by_name text not null default '有人',
  visited_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists roadtrip_places_household_idx
  on public.roadtrip_places (household_id, status, created_at desc);

-- ---------- 通用 updated_at ----------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists households_set_updated_at on public.households;
create trigger households_set_updated_at
  before update on public.households
  for each row execute function public.set_updated_at();

-- ---------- 新用户自动建 profile ----------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_color text;
begin
  v_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    '我'
  );
  v_color := (array['#d9613d', '#5b84d7', '#58977a', '#c96b84', '#8d7aa8', '#b58538'])[
    floor(random() * 6)::int + 1
  ];

  insert into public.profiles (id, display_name, avatar_color)
  values (new.id, left(v_name, 24), v_color)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- 成员判断（RLS 和 RPC 共用） ----------

create or replace function public.is_household_member(target_household uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members
    where household_id = target_household
      and user_id = auth.uid()
  );
$$;

-- ---------- 邀请码与创建 / 加入小家 ----------

create or replace function public.generate_invite_code()
returns text
language plpgsql
volatile
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i integer;
begin
  for i in 1..6 loop
    result := result || substr(alphabet, floor(random() * length(alphabet))::int + 1, 1);
  end loop;
  return result;
end;
$$;

create or replace function public.create_household(p_name text, p_display_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_id uuid;
  v_attempt integer := 0;
  v_name text;
  v_display text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if exists (select 1 from public.household_members where user_id = auth.uid()) then
    raise exception 'already_in_household';
  end if;

  v_name := left(coalesce(nullif(trim(p_name), ''), '我们的小家'), 40);
  v_display := left(
    coalesce(
      nullif(trim(p_display_name), ''),
      (select display_name from public.profiles where id = auth.uid()),
      '我'
    ),
    24
  );

  loop
    v_attempt := v_attempt + 1;
    v_code := public.generate_invite_code();
    exit when not exists (select 1 from public.households where invite_code = v_code);
    if v_attempt >= 20 then
      raise exception 'code_generation_failed';
    end if;
  end loop;

  insert into public.profiles (id, display_name)
  values (auth.uid(), v_display)
  on conflict (id) do nothing;

  insert into public.households (name, invite_code, created_by)
  values (v_name, v_code, auth.uid())
  returning id into v_id;

  insert into public.household_members (household_id, user_id, role)
  values (v_id, auth.uid(), 'owner');

  update public.profiles
  set display_name = v_display
  where id = auth.uid();

  return v_id;
end;
$$;

create or replace function public.join_household(p_code text, p_display_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_household uuid;
  v_existing uuid;
  v_display text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  v_code := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  if char_length(v_code) <> 6 then
    raise exception 'invalid_code';
  end if;

  select household_id into v_existing
  from public.household_members
  where user_id = auth.uid();

  if v_existing is not null then
    if exists (
      select 1 from public.households
      where id = v_existing and invite_code = v_code
    ) then
      return v_existing;
    end if;
    raise exception 'already_in_household';
  end if;

  select id into v_household
  from public.households
  where invite_code = v_code;

  if v_household is null then
    raise exception 'invalid_code';
  end if;

  v_display := left(
    coalesce(
      nullif(trim(p_display_name), ''),
      (select display_name from public.profiles where id = auth.uid()),
      '我'
    ),
    24
  );

  insert into public.profiles (id, display_name)
  values (auth.uid(), v_display)
  on conflict (id) do nothing;

  insert into public.household_members (household_id, user_id, role)
  values (v_household, auth.uid(), 'member');

  update public.profiles
  set display_name = v_display
  where id = auth.uid();

  return v_household;
end;
$$;

-- ---------- 物品作者 / 完成信息 ----------

create or replace function public.handle_item_author()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  select coalesce(display_name, '有人') into v_name
  from public.profiles
  where id = auth.uid();

  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    new.created_by_name := coalesce(v_name, '有人');
    new.created_at := now();
    new.updated_at := now();

    if new.done then
      new.completed_at := now();
      new.completed_by_name := coalesce(v_name, '有人');
    else
      new.completed_at := null;
      new.completed_by_name := null;
    end if;
  else
    new.created_by := old.created_by;
    new.created_by_name := old.created_by_name;
    new.created_at := old.created_at;
    new.updated_at := now();

    if new.done and not old.done then
      new.completed_at := now();
      new.completed_by_name := coalesce(v_name, '有人');
    elsif not new.done then
      new.completed_at := null;
      new.completed_by_name := null;
    else
      new.completed_at := old.completed_at;
      new.completed_by_name := old.completed_by_name;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists items_set_author on public.items;
create trigger items_set_author
  before insert or update on public.items
  for each row execute function public.handle_item_author();

-- ---------- 自驾地点作者 / 打卡信息 ----------

create or replace function public.handle_place_author()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
begin
  select coalesce(display_name, '有人') into v_name
  from public.profiles
  where id = auth.uid();

  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    new.created_by_name := coalesce(v_name, '有人');
    new.created_at := now();
    new.updated_at := now();

    if new.status = 'visited' then
      new.visited_on := coalesce(new.visited_on, current_date);
      new.visited_by_name := coalesce(v_name, '有人');
    else
      new.visited_on := null;
      new.visited_by_name := null;
      new.rating := null;
    end if;
  else
    new.created_by := old.created_by;
    new.created_by_name := old.created_by_name;
    new.created_at := old.created_at;
    new.updated_at := now();

    if new.status = 'visited' then
      if old.status <> 'visited' then
        new.visited_by_name := coalesce(v_name, '有人');
        new.visited_on := coalesce(new.visited_on, current_date);
      else
        new.visited_by_name := coalesce(old.visited_by_name, v_name, '有人');
        new.visited_on := coalesce(new.visited_on, old.visited_on, current_date);
      end if;
    else
      new.visited_on := null;
      new.visited_by_name := null;
      new.rating := null;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists roadtrip_places_set_author on public.roadtrip_places;
create trigger roadtrip_places_set_author
  before insert or update on public.roadtrip_places
  for each row execute function public.handle_place_author();

-- ---------- 行级安全 ----------

alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.items enable row level security;
alter table public.roadtrip_places enable row level security;

-- profiles
drop policy if exists "profiles_select_self_or_housemate" on public.profiles;
create policy "profiles_select_self_or_housemate"
  on public.profiles for select
  to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1
      from public.household_members me
      join public.household_members other
        on other.household_id = me.household_id
      where me.user_id = auth.uid()
        and other.user_id = profiles.id
    )
  );

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

-- households
drop policy if exists "households_select_members" on public.households;
create policy "households_select_members"
  on public.households for select
  to authenticated
  using (public.is_household_member(id));

drop policy if exists "households_update_members" on public.households;
create policy "households_update_members"
  on public.households for update
  to authenticated
  using (public.is_household_member(id))
  with check (public.is_household_member(id));

-- household_members（只能通过 RPC 写入）
drop policy if exists "household_members_select_members" on public.household_members;
create policy "household_members_select_members"
  on public.household_members for select
  to authenticated
  using (public.is_household_member(household_id));

-- items
drop policy if exists "items_select_members" on public.items;
create policy "items_select_members"
  on public.items for select
  to authenticated
  using (public.is_household_member(household_id));

drop policy if exists "items_insert_members" on public.items;
create policy "items_insert_members"
  on public.items for insert
  to authenticated
  with check (
    public.is_household_member(household_id)
    and created_by = auth.uid()
  );

drop policy if exists "items_update_members" on public.items;
create policy "items_update_members"
  on public.items for update
  to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

drop policy if exists "items_delete_members" on public.items;
create policy "items_delete_members"
  on public.items for delete
  to authenticated
  using (public.is_household_member(household_id));

-- roadtrip_places
drop policy if exists "roadtrip_places_select_members" on public.roadtrip_places;
create policy "roadtrip_places_select_members"
  on public.roadtrip_places for select
  to authenticated
  using (public.is_household_member(household_id));

drop policy if exists "roadtrip_places_insert_members" on public.roadtrip_places;
create policy "roadtrip_places_insert_members"
  on public.roadtrip_places for insert
  to authenticated
  with check (
    public.is_household_member(household_id)
    and created_by = auth.uid()
  );

drop policy if exists "roadtrip_places_update_members" on public.roadtrip_places;
create policy "roadtrip_places_update_members"
  on public.roadtrip_places for update
  to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

drop policy if exists "roadtrip_places_delete_members" on public.roadtrip_places;
create policy "roadtrip_places_delete_members"
  on public.roadtrip_places for delete
  to authenticated
  using (public.is_household_member(household_id));

-- ---------- 权限 ----------

grant usage on schema public to authenticated;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, update on public.households to authenticated;
grant select on public.household_members to authenticated;
grant select, insert, update, delete on public.items to authenticated;
grant select, insert, update, delete on public.roadtrip_places to authenticated;

revoke all on function public.generate_invite_code() from public, anon, authenticated;

revoke all on function public.is_household_member(uuid) from public, anon;
grant execute on function public.is_household_member(uuid) to authenticated;

revoke all on function public.create_household(text, text) from public, anon;
grant execute on function public.create_household(text, text) to authenticated;

revoke all on function public.join_household(text, text) from public, anon;
grant execute on function public.join_household(text, text) to authenticated;

-- ---------- Realtime ----------

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'items'
    ) then
      execute 'alter publication supabase_realtime add table public.items';
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'household_members'
    ) then
      execute 'alter publication supabase_realtime add table public.household_members';
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'profiles'
    ) then
      execute 'alter publication supabase_realtime add table public.profiles';
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'roadtrip_places'
    ) then
      execute 'alter publication supabase_realtime add table public.roadtrip_places';
    end if;
  end if;
end
$$;
