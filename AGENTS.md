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
- Super admin CRUD uses the browser client under RLS; only auth-account operations (invite) go through `sendAccessInvite` server fn with an is_super_admin check — keeps service role server-side.
- Customers (`/customers`) is a shared module outside `/admin`/`/dashboard`; `customers_guard` trigger forces `company_id` for company admins and freezes it on update — tenant scoping never trusts the client.
- Templates: `templates` table (official = company_id NULL, company = own company); `templates_guard` trigger forces type/company_id for company admins and freezes id/type/company_id on update; content is JSON `{version:1, blocks:[{id,type,props}]}` with the block catalogue in `src/lib/templates.ts` — ready for the future editor.
- "Usar modelo" goes through the `use_official_template` DB function (deep copy into caller's company, no link to source) — copy can't be forged by the client.
