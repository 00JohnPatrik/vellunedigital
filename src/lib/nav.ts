import { BarChart3, Building2, Contact, CreditCard, FileText, LayoutDashboard, LayoutTemplate, Mail, Palette, Settings, Trash2, Users, type LucideIcon } from "lucide-react";

export type NavItem = { slug: string; label: string; icon: LucideIcon; to?: string };

export const adminNav: NavItem[] = [
  { slug: "", label: "Dashboard", icon: LayoutDashboard },
  { slug: "companies", label: "Empresas", icon: Building2 },
  { slug: "users", label: "Usuários", icon: Users },
  { slug: "plans", label: "Planos", icon: CreditCard },
  { slug: "subscriptions", label: "Assinaturas", icon: CreditCard },
  { slug: "customers", label: "Clientes", icon: Contact, to: "/customers" },
  { slug: "templates", label: "Modelos Oficiais", icon: LayoutTemplate },
  { slug: "reports", label: "Relatórios", icon: BarChart3 },
  { slug: "trash", label: "Lixeira", icon: Trash2 },
  { slug: "configuracoes", label: "Minha conta", icon: Settings },
];

export const companyNav: NavItem[] = [
  { slug: "", label: "Dashboard", icon: LayoutDashboard },
  { slug: "convites", label: "Convites", icon: Mail, to: "/invitations" },
  { slug: "customers", label: "Clientes", icon: Users, to: "/customers" },
  { slug: "templates", label: "Modelos", icon: FileText, to: "/templates" },
  { slug: "reports", label: "Resultados", icon: BarChart3, to: "/reports" },
  { slug: "assinatura", label: "Plano", icon: CreditCard },
  { slug: "marca", label: "Sua marca", icon: Palette, to: "/settings/brand" },
  { slug: "configuracoes", label: "Configurações", icon: Settings },
];

export const WHATSAPP_NUMBER = "5585989335371";
export const whatsappHref = (message = "Olá, preciso de ajuda com minha assinatura.") =>
  WHATSAPP_NUMBER ? `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}` : null;
