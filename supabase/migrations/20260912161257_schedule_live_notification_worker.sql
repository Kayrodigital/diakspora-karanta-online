create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function private.invoke_live_notification_worker()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  worker_url text;
  cron_secret text;
  request_id bigint;
begin
  select decrypted_secret
  into worker_url
  from vault.decrypted_secrets
  where name = 'karanta_notification_worker_url'
  order by created_at desc
  limit 1;

  select decrypted_secret
  into cron_secret
  from vault.decrypted_secrets
  where name = 'karanta_notification_cron_secret'
  order by created_at desc
  limit 1;

  if nullif(btrim(worker_url), '') is null or nullif(btrim(cron_secret), '') is null then
    return null;
  end if;

  select net.http_post(
    url := worker_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', cron_secret
    ),
    body := jsonb_build_object('triggered_at', now()),
    timeout_milliseconds := 10000
  )
  into request_id;

  return request_id;
end;
$$;

revoke all on function private.invoke_live_notification_worker() from public;
revoke all on function private.invoke_live_notification_worker() from anon;
revoke all on function private.invoke_live_notification_worker() from authenticated;

select cron.schedule(
  'karanta-live-email-notifications',
  '*/5 * * * *',
  'select private.invoke_live_notification_worker()'
);
