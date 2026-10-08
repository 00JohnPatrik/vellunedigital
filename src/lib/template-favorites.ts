import { supabase } from "@/integrations/supabase/client";

export const templateFavoritesKey = (userId: string) => ["template-favorites", userId] as const;

export async function listTemplateFavorites(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("template_favorites")
    .select("template_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => row.template_id);
}

export async function setTemplateFavorite(userId: string, templateId: string, favorite: boolean) {
  if (favorite) {
    const { error } = await supabase.from("template_favorites").insert({ user_id: userId, template_id: templateId });
    if (error && error.code !== "23505") throw error;
    return;
  }
  const { error } = await supabase
    .from("template_favorites")
    .delete()
    .eq("user_id", userId)
    .eq("template_id", templateId);
  if (error) throw error;
}
