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

import appCss from "@/styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#0f172a" },
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
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/favicon.svg" },
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
        window.sessionStorage.removeItem(SESSION_ACTIVITY_KEY);
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
