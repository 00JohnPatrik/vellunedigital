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
- Invitations: `invitations_guard` trigger forces company_id, validates customer/template ownership, copies template content inside the DB, generates a stable unique slug and freezes id/company_id/slug/template_id; deletion is logical (status=deleted) — client can never forge tenant data or content links.
- Visual editor: one renderer (`BlockView` in `src/components/block-render.tsx`) for canvas and all previews; `VisualEditor` + `useBlocksHistory` shared by invitations and templates; content validated by `validateContent` before any save — editor and preview can never diverge, and unknown block types are never saved or silently dropped.
- Public invitation page `/convite/$slug` (public SSR route) loads via `getPublicInvitation` server fn → DB fn `get_public_invitation` (EXECUTE only for service_role; returns safe fields only for published/closed) — no anon access to `invitations`, no internal ids exposed.
- Publishing = update status to published; `invitations_guard` enforces minimum data, sets published_at, blocks un-deleting and keeps slug frozen — publication rules can't be bypassed by the client.
- RSVP: `rsvp_configs` (1 per invitation, invitation_id frozen by trigger) and `rsvp_responses` (admins read-only) scoped via `invitation_company()`; guests submit only through `submitRsvp` server fn → DB fn `submit_rsvp` (service_role only) which enforces published/enabled/deadline/closed/max_people/duplicates — no anon table access, counters derived from responses.
- Metrics: `invitation_views` (id, invitation_id, created_at only; read-only RLS per tenant) filled solely by server fn `recordInvitationView` → DB fn `record_invitation_view` (service_role, published/closed only); dashboards/reports use SECURITY INVOKER `invitation_report()` so RLS scopes every total — no stored counters, one query instead of per-invitation calls.
- Storage: private bucket `invitation-assets` (paths `companies/{cid}/invitations|templates/{id}/uuid.ext`, `official/templates/{id}/...`); blocks store `storage:<path>`; editor signs via RLS-scoped client, public page gets server-signed URLs only for images in the published content; `files_guard` derives company_id and enforces path prefix — public buckets are blocked by workspace policy and this keeps the bucket non-listable.
- Trash: companies/users(company_admin only; super_admin blocked by trigger)/customers/templates use `deleted_at`/`deleted_by` (set by `soft_delete_guard` trigger, super admin only; company-admin RLS hides deleted rows; deleted user or company ⇒ `current_company_id()` NULL and app gate treats as inactive); invitations keep `status=deleted` (+deleted_at/by set in `invitations_guard`; restore → draft, super admin only) — one soft-delete path per table, history never destroyed.
- Background lives in `content.settings.background` (built via `buildContent`), rendered by `BackgroundLayers` in both editor canvas and `InvitationCanvas`; public page signs storage bg images server-side — copied with content, so templates/invitations stay independent.
