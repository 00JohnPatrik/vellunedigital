import { supabase as typedSupabase } from "@/integrations/supabase/client";
import { isDemoMode } from "@/lib/demo-mode";

// The automation table is intentionally newer than the generated Supabase types.
const supabase = typedSupabase as any;

export type InvitationAutomationSettings = {
  invitation_id: string;
  auto_close_enabled: boolean;
  auto_close_after_hours: 6 | 12 | 24;
  client_portal_enabled: boolean;
  client_portal_hours_after_event: 6 | 12 | 24 | 48;
  timezone: string;
  created_at: string;
  updated_at: string;
};

export type InvitationAutomationState = {
  state: "ok" | "not_found";
  status?: string;
  event_at?: string;
  auto_close_enabled?: boolean;
  auto_close_after_hours?: number;
  auto_close_at?: string;
  auto_close_due?: boolean;
  client_portal_enabled?: boolean;
  client_portal_hours_after_event?: number;
  portal_expires_at?: string;
  portal_open?: boolean;
  timezone?: string;
};

export const defaultInvitationAutomation = (invitationId: string): InvitationAutomationSettings => ({
  invitation_id: invitationId,
  auto_close_enabled: true,
  auto_close_after_hours: 12,
  client_portal_enabled: true,
  client_portal_hours_after_event: 24,
  timezone: "America/Sao_Paulo",
  created_at: new Date(0).toISOString(),
  updated_at: new Date(0).toISOString(),
});

export const invitationAutomationKey = (invitationId: string) => ["invitation-automation", invitationId] as const;

export async function getInvitationAutomation(invitationId: string): Promise<{
  settings: InvitationAutomationSettings;
  state: InvitationAutomationState;
}> {
  if (isDemoMode()) {
    const settings = defaultInvitationAutomation(invitationId);
    return { settings, state: { state: "ok", ...settings, portal_open: true, auto_close_due: false } };
  }

  const [{ data, error }, { data: state, error: stateError }] = await Promise.all([
    supabase.from("invitation_automation_settings").select("*").eq("invitation_id", invitationId).maybeSingle(),
    supabase.rpc("invitation_automation_state", { _invitation_id: invitationId }),
  ]);

  if (error) throw error;
  if (stateError) throw stateError;

  return {
    settings: (data as InvitationAutomationSettings | null) ?? defaultInvitationAutomation(invitationId),
    state: (state ?? { state: "not_found" }) as InvitationAutomationState,
  };
}

export async function saveInvitationAutomation(
  invitationId: string,
  values: Pick<
    InvitationAutomationSettings,
    "auto_close_enabled" | "auto_close_after_hours" | "client_portal_enabled" | "client_portal_hours_after_event"
  >,
) {
  if (isDemoMode()) return;

  const { error } = await supabase
    .from("invitation_automation_settings")
    .upsert(
      {
        invitation_id: invitationId,
        auto_close_enabled: values.auto_close_enabled,
        auto_close_after_hours: values.auto_close_after_hours,
        client_portal_enabled: values.client_portal_enabled,
        client_portal_hours_after_event: values.client_portal_hours_after_event,
        timezone: "America/Sao_Paulo",
      },
      { onConflict: "invitation_id" },
    );

  if (error) throw error;
}

export function formatAutomationDate(value: string | null | undefined, timezone = "America/Sao_Paulo") {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: timezone,
    }).format(new Date(value));
  } catch {
    return new Date(value).toLocaleString("pt-BR", { dateStyle: "medium", timeStyle: "short" });
  }
}
