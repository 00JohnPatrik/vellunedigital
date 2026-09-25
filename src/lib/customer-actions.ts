import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Status } from "@/components/admin-ui";

export async function setCustomerStatus(id: string, status: Status) {
  const { error } = await supabase.from("customers").update({ status }).eq("id", id);
  if (error) { toast.error("Não foi possível alterar o status."); throw error; }
  toast.success(`Cliente ${status === "active" ? "ativado" : "inativado"}.`);
}
