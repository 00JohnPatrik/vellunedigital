-- Commercial authentication hardening: server-side fixed-window rate limiting.
create table if not exists public.auth_rate_limits (
  rate_key text primary key,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0,
  updated_at timestamptz not null default now()
);

revoke all on table public.auth_rate_limits from public;
revoke all on table public.auth_rate_limits from anon;
revoke all on table public.auth_rate_limits from authenticated;
grant all on table public.auth_rate_limits to service_role;

create or replace function public.consume_auth_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if p_key is null or length(trim(p_key)) = 0 or p_limit < 1 or p_window_seconds < 1 then
    return false;
  end if;

  insert into public.auth_rate_limits (rate_key, window_started_at, request_count, updated_at)
  values (p_key, now(), 1, now())
  on conflict (rate_key) do update
    set request_count = case
      when public.auth_rate_limits.window_started_at <= now() - make_interval(secs => p_window_seconds)
        then 1
      else public.auth_rate_limits.request_count + 1
    end,
    window_started_at = case
      when public.auth_rate_limits.window_started_at <= now() - make_interval(secs => p_window_seconds)
        then now()
      else public.auth_rate_limits.window_started_at
    end,
    updated_at = now();

  select request_count
    into v_count
    from public.auth_rate_limits
   where rate_key = p_key;

  return v_count <= p_limit;
end;
$$;

revoke all on function public.consume_auth_rate_limit(text, integer, integer) from public;
revoke all on function public.consume_auth_rate_limit(text, integer, integer) from anon;
revoke all on function public.consume_auth_rate_limit(text, integer, integer) from authenticated;
grant execute on function public.consume_auth_rate_limit(text, integer, integer) to service_role;

create index if not exists auth_rate_limits_updated_at_idx
  on public.auth_rate_limits (updated_at);
