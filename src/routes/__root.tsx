import type { ErrorComponentProps } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { ArrowRight, Sparkles } from "lucide-react";

import appCss from "@/styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "@/components/ui/sonner";
import { AuthUnavailableState } from "@/components/auth-unavailable-state";
import Logo from "@/components/Logo";

function NotFoundComponent() {
  return (
    <main className="vellune-platform-root vellune-not-found min-h-[100svh] overflow-hidden bg-background text-foreground">
      <div className="vellune-not-found-orb vellune-not-found-orb-one" aria-hidden="true" />
      <div className="vellune-not-found-orb vellune-not-found-orb-two" aria-hidden="true" />

      <div className="relative mx-auto flex min-h-[100svh] w-full max-w-[1240px] items-center justify-center px-5 py-10 sm:px-8 lg:px-12">
        <div className="grid w-full max-w-[980px] items-center gap-10 lg:grid-cols-[.9fr_1.1fr] lg:gap-16">
          <div className="order-2 lg:order-1">
            <div className="mb-6 flex items-center gap-3">
              <span className="vellune-not-found-brand-mark" aria-hidden="true">
                <Logo markOnly className="h-6 w-6" title="" />
              </span>
              <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Vellune Digital</span>
            </div>

            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">Erro 404</p>
            <h1 className="max-w-xl font-display text-[clamp(2.7rem,6vw,5.2rem)] font-medium leading-[.94] tracking-[-0.055em]">
              Esta página<br /><span className="text-muted-foreground">não existe.</span>
            </h1>
            <p className="mt-5 max-w-lg text-sm leading-7 text-muted-foreground sm:text-base">
              O endereço pode ter sido alterado ou não fazer mais parte da experiência Vellune. Volte para o início e continue de onde parou.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/" className="vellune-not-found-primary group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground">
                Voltar ao início
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
              <button type="button" onClick={() => window.history.back()} className="vellune-not-found-secondary inline-flex h-12 items-center justify-center rounded-xl px-5 text-sm font-medium text-foreground">
                Voltar
              </button>
            </div>

            <div className="mt-9 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/60">
              <span className="h-px w-8 bg-border" />
              Experiência Vellune
            </div>
          </div>

          <div className="order-1 flex min-h-[330px] items-center justify-center lg:order-2 lg:min-h-[500px]">
            <div className="vellune-not-found-scene relative h-[320px] w-[min(88vw,460px)] sm:h-[390px] lg:h-[470px]">
              <div className="vellune-not-found-ghost absolute inset-x-8 top-10 h-[78%] rounded-[34px] border border-primary/10 bg-card/30" />
              <div className="vellune-not-found-plane absolute left-[7%] top-[16%] h-[66%] w-[78%] rounded-[38px] border border-border/70 bg-card/70 shadow-2xl" />

              <div className="vellune-not-found-invite absolute right-[5%] top-[8%] h-[75%] w-[56%] rounded-[34px] border border-primary/20 bg-background shadow-2xl">
                <div className="absolute inset-2 rounded-[28px] border border-primary/10 bg-card p-6 sm:p-8">
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] font-semibold uppercase tracking-[0.24em] text-primary">Vellune</span>
                    <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_14px_rgba(0,0,0,.18)]" />
                  </div>
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <span className="font-display text-[clamp(4rem,10vw,6.5rem)] font-medium leading-none tracking-[-.09em] text-foreground/10">404</span>
                    <div className="vellune-not-found-line h-px w-14" />
                    <p className="mt-4 font-display text-xl tracking-[-.04em]">Página não encontrada</p>
                    <p className="mt-2 max-w-[160px] text-[9px] leading-4 text-muted-foreground">O convite certo está em outro lugar.</p>
                  </div>
                </div>
              </div>

              <div className="vellune-not-found-chip absolute bottom-[8%] left-[4%] inline-flex items-center gap-2 rounded-full border border-border bg-card/90 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground shadow-lg backdrop-blur-xl">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Experiência Vellune
              </div>
              <div className="vellune-not-found-404-shadow absolute bottom-[1%] right-[5%] font-display text-[clamp(5rem,16vw,9rem)] font-semibold leading-none tracking-[-.09em] text-primary/[0.07]">404</div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .vellune-not-found { isolation:isolate; background:radial-gradient(circle at 85% 12%,color-mix(in oklch,var(--color-primary) 7%,transparent),transparent 26rem),radial-gradient(circle at 8% 86%,color-mix(in oklch,var(--color-primary) 4%,transparent),transparent 24rem),var(--color-background); }
        .vellune-not-found-scene { perspective:1400px; transform-style:preserve-3d; }
        .vellune-not-found-plane { transform:rotateY(-10deg) rotateX(4deg) rotateZ(-2deg) translateZ(-20px); transform-style:preserve-3d; animation:velluneNotFoundPlane 7s ease-in-out infinite; }
        .vellune-not-found-ghost { transform:rotateY(-16deg) rotateX(8deg) rotateZ(2deg) translate3d(-10px,12px,-90px); opacity:.55; }
        .vellune-not-found-invite { transform:rotateY(-10deg) rotateX(5deg) rotateZ(1.2deg) translateZ(36px); transform-style:preserve-3d; animation:velluneNotFoundInvite 6s ease-in-out infinite; }
        .vellune-not-found-invite::after { content:""; position:absolute; inset:10px; border-radius:26px; box-shadow:inset 0 1px 0 rgba(255,255,255,.06),0 28px 50px rgba(0,0,0,.12); pointer-events:none; }
        .vellune-not-found-chip { transform:translateZ(90px) rotateZ(-3deg); animation:velluneNotFoundChip 5s ease-in-out infinite; }
        .vellune-not-found-404-shadow { transform:translateZ(-40px) rotateZ(3deg); }
        .vellune-not-found-brand-mark { display:inline-flex;height:2rem;width:2rem;align-items:center;justify-content:center;border:1px solid color-mix(in oklch,var(--color-primary) 22%,transparent);border-radius:.7rem;background:color-mix(in oklch,var(--color-primary) 7%,transparent);box-shadow:0 8px 24px color-mix(in oklch,var(--color-primary) 8%,transparent); }
        .vellune-not-found-line { background:linear-gradient(90deg,transparent,color-mix(in oklch,var(--color-primary) 50%,transparent),transparent); }
        .vellune-not-found-primary,.vellune-not-found-secondary { border:1px solid var(--vellune-platform-line); transition:transform 180ms ease,box-shadow 180ms ease,background-color 180ms ease,border-color 180ms ease; }
        .vellune-not-found-primary { box-shadow:0 14px 32px color-mix(in oklch,var(--color-primary) 14%,transparent); }
        .vellune-not-found-primary:hover { transform:translateY(-1px); box-shadow:0 20px 44px color-mix(in oklch,var(--color-primary) 20%,transparent); }
        .vellune-not-found-secondary { background:color-mix(in oklch,var(--color-card) 72%,transparent); }
        .vellune-not-found-secondary:hover { background:var(--color-accent); border-color:var(--vellune-platform-line-strong); transform:translateY(-1px); }
        .vellune-not-found-orb { position:absolute;border-radius:999px;pointer-events:none;border:1px solid color-mix(in oklch,var(--color-primary) 9%,transparent); }
        .vellune-not-found-orb-one { width:18rem;height:18rem;right:-7rem;top:-7rem; }
        .vellune-not-found-orb-two { width:13rem;height:13rem;left:-6rem;bottom:-5rem;opacity:.55; }
        @keyframes velluneNotFoundInvite {
          0%,100% { transform:rotateY(-10deg) rotateX(5deg) rotateZ(1.2deg) translate3d(0,0,36px); }
          50% { transform:rotateY(-7deg) rotateX(3deg) rotateZ(.3deg) translate3d(0,-8px,44px); }
        }
        @keyframes velluneNotFoundPlane {
          0%,100% { transform:rotateY(-10deg) rotateX(4deg) rotateZ(-2deg) translate3d(0,0,-20px); }
          50% { transform:rotateY(-7deg) rotateX(2deg) rotateZ(-1deg) translate3d(0,-5px,-14px); }
        }
        @keyframes velluneNotFoundChip {
          0%,100% { transform:translateZ(90px) rotateZ(-3deg); }
          50% { transform:translateZ(100px) rotateZ(-1deg) translateY(-4px); }
        }
        @media (max-width:767px) { .vellune-not-found { overflow-y:auto; } .vellune-not-found-scene { transform:scale(.93); } }
        @media (prefers-reduced-motion:reduce) {
          .vellune-not-found-plane,.vellune-not-found-invite,.vellune-not-found-chip { animation:none!important; }
          .vellune-not-found-primary:hover,.vellune-not-found-secondary:hover { transform:none; }
        }
      `}</style>
    </main>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  const isAuthRoute =
    typeof window !== "undefined" &&
    ["/login", "/first-access", "/reset-password"].includes(window.location.pathname);

  if (isAuthRoute) {
    return (
      <main className="fixed inset-0 h-[100dvh] w-full overflow-hidden bg-[#08090d] text-white">
        <AuthUnavailableState
          title="Não conseguimos abrir a área segura"
          description="O Vellune encontrou uma falha inesperada ao carregar a autenticação. Tente novamente; seu acesso continua protegido."
          onRetry={() => {
            router.invalidate();
            reset();
          }}
        />
      </main>
    );
  }

  return (
    <main className="vellune-platform-root min-h-[100svh] overflow-hidden bg-background px-5 py-10 text-foreground">
      <div className="mx-auto flex min-h-[calc(100svh-5rem)] w-full max-w-2xl items-center justify-center">
        <section className="w-full rounded-[28px] border border-border/70 bg-[#111318]/92 p-7 text-center shadow-[0_30px_90px_-34px_rgba(8,9,13,0.98)] backdrop-blur-xl sm:p-10">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.24em] text-primary">Vellune Digital</p>
          <h1 className="mt-3 font-display text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">Não foi possível carregar esta tela.</h1>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
            Ocorreu uma falha inesperada ao abrir a página. Atualize a tela para tentar novamente ou volte ao início.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => {
                router.invalidate();
                reset();
              }}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-[0_12px_32px_-14px_hsl(var(--primary)/.8)] transition hover:brightness-105"
            >
              Tentar novamente
            </button>
            <a
              href="/"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-border/70 bg-background/45 px-5 text-sm font-medium text-foreground transition hover:bg-accent"
            >
              Voltar ao início
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#08090d" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { title: "Vellune Digital — Plataforma de Convites Digitais" },
      { name: "description", content: "Plataforma para criar, publicar e compartilhar convites digitais com confirmação de presença." },
      { property: "og:title", content: "Vellune Digital — Plataforma de Convites Digitais" },
      { property: "og:description", content: "Plataforma para criar, publicar e compartilhar convites digitais com confirmação de presença." },
      { property: "og:site_name", content: "Vellune Digital" },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "/logo.svg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "/logo.svg" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.ico?v=2", type: "image/x-icon" },
      { rel: "icon", href: "/favicon.svg?v=4", type: "image/svg+xml" },
      { rel: "shortcut icon", href: "/favicon.ico?v=2", type: "image/x-icon" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/favicon.svg?v=4" },
      { rel: "preconnect", href: "https://fonts.googleapis.com", crossOrigin: "anonymous" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Sora:wght@500;600;700&display=optional" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("vellune-theme");if(t==="dark")document.documentElement.classList.add("dark");else if(t==="light")document.documentElement.classList.remove("dark")}catch(e){}`,
          }}
        />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

const SESSION_IDLE_LIMIT_MS = 12 * 60 * 60 * 1000;
const SESSION_ACTIVITY_KEY = "vellune-session-last-activity";

function runAuthRuntimeChecks() {
  if (typeof window === "undefined") return;
  const isLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname);

  if (!isLocal && window.location.protocol !== "https:") {
    console.error("[Vellune Auth] Production authentication must run over HTTPS.");
  }

  const configuredUrl = import.meta.env["VITE_SUPABASE_URL"];
  if (configuredUrl) {
    try {
      const parsed = new URL(configuredUrl);
      if (parsed.protocol !== "https:" && !isLocal) {
        console.error("[Vellune Auth] Supabase URL must use HTTPS in production.");
      }
    } catch {
      console.error("[Vellune Auth] VITE_SUPABASE_URL is not a valid URL.");
    }
  } else {
    console.error("[Vellune Auth] VITE_SUPABASE_URL is missing.");
  }

  if (!import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"]) {
    console.error("[Vellune Auth] VITE_SUPABASE_PUBLISHABLE_KEY is missing.");
  }
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    runAuthRuntimeChecks();
    let lastWrite = 0;
    let signingOut = false;

    const readLastActivity = () => {
      try {
        const raw = window.sessionStorage.getItem(SESSION_ACTIVITY_KEY);
        const value = raw ? Number(raw) : 0;
        return Number.isFinite(value) ? value : 0;
      } catch {
        return 0;
      }
    };

    const endSessionForIdle = () => {
      if (signingOut) return;
      signingOut = true;
      void supabase.auth.signOut().finally(() => {
        try {
          window.sessionStorage.removeItem(SESSION_ACTIVITY_KEY);
        } catch {
          // Ignore storage restrictions.
        }
        window.location.assign("/login?error=inactive");
      });
    };

    const markActivity = () => {
      const now = Date.now();
      if (now - lastWrite < 15_000) return;
      const last = readLastActivity();
      if (last && now - last > SESSION_IDLE_LIMIT_MS) {
        endSessionForIdle();
        return;
      }
      lastWrite = now;
      try {
        window.sessionStorage.setItem(SESSION_ACTIVITY_KEY, String(now));
      } catch {
        // Ignore storage restrictions; Supabase remains the source of session truth.
      }
    };

    const activityEvents = ["pointerdown", "keydown", "touchstart", "scroll"] as const;
    activityEvents.forEach((eventName) => window.addEventListener(eventName, markActivity, { passive: true }));

    const checkIdle = () => {
      const last = readLastActivity();
      if (last && Date.now() - last > SESSION_IDLE_LIMIT_MS) endSessionForIdle();
    };
    const idleTimer = window.setInterval(checkIdle, 60_000);

    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        try {
          window.sessionStorage.setItem(SESSION_ACTIVITY_KEY, String(Date.now()));
        } catch {
          // Ignore storage restrictions.
        }
      }
      if (event === "SIGNED_OUT") {
        try {
          window.sessionStorage.removeItem(SESSION_ACTIVITY_KEY);
        } catch {
          // Ignore storage restrictions.
        }
      }
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED" && event !== "TOKEN_REFRESHED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
    });

    return () => {
      window.clearInterval(idleTimer);
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, markActivity));
      data.subscription.unsubscribe();
    };
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
