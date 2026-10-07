import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { TemplateContent } from "@/lib/templates";

export type PublicRsvp =
  | { enabled: false }
  | { enabled: true; open: boolean; deadline: string | null; max_people: number | null; allow_phone: boolean; allow_email: boolean };

export type PublicInvitationBranding = {
  brand_name: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  show_vellune_branding: boolean;
  whatsapp_number: string | null;
  contact_email: string | null;
  website_url: string | null;
};

export type PublicInvitation = {
  slug: string; name: string; status: "published" | "closed"; event_date: string; event_time: string;
  venue_name: string | null; address: string | null; city: string | null; state: string | null; message: string | null;
  content: TemplateContent; rsvp?: PublicRsvp; branding?: PublicInvitationBranding | null;
};
export type PublicInvitationResult = { state: "ok"; invitation: PublicInvitation } | { state: "not_found" | "unavailable" };

/**
 * Public lookup by slug. The DB function `get_public_invitation` is only executable by the server
 * and returns safe fields only when status is published/closed — no company/customer/internal ids.
 */
export const getPublicInvitation = createServerFn({ method: "GET" })
  .validator((d) => z.object({ slug: z.string().min(1).max(120) }).parse(d))
  .handler(async ({ data }): Promise<PublicInvitationResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: res, error } = await supabaseAdmin.rpc("get_public_invitation" as never, { _slug: data.slug } as never);
    if (error) { console.error("get_public_invitation", error.message); throw new Error("Falha ao carregar o convite."); }
    const out = res as unknown as PublicInvitationResult;
    // The public SQL function intentionally does not expose company_id.
    // Resolve the tenant internally on the server so custom branding can still be applied.
    if (out.state === "ok") {
      // The public SQL function intentionally does not expose company_id.
      // Resolve the tenant internally on the server so custom branding can still be applied.
      const { data: tenant, error: tenantError } = await supabaseAdmin
        .from("invitations")
        .select("company_id")
        .eq("slug", out.invitation.slug)
        .in("status", ["published", "closed"])
        .maybeSingle();

      if (tenantError) {
        console.error("get_public_invitation tenant", tenantError.message);
      }

      if (tenant?.company_id) {
        const { data: subscription } = await supabaseAdmin
          .from("company_subscriptions")
          .select("plan_id, status, expires_at")
          .eq("company_id", tenant.company_id)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        const subscriptionIsActive =
          subscription &&
          (!subscription.expires_at || new Date(subscription.expires_at).getTime() > Date.now());

        if (subscriptionIsActive) {
          const { data: plan } = await supabaseAdmin
            .from("subscription_plans")
            .select("features")
            .eq("id", subscription.plan_id)
            .eq("status", "active")
            .maybeSingle();

          const features = plan?.features as { custom_branding?: unknown } | null;
          if (features?.custom_branding === true) {
            const { data: branding } = await supabaseAdmin
              .from("company_branding")
              .select("brand_name, logo_url, favicon_url, primary_color, secondary_color, accent_color, show_vellune_branding, whatsapp_number, contact_email, website_url")
              .eq("company_id", tenant.company_id)
              .maybeSingle();

            out.invitation.branding = (branding ?? null) as NonNullable<PublicInvitation["branding"]> | null;
          }
        }
      }
    }
    // Sign every private Storage reference used by the public invitation,
    // including standalone images, gallery images and the background.
    if (out.state === "ok") {
      const blocks = out.invitation.content?.blocks ?? [];
      const refs: Array<{ path: string; apply: (url: string) => void }> = [];

      for (const block of blocks) {
        const imageUrl = block.props?.["url"];
        if (block.type === "image" && typeof imageUrl === "string" && imageUrl.startsWith("storage:")) {
          refs.push({
            path: imageUrl.slice(STORAGE_PREFIX.length),
            apply: (url) => { block.props["url"] = url; },
          });
        }

        if (block.type === "gallery") {
          const rawImages = block.props?.["images"];
          if (typeof rawImages !== "string") continue;
          try {
            const images = JSON.parse(rawImages) as unknown;
            if (!Array.isArray(images)) continue;

            let changed = false;
            for (const item of images) {
              if (!item || typeof item !== "object") continue;
              const record = item as { url?: unknown };
              if (typeof record.url !== "string" || !record.url.startsWith("storage:")) continue;

              const path = record.url.slice(STORAGE_PREFIX.length);
              refs.push({
                path,
                apply: (url) => {
                  record.url = url;
                  changed = true;
                },
              });
            }

            if (changed) {
              block.props["images"] = JSON.stringify(images);
            }
          } catch {
            // Ignore malformed optional gallery JSON; the renderer will show the gallery as unavailable.
          }
        }
      }

      const bg = out.invitation.content?.settings?.background;
      const bgPath = typeof bg?.image === "string" && bg.image.startsWith(STORAGE_PREFIX)
        ? bg.image.slice(STORAGE_PREFIX.length)
        : null;

      if (bgPath) {
        refs.push({
          path: bgPath,
          apply: (url) => { if (bg) bg.image = url; },
        });
      }

      const paths = [...new Set(refs.map((ref) => ref.path))]
        .filter((p) => /^(companies|official)\/[\\w\-/.]+$/.test(p) && !p.includes(".."));

      if (paths.length) {
        const { data: signed } = await supabaseAdmin
          .storage
          .from("invitation-assets")
          .createSignedUrls(paths, 60 * 60 * 24);

        const map = new Map(
          (signed ?? [])
            .filter((item) => item.signedUrl)
            .map((item) => [item.path, item.signedUrl]),
        );

        for (const ref of refs) {
          const signedUrl = map.get(ref.path);
          if (signedUrl) ref.apply(signedUrl);
          else if (ref.path.startsWith("companies/")) ref.apply("");
        }
      }
    }
    return out;
  });

/** Counts one public view. The DB function only inserts for published/closed invitations; no visitor data stored. */
export const recordInvitationView = createServerFn({ method: "POST" })
  .validator((d) => z.object({ slug: z.string().min(1).max(120) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("record_invitation_view" as never, { _slug: data.slug } as never);
    if (error) console.error("record_invitation_view", error.message);
    return { ok: !error };
  });

export type SubmitRsvpResult =
  | { state: "ok"; status: "confirmed" | "declined"; name: string; people: number; updated: boolean }
  | { state: "duplicate" | "closed" | "unavailable" }
  | { state: "invalid"; field: "name" | "people" | "phone" | "email" | "status" };

/**
 * Public RSVP submission. All rules (published, enabled, deadline, closed, max_people, duplicates)
 * are enforced inside the DB function `submit_rsvp`, executable only by the server. Never returns other guests.
 */
export const submitRsvp = createServerFn({ method: "POST" })
  .validator((d) => z.object({
    slug: z.string().min(1).max(120),
    status: z.enum(["confirmed", "declined"]),
    name: z.string().max(120),
    people: z.number().int().min(0).max(1000).nullable(),
    phone: z.string().max(30).optional().default(""),
    email: z.string().max(200).optional().default(""),
    update: z.boolean().optional().default(false),
  }).parse(d))
  .handler(async ({ data }): Promise<SubmitRsvpResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: res, error } = await supabaseAdmin.rpc("submit_rsvp" as never, {
      _slug: data.slug, _status: data.status, _name: data.name, _people: data.people, _phone: data.phone, _email: data.email, _update: data.update,
    } as never);
    if (error) { console.error("submit_rsvp", error.message); throw new Error("Não foi possível enviar sua resposta."); }
    return res as unknown as SubmitRsvpResult;
  });
