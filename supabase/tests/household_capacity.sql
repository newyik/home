-- Run with an administrative connection. All fixtures are rolled back.
begin;
insert into auth.users(id, email) values
 ('780403ee-5c7c-40c3-8221-cc3bd20ad101', 'capacity-1@example.test'),
 ('780403ee-5c7c-40c3-8221-cc3bd20ad102', 'capacity-2@example.test'),
 ('780403ee-5c7c-40c3-8221-cc3bd20ad103', 'capacity-3@example.test');
set local role authenticated;
select set_config('request.jwt.claim.sub','780403ee-5c7c-40c3-8221-cc3bd20ad101',true);
select public.create_household('Capacity test','One');
select set_config('request.jwt.claim.sub','780403ee-5c7c-40c3-8221-cc3bd20ad102',true);
-- Only the owner can read the invite, so preserve it through a transaction-local setting.
reset role;
select set_config('test.invite',invite_code,true) from public.households
 where created_by='780403ee-5c7c-40c3-8221-cc3bd20ad101';
set local role authenticated;
select public.join_household(current_setting('test.invite'),'Two');
select public.join_household(current_setting('test.invite'),'Two');
-- Member one adds an item and a map pin.
select set_config('request.jwt.claim.sub','780403ee-5c7c-40c3-8221-cc3bd20ad101',true);
insert into public.items(household_id,name)
 select household_id,'Test item' from public.household_members where user_id=auth.uid();
insert into public.roadtrip_places(household_id,name,prefecture_code,prefecture_name,region,lat,lng)
 select household_id,'Test pin','13','Tokyo','Kanto',35.68,139.76
 from public.household_members where user_id=auth.uid();
-- Member two can read and update both shared resources.
select set_config('request.jwt.claim.sub','780403ee-5c7c-40c3-8221-cc3bd20ad102',true);
do $$
begin
 if (select count(*) from public.items) <> 1 or (select count(*) from public.roadtrip_places) <> 1 then
   raise exception 'Shared reads failed';
 end if;
end $$;
update public.items set done=true;
update public.roadtrip_places set status='visited';
do $$
begin
 if not exists(select 1 from public.items where done and completed_by_name='Two') then
   raise exception 'Shared item update failed';
 end if;
 if not exists(select 1 from public.roadtrip_places where status='visited' and visited_by_name='Two') then
   raise exception 'Shared pin update failed';
 end if;
end $$;
select set_config('request.jwt.claim.sub','780403ee-5c7c-40c3-8221-cc3bd20ad103',true);
do $$
begin
  begin
    perform public.join_household(current_setting('test.invite'),'Three');
    raise exception 'Third membership was incorrectly allowed';
  exception when raise_exception then
    if sqlerrm <> 'household_full' then raise; end if;
  end;
  if exists (select 1 from public.households) or exists(select 1 from public.items) or exists(select 1 from public.roadtrip_places) then
    raise exception 'Nonmember can see household';
  end if;
end $$;
reset role;
do $$
begin
 if (select count(*) from public.household_members where household_id =
 (select id from public.households where created_by='780403ee-5c7c-40c3-8221-cc3bd20ad101')) <> 2 then
   raise exception 'Expected exactly two members';
 end if;
end $$;
rollback;
select 'PASS: two members share and update items and pins, third member rejected and isolated; fixtures rolled back.' as result;
