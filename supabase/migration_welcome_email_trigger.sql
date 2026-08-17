-- Makes the existing "new user" trigger also call the send-welcome-email Edge
-- Function whenever someone signs up. Run this AFTER you've deployed the
-- send-welcome-email function (see supabase/functions/send-welcome-email).
-- Safe to re-run.

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

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
