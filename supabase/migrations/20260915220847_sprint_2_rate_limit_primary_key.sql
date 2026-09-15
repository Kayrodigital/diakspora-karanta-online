alter table private.enrollment_request_limits
  add column id bigint generated always as identity primary key;
