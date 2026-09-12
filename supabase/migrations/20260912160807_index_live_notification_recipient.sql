create index live_session_email_deliveries_recipient_idx
  on public.live_session_email_deliveries (recipient_user_id)
  where recipient_user_id is not null;
