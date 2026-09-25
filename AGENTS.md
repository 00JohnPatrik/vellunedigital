<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Tenant data carries `company_id`; RLS uses `is_super_admin()` / `current_company_id()` security-definer helpers — keeps isolation in the DB, avoids policy recursion.
- Roles live in `public.users.role` (not client-editable: guarded by `guard_user_self_update` trigger) — spec requires the `users` table; trigger prevents privilege escalation.
- Public signup is disabled; accounts are pre-registered and activated via `/first-access` server fn — no open registration.
- Phone login resolves the account server-side (`signInWithPhone`) — never exposes emails to the client.
- Role routing: `_authenticated` gate loads profile; `/admin` layout = super_admin only, `/dashboard` = company_admin with active company.
