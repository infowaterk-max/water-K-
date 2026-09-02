-- Shoperation Supabase Auth bootstrap.
-- The schema snapshot intentionally covers public/private only; this file restores
-- the application-owned auth.users -> private.handle_new_user() trigger.

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();
