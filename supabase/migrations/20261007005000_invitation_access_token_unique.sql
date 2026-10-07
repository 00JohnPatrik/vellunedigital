-- Defense in depth: host dashboard access tokens must be unique.
create unique index if not exists invitations_access_token_unique_idx
  on public.invitations(access_token)
  where access_token is not null;
