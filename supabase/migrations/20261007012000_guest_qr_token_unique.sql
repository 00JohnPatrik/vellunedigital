-- Defense in depth: every guest QR token must be globally unique.
create unique index if not exists invitation_guests_qr_token_unique_idx
  on public.invitation_guests(qr_token);
