-- Makes the existing "new user" trigger also call send-welcome-email AND
-- send-getting-started-email whenever someone signs up, so every new account gets both
-- onboarding emails automatically — not just you, manually, one at a time. Run this
-- AFTER you've deployed both functions (supabase/functions/send-welcome-email,
-- supabase/functions/send-getting-started-email). Safe to re-run.
--
-- NOTE: this REPLACES an earlier version of this same migration that only called
-- send-welcome-email — confirmed via a direct query against the live database that the
-- earlier version was actually never run (the live trigger function still only inserted
-- the profile row), so re-running this is what turns automatic welcome/getting-started
-- emails on for the first time, not just adding the second one.

create extension if not exists pg_net;

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;

  perform net.http_post(
    url := 'https://qxxamolmtdrwimosclur.supabase.co/functions/v1/send-welcome-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer sb_publishable_1TP5xUtpjVuZC8_WXS0irQ_2X5TKiIh'
    ),
    body := jsonb_build_object('email', new.email)
  );

  perform net.http_post(
    url := 'https://qxxamolmtdrwimosclur.supabase.co/functions/v1/send-getting-started-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer sb_publishable_1TP5xUtpjVuZC8_WXS0irQ_2X5TKiIh'
    ),
    body := jsonb_build_object('email', new.email)
  );

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
