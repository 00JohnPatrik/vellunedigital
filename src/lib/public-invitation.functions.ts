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

export type PublicInvitationGuest = {
  name: string;
  people_count: number;
  status: string;
};

export type PublicInvitation = {
  slug: string; name: string; status: "published" | "closed"; event_date: string; event_time: string;
  venue_name: string | null; address: string | null; city: string | null; state: string | null; message: string | null;
  content: TemplateContent; rsvp?: PublicRsvp; branding?: PublicInvitationBranding | null; guest?: PublicInvitationGuest | null;
};
export type PublicInvitationResult = { state: "ok"; invitation: PublicInvitation } | { state: "not_found" | "unavailable" };

/**
 * Public lookup by slug. The DB function `get_public_invitation` is only executable by the server
 * and returns safe fields only when status is published/closed — no company/customer/internal ids.
 */
export const getPublicInvitation = createServerFn({ method: "GET" })
  .validator((d) => z.object({ slug: z.string().min(1).max(120), guestToken: z.string().trim().min(1).max(120).optional() }).parse(d))
  .handler(async ({ data }): Promise<PublicInvitationResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Apply time-based auto-close before resolving the public payload. Without this,
    // an invitation could stay published indefinitely unless the host portal or RSVP
    // endpoint happened to be opened after the event deadline.
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from("invitations")
      .select("id, company_id, template_id, status")
      .eq("slug", data.slug)
      .maybeSingle();

    if (tenantError) {
      console.error("get_public_invitation tenant", tenantError.message);
      throw new Error("Falha ao validar o estado do convite.");
    }

    const { data: res, error } = await supabaseAdmin.rpc("get_public_invitation" as never, { _slug: data.slug } as never);
    if (error) { console.error("get_public_invitation", error.message); throw new Error("Falha ao carregar o convite."); }
    const out = res as unknown as PublicInvitationResult;
    let publicCompanyId: string | null = null;
    let publicInvitationId: string | null = null;
    let publicTemplateId: string | null = null;

    // The public SQL function intentionally does not expose internal tenant identifiers.
    // Resolve identifiers only inside the server boundary for branding and private asset authorization.
    if (out.state === "ok") {
      if (tenant?.company_id && ["published", "closed"].includes(tenant.status)) {
        publicCompanyId = tenant.company_id;
        if (data.guestToken) {
          const { data: guest } = await supabaseAdmin
            .from("invitation_guests")
            .select("name, people_count, status")
            .eq("invitation_id", tenant.id)
            .eq("qr_token", data.guestToken)
            .is("deleted_at", null)
            .maybeSingle();
          out.invitation.guest = guest ? {
            name: guest.name,
            people_count: guest.people_count,
            status: guest.status,
          } : null;
        }
        publicInvitationId = tenant.id;
        publicTemplateId = tenant.template_id;
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
    // Sign private storage assets used by image blocks, galleries and the invitation background.
    // The browser cannot read this private bucket directly on the public invitation page.
    if (out.state === "ok") {
      const blocks = out.invitation.content?.blocks ?? [];
      const imageRefs = blocks.filter(
        (b) => b.type === "image" && typeof b.props?.["url"] === "string" && b.props["url"].startsWith("storage:"),
      );
      const galleryBlocks = blocks.filter(
        (b) => b.type === "gallery" && typeof b.props?.["images"] === "string",
      );
      const bg = out.invitation.content?.settings?.background;
      const bgPath = bg?.image?.startsWith("storage:") ? bg.image.slice(8) : null;

      const galleryEntries: Array<{ block: (typeof blocks)[number]; images: unknown[] }> = [];
      const rawRefs: string[] = [];

      for (const block of imageRefs) {
        rawRefs.push(block.props!["url"]!.slice(8));
      }

      for (const block of galleryBlocks) {
        try {
          const parsed = JSON.parse(block.props!["images"]!);
          if (!Array.isArray(parsed)) continue;
          galleryEntries.push({ block, images: parsed });

          for (const item of parsed) {
            if (
              item &&
              typeof item === "object" &&
              "url" in item &&
              typeof item.url === "string" &&
              item.url.startsWith("storage:")
            ) {
              rawRefs.push(item.url.slice(8));
            }
          }
        } catch {
          // Ignore malformed gallery payloads; the normal renderer already treats them as empty.
        }
      }

      if (bgPath) rawRefs.push(bgPath);

      const allowedInvitationPrefix = publicCompanyId && publicInvitationId
        ? `companies/${publicCompanyId}/invitations/${publicInvitationId}/`
        : null;
      const allowedTemplatePrefix = publicCompanyId && publicTemplateId
        ? `companies/${publicCompanyId}/templates/${publicTemplateId}/`
        : null;

      const paths = [...new Set(rawRefs)].filter((p) => {
        if (!/^(companies|official)\/[\w\-/.]+$/.test(p) || p.includes("..")) return false;
        return (
          p.startsWith("official/templates/") ||
          (!!allowedInvitationPrefix && p.startsWith(allowedInvitationPrefix)) ||
          (!!allowedTemplatePrefix && p.startsWith(allowedTemplatePrefix))
        );
      });

      if (paths.length) {
        const { data: signed } = await supabaseAdmin
          .storage
          .from("invitation-assets")
          .createSignedUrls(paths, 60 * 60 * 24);

        const map = new Map(
          (signed ?? [])
            .filter((s) => s.signedUrl)
            .map((s) => [s.path, s.signedUrl]),
        );

        for (const block of imageRefs) {
          const path = block.props!["url"]!.slice(8);
          block.props!["url"] = map.get(path) ?? "";
        }

        for (const { block, images } of galleryEntries) {
          const nextImages = images.map((item) => {
            if (
              !item ||
              typeof item !== "object" ||
              !("url" in item) ||
              typeof item.url !== "string" ||
              !item.url.startsWith("storage:")
            ) {
              return item;
            }

            const path = item.url.slice(8);
            const signedUrl = map.get(path);
            return signedUrl ? { ...item, url: signedUrl } : { ...item, url: "" };
          });

          block.props!["images"] = JSON.stringify(nextImages);
        }

        if (bg && bgPath) bg.image = map.get(bgPath) ?? "";
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
    // Public RSVP updates are intentionally disabled until a dedicated
    // proof-of-control flow exists. Without that, anyone who knows a
    // guest's phone/email could alter another person's response.
    const { data: res, error } = await supabaseAdmin.rpc("submit_rsvp" as never, {
      _slug: data.slug, _status: data.status, _name: data.name, _people: data.people, _phone: data.phone, _email: data.email, _update: false,
    } as never);
    if (error) { console.error("submit_rsvp", error.message); throw new Error("Não foi possível enviar sua resposta."); }
    return res as unknown as SubmitRsvpResult;
  });
