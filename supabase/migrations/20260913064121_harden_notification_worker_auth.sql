create or replace function public.verify_live_notification_cron_secret(p_secret text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from vault.decrypted_secrets
    where name = 'karanta_notification_cron_secret'
      and btrim(decrypted_secret) = btrim(p_secret)
      and nullif(btrim(decrypted_secret), '') is not null
  );
$$;

revoke all on function public.verify_live_notification_cron_secret(text) from public;
revoke all on function public.verify_live_notification_cron_secret(text) from anon;
revoke all on function public.verify_live_notification_cron_secret(text) from authenticated;
grant execute on function public.verify_live_notification_cron_secret(text) to service_role;

do $migration$
declare
  function_definition text;
  old_clause constant text := 'on conflict (live_session_id,recipient_email,kind,revision) do nothing';
  formatted_old_clause constant text := 'on conflict (live_session_id, recipient_email, kind, revision) do nothing';
  new_clause constant text := 'on conflict on constraint live_session_email_deliveries_live_session_id_recipient_ema_key do nothing';
begin
  select pg_get_functiondef(
    'public.claim_due_live_email_notifications(integer)'::regprocedure
  )
  into function_definition;

  if position(old_clause in function_definition) > 0 then
    function_definition := replace(function_definition, old_clause, new_clause);
  elsif position(formatted_old_clause in function_definition) > 0 then
    function_definition := replace(function_definition, formatted_old_clause, new_clause);
  else
    raise exception 'Expected notification conflict clause was not found.';
  end if;

  execute function_definition;
end
$migration$;

revoke all on function public.claim_due_live_email_notifications(integer) from public;
revoke all on function public.claim_due_live_email_notifications(integer) from anon;
revoke all on function public.claim_due_live_email_notifications(integer) from authenticated;
grant execute on function public.claim_due_live_email_notifications(integer) to service_role;

comment on function public.verify_live_notification_cron_secret(text) is
  'Validates the notification worker secret against the single encrypted Vault source. Executable only by service_role.';
