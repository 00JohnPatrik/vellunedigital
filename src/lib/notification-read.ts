import { supabase } from "@/integrations/supabase/client";

export type NotificationGroupType = "company" | "customer";

export type NotificationReadMarker = {
  id: string;
  user_id: string;
  group_type: NotificationGroupType;
  group_id: string;
  last_read_at: string;
};

export const notificationReadMarkersKey = (userId: string) =>
  ["notification-read-markers", userId] as const;

export async function listNotificationReadMarkers(userId: string): Promise<NotificationReadMarker[]> {
  const { data, error } = await supabase
    .from("notification_read_markers")
    .select("id, user_id, group_type, group_id, last_read_at")
    .eq("user_id", userId);

  if (error) throw error;
  return (data ?? []) as NotificationReadMarker[];
}

export async function markNotificationGroupRead(
  userId: string,
  groupType: NotificationGroupType,
  groupId: string,
  readAt = new Date().toISOString(),
) {
  const { data, error } = await supabase
    .from("notification_read_markers")
    .upsert(
      {
        user_id: userId,
        group_type: groupType,
        group_id: groupId,
        last_read_at: readAt,
      },
      { onConflict: "user_id,group_type,group_id" },
    )
    .select("id, user_id, group_type, group_id, last_read_at")
    .single();

  if (error) throw error;
  return data as NotificationReadMarker;
}
