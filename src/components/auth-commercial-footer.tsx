import { ExternalLink, MessageCircle } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { whatsappHref } from "@/lib/nav";

export function AuthCommercialFooter() {
  const supportUrl = whatsappHref("Olá, preciso de ajuda para acessar a Vellune Digital.");

  return (
    <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 px-2 text-center text-[10px] leading-4 text-white/25 sm:mt-4 sm:text-[11px]">
      <Link to="/protecao-dados" className="transition-colors hover:text-white/60">
        Privacidade
      </Link>
      <span aria-hidden="true" className="text-white/10">•</span>
      <Link to="/termos" className="transition-colors hover:text-white/60">
        Termos de uso
      </Link>
      <span aria-hidden="true" className="text-white/10">•</span>
      {supportUrl ? (
        <a
          href={supportUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-medium text-[#d4af37]/75 transition-colors hover:text-[#e5c66b]"
        >
          <MessageCircle className="h-3 w-3" />
          Falar com suporte
          <ExternalLink className="h-2.5 w-2.5 opacity-60" />
        </a>
      ) : (
        <Link
          to="/suporte"
          className="inline-flex items-center gap-1 font-medium text-[#d4af37]/75 transition-colors hover:text-[#e5c66b]"
        >
          <MessageCircle className="h-3 w-3" />
          Falar com suporte
        </Link>
      )}
    </div>
  );
}
