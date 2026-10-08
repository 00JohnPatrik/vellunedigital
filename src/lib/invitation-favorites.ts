import { supabase } from "@/integrations/supabase/client";

export const invitationFavoritesKey = (userId: string) => ["invitation-favorites", userId] as const;

export async function listInvitationFavorites(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("invitation_favorites")
    .select("invitation_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => row.invitation_id as string);
}

export async function setInvitationFavorite(userId: string, invitationId: string, favorite: boolean) {
  if (favorite) {
    const { error } = await supabase.from("invitation_favorites").insert({ user_id: userId, invitation_id: invitationId });
    if (error && error.code !== "23505") throw error;
    return;
  }
  const { error } = await supabase
    .from("invitation_favorites")
    .delete()
    .eq("user_id", userId)
    .eq("invitation_id", invitationId);
  if (error) throw error;
}
