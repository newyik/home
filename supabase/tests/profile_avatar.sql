-- Administrative verification. Every fixture is rolled back.
begin;
insert into auth.users(id,email) values
 ('5f4dab22-c212-4da5-9b44-b10e2a46f701','avatar-1@example.test'),
 ('5f4dab22-c212-4da5-9b44-b10e2a46f702','avatar-2@example.test');
set local role authenticated;
select set_config('request.jwt.claim.sub','5f4dab22-c212-4da5-9b44-b10e2a46f701',true);
select public.create_household('Avatar test','One');
update public.profiles set avatar='emoji:🐱' where id=auth.uid();
reset role;
select set_config('test.invite',invite_code,true) from public.households
 where created_by='5f4dab22-c212-4da5-9b44-b10e2a46f701';
set local role authenticated;
select set_config('request.jwt.claim.sub','5f4dab22-c212-4da5-9b44-b10e2a46f702',true);
select public.join_household(current_setting('test.invite'),'Two');
do $$
begin
 if not exists(select 1 from public.profiles where id='5f4dab22-c212-4da5-9b44-b10e2a46f701' and avatar='emoji:🐱') then
   raise exception 'Shared avatar read failed';
 end if;
 update public.profiles set avatar='emoji:🐶' where id='5f4dab22-c212-4da5-9b44-b10e2a46f701';
 if found then raise exception 'Partner can overwrite another profile'; end if;
 begin
   update public.profiles set avatar=repeat('x',160001) where id=auth.uid();
   raise exception 'Oversized avatar accepted';
 exception when check_violation then null;
 end;
end $$;
rollback;
select 'PASS: own avatar save, partner avatar read, write isolation and size limit. Fixtures rolled back.' as result;
