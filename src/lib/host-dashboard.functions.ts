import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type HostDashboardResponse = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  people_count: number;
  status: "confirmed" | "declined";
  created_at: string;
  updated_at: string;
};

export type HostDashboard = {
  portal: {
    expires_at: string | null;
    timezone: string;
  };
  invitation: {
    name: string;
    slug: string;
    status: "published" | "closed";
    event_date: string;
    event_time: string;
    venue_name: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    message: string | null;
    customer_name: string | null;
  };
  metrics: {
    views: number;
    responses: number;
    confirmed: number;
    declined: number;
    people: number;
  };
  responses: HostDashboardResponse[];
};

export type HostDashboardResult =
  | { state: "ok"; dashboard: HostDashboard }
  | { state: "not_found" };

/**
 * Public host dashboard lookup. The access token is the only public identifier.
 * The server reads the token but only returns safe invitation and RSVP fields.
 */
export const getHostDashboard = createServerFn({ method: "GET" })
  .validator((d) =>
    z
      .object({ token: z.string().trim().regex(/^[a-f0-9]{48}$/i) })
      .parse(d),
  )
  .handler(async ({ data }): Promise<HostDashboardResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from("invitations")
      .select(
        "id, name, slug, status, event_date, event_time, venue_name, address, city, state, message, customer:customers(name)",
      )
      .eq("access_token", data.token)
      .is("deleted_at", null)
      .in("status", ["published", "closed"])
      .maybeSingle();

    if (invitationError) {
      console.error("getHostDashboard invitation", invitationError.message);
      throw new Error("Falha ao carregar o painel do anfitrião.");
    }

    if (!invitation) return { state: "not_found" };

    const { data: automationState, error: automationError } = await supabaseAdmin
      .rpc("apply_invitation_automation", { _invitation_id: invitation.id });

    if (automationError) {
      console.error("getHostDashboard automation", automationError.message);
      throw new Error("Falha ao validar o acesso do portal.");
    }

    const automation = (automationState ?? {}) as {
      state?: string;
      client_portal_enabled?: boolean;
      portal_open?: boolean;
      portal_expires_at?: string;
      timezone?: string;
    };

    if (
      automation.state !== "ok" ||
      automation.client_portal_enabled !== true ||
      automation.portal_open !== true
    ) {
      return { state: "not_found" };
    }

    const [viewsResult, responsesResult] = await Promise.all([
      supabaseAdmin
        .from("invitation_views")
        .select("id", { count: "exact", head: true })
        .eq("invitation_id", invitation.id),
      supabaseAdmin
        .from("rsvp_responses")
        .select("id, name, phone, email, people_count, status, created_at, updated_at")
        .eq("invitation_id", invitation.id)
        .order("updated_at", { ascending: false }),
    ]);

    if (viewsResult.error || responsesResult.error) {
      console.error("getHostDashboard metrics", viewsResult.error?.message ?? responsesResult.error?.message);
      throw new Error("Falha ao carregar os dados do painel.");
    }

    const responses = (responsesResult.data ?? []) as HostDashboardResponse[];
    const confirmed = responses.filter((response) => response.status === "confirmed");
    const customer = Array.isArray(invitation.customer) ? invitation.customer[0] : invitation.customer;

    return {
      state: "ok",
      dashboard: {
        portal: {
          expires_at: automation.portal_expires_at ?? null,
          timezone: automation.timezone ?? "America/Sao_Paulo",
        },
        invitation: {
          name: invitation.name,
          slug: invitation.slug,
          status: invitation.status as "published" | "closed",
          event_date: invitation.event_date,
          event_time: invitation.event_time,
          venue_name: invitation.venue_name,
          address: invitation.address,
          city: invitation.city,
          state: invitation.state,
          message: invitation.message,
          customer_name: customer?.name ?? null,
        },
        metrics: {
          views: viewsResult.count ?? 0,
          responses: responses.length,
          confirmed: confirmed.length,
          declined: responses.length - confirmed.length,
          people: confirmed.reduce((total, response) => total + response.people_count, 0),
        },
        responses,
      },
    };
  });
