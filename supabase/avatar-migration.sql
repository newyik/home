alter table public.profiles add column if not exists avatar text
  constraint profiles_avatar_size check (avatar is null or octet_length(avatar) <= 160000);
