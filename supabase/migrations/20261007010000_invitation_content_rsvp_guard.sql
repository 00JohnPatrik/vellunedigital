-- Defense in depth: an invitation may contain at most one RSVP block.
create or replace function public.validate_invitation_content()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
begin
  if (
    select count(*)
    from jsonb_array_elements(coalesce(new.content->'blocks','[]'::jsonb)) as block
    where block->>'type' = 'rsvp'
  ) > 1 then
    raise exception 'O convite pode ter apenas um bloco de confirmação de presença.'
      using errcode = '23514';
  end if;
  return new;
end;
$function$;

drop trigger if exists invitations_content_guard on public.invitations;
create trigger invitations_content_guard
before insert or update of content on public.invitations
for each row execute function public.validate_invitation_content();

revoke execute on function public.validate_invitation_content() from public, anon, authenticated;
