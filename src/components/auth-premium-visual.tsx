import { CheckCircle2, MousePointer2, Send, Sparkles } from "lucide-react";
import Logo from "@/components/Logo";

export function AuthPremiumVisual() {
  return (
    <section className="vellune-auth-visual relative hidden min-h-0 flex-col justify-between overflow-hidden px-10 py-8 lg:flex xl:px-20" style={{ animation: "velluneAuthFadeUp 750ms cubic-bezier(.22,1,.36,1)" }}>
      <style>{`
        @media (max-height: 840px) and (min-width: 1024px) {
          .vellune-auth-visual { padding-top: 1.5rem; padding-bottom: 1.5rem; }
          .vellune-auth-visual-content { padding-bottom: .75rem; }
          .vellune-auth-visual-headline { font-size: clamp(2.65rem, 4.2vw, 4.35rem); }
          .vellune-auth-visual-copy { margin-top: 1rem; max-width: 28rem; line-height: 1.55; }
          .vellune-auth-visual-pills { margin-top: 1.1rem; }
          .vellune-auth-visual-preview { margin-top: 1.15rem; transform: scale(.86); transform-origin: left bottom; margin-bottom: -1.6rem; }
          .vellune-auth-visual-footer { transform: scale(.9); transform-origin: left bottom; }
        }
        @media (max-height: 730px) and (min-width: 1024px) {
          .vellune-auth-visual { padding-top: 1rem; padding-bottom: 1rem; }
          .vellune-auth-visual-content { padding-bottom: .25rem; }
          .vellune-auth-visual-headline { font-size: clamp(2.35rem, 3.8vw, 3.7rem); }
          .vellune-auth-visual-copy { margin-top: .8rem; }
          .vellune-auth-visual-preview { margin-top: .8rem; transform: scale(.76); margin-bottom: -3.4rem; }
        }
        @media (prefers-reduced-motion: reduce) {
          .vellune-auth-visual { animation: none !important; }
        }
      `}</style>
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-[#d4af37]/25 bg-[#d4af37]/[0.06] text-[#e5c66b] shadow-[0_0_24px_rgba(212,175,55,0.08)]"><Sparkles className="h-4 w-4" /></span>
        <div>
          <Logo className="h-10 w-[208px] text-white transition-opacity duration-500 hover:opacity-90" />
          <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.3em] text-white/25">Plataforma de convites digitais</p>
        </div>
      </div>
      <div className="vellune-auth-visual-content relative max-w-[650px] pb-6 xl:pb-10">
        <div className="pointer-events-none absolute -left-28 -top-24 h-64 w-64 rounded-full bg-[#d4af37]/[0.035] blur-3xl" />
        <div className="relative">
          <div className="mb-7 flex items-center gap-3"><span className="h-px w-10 bg-[#d4af37]/70" /><span className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[#e5c66b]">Convites digitais</span></div>
          <h1 className="vellune-auth-visual-headline max-w-[620px] font-display text-[clamp(3rem,4.7vw,5.25rem)] font-medium leading-[0.98] tracking-[-0.055em] text-white">Seu momento.<br /><span className="text-white/55">Do seu jeito.</span></h1>
          <p className="vellune-auth-visual-copy mt-6 max-w-[500px] text-[15px] leading-7 text-white/45">Crie, personalize e publique experiências digitais que fazem cada celebração começar antes mesmo do evento.</p>
          <div className="vellune-auth-visual-pills mt-7 flex flex-wrap gap-2.5"><span className="rounded-full border border-white/[0.08] bg-white/[0.025] px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">Criar</span><span className="rounded-full border border-white/[0.08] bg-white/[0.025] px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">Personalizar</span><span className="rounded-full border border-white/[0.08] bg-white/[0.025] px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">Publicar</span></div>
          <div className="vellune-auth-visual-preview relative mt-8 w-[min(420px,92%)]">
            <div className="absolute -right-8 top-8 h-52 w-52 rounded-full border border-[#d4af37]/10" />
            <div className="relative overflow-hidden rounded-[24px] border border-white/[0.09] bg-[#0f1116]/80 p-3 shadow-[0_30px_80px_rgba(0,0,0,0.38)] backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-white/[0.06] px-2 pb-3"><div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#d4af37] shadow-[0_0_9px_rgba(212,175,55,0.7)]" /><span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-white/35">Vellune Studio</span></div><span className="text-[9px] text-white/20">Convite • rascunho</span></div>
              <div className="grid grid-cols-[1fr_1.2fr] gap-3 p-2">
                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3"><div className="space-y-2"><div className="h-2 w-14 rounded-full bg-white/[0.08]" /><div className="h-2.5 w-24 rounded-full bg-[#d4af37]/20" /><div className="mt-4 h-20 rounded-xl border border-[#d4af37]/10 bg-[radial-gradient(circle_at_50%_15%,rgba(212,175,55,0.15),transparent_55%),linear-gradient(145deg,#171922,#0c0e13)]" /><div className="h-2 w-20 rounded-full bg-white/[0.06]" /><div className="h-2 w-28 rounded-full bg-white/[0.04]" /></div></div>
                <div className="relative min-h-[148px] overflow-hidden rounded-2xl border border-[#d4af37]/15 bg-[radial-gradient(circle_at_50%_18%,rgba(212,175,55,0.18),transparent_36%),linear-gradient(160deg,#1b1a18,#0f1114)] p-5"><div className="absolute -right-9 -top-9 h-24 w-24 rounded-full border border-[#d4af37]/10" /><div className="relative text-center"><p className="text-[8px] font-semibold uppercase tracking-[0.25em] text-[#d4af37]">Uma ocasião especial</p><p className="mt-4 font-display text-[17px] tracking-[-0.03em] text-white/90">Seu evento</p><p className="mt-1 text-[8px] uppercase tracking-[0.24em] text-white/35">Convite digital</p><div className="mx-auto mt-5 h-px w-16 bg-[#d4af37]/35" /><p className="mt-3 text-[8px] text-white/35">Você está convidado</p></div><div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full border border-white/[0.08] bg-black/20 px-2 py-1 text-[7px] text-white/30"><MousePointer2 className="h-2.5 w-2.5" />editando</div></div>
              </div>
              <div className="mt-1 flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.018] px-3 py-2.5"><div className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-[#d4af37]" /><span className="text-[9px] text-white/35">Design pronto para publicação</span></div><Send className="h-3.5 w-3.5 text-white/25" /></div>
            </div>
          </div>
        </div>
      </div>
      <div className="vellune-auth-visual-footer flex items-center gap-7 text-[10px] font-medium uppercase tracking-[0.2em] text-white/30"><span>Experiência Vellune</span><span className="h-px w-8 bg-white/10" /><span>Ambiente protegido</span></div>
    </section>
  );
}
