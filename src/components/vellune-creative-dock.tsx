import { FolderOpen, Home, LayoutTemplate, Plus, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CreativeDockItem = "home" | "projects" | "templates" | "settings";

export type VelluneCreativeDockProps = {
  activeItem?: CreativeDockItem;
  onNavigate?: (item: CreativeDockItem) => void;
  onCreate?: () => void;
  className?: string;
};

export function VelluneCreativeDock({ activeItem = "projects", onNavigate, onCreate, className }: VelluneCreativeDockProps) {
  const items = [
    { id: "home", label: "Início", Icon: Home },
    { id: "projects", label: "Projetos", Icon: FolderOpen },
    { id: "templates", label: "Modelos", Icon: LayoutTemplate },
    { id: "settings", label: "Ajustes", Icon: Settings2 },
  ] as const;
  return (
    <nav className={cn("vellune-dock fixed inset-x-0 z-[170] flex justify-center px-3 pointer-events-none", className)} aria-label="Creative Dock">
      <div className="pointer-events-auto grid grid-cols-[1fr_1fr_auto_1fr_1fr] items-center gap-1 rounded-full border border-border bg-card/90 px-2 py-2 shadow-vellune backdrop-blur-md sm:gap-2 sm:px-3" role="toolbar" aria-label="Navegação criativa">
        {items.slice(0,2).map(item => <DockButton key={item.id} item={item} active={activeItem === item.id} onClick={() => onNavigate?.(item.id)} />)}
        <Button onClick={onCreate} className="vellune-dock-create relative mx-1 -mt-5 h-14 w-14 shrink-0 rounded-full bg-primary p-0 text-primary-foreground ring-4 ring-card hover:bg-primary-hover focus-visible:ring-foreground sm:h-16 sm:w-16" aria-label="Criar novo convite" title="Criar novo"><Plus className="size-6" /></Button>
        {items.slice(2).map(item => <DockButton key={item.id} item={item} active={activeItem === item.id} onClick={() => onNavigate?.(item.id)} />)}
      </div>
    </nav>
  );
}

function DockButton({ item, active, onClick }: { item: { id: CreativeDockItem; label: string; Icon: typeof Home }; active: boolean; onClick: () => void }) {
  return <Button variant="ghost" onClick={onClick} aria-current={active ? "page" : undefined} aria-label={item.label} title={item.label} className={cn("vellune-dock-item h-12 w-12 flex-col gap-1 rounded-full p-0 focus-visible:ring-primary sm:h-14 sm:w-14", active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-background/30 hover:text-foreground")}><item.Icon className="size-[18px]" /><span className="text-[9px] font-medium sm:text-[10px]">{item.label}</span></Button>;
}
