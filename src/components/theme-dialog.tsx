import { useState } from "react";
import { Moon, Sun } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark";

export function ThemeDialog({ open, userId, onSaved }: { open: boolean; userId: string; onSaved: (t: Theme) => void }) {
  const [saving, setSaving] = useState<Theme | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function choose(theme: Theme) {
    setSaving(theme);
    setError(null);
    const { error } = await supabase.from("users").update({ theme }).eq("id", userId);
    setSaving(null);
    if (error) return setError("Não foi possível salvar. Tente novamente.");
    onSaved(theme);
  }

  const options: { value: Theme; label: string; icon: typeof Sun }[] = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
  ];

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-md [&>button]:hidden" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Como você prefere visualizar o sistema?</DialogTitle>
          <DialogDescription>Você poderá alterar depois nas configurações.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          {options.map((o) => (
            <button key={o.value} disabled={!!saving} onClick={() => choose(o.value)}
              className={cn("flex flex-col items-center gap-2 rounded-lg border p-6 transition-colors hover:border-primary hover:bg-accent",
                saving === o.value && "border-primary")}>
              <o.icon className="h-6 w-6" />
              <span className="text-sm font-medium">{o.label}</span>
            </button>
          ))}
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </DialogContent>
    </Dialog>
  );
}
