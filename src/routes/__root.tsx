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

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";
import { BrandGuard } from "@/components/BrandGuard";

import { SupportChatWidget } from "@/components/SupportChatWidget";


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

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
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
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "author", content: "EliteBoost Prime" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "EliteBoost Prime" },
      { property: "og:locale", content: "pt_BR" },
      { name: "google-site-verification", content: "y8Z87vQybaocMrzCC4Zzur2UBFi7VEGWAfdklGB2opM" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "apple-touch-icon", href: "/favicon.svg" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@300;400;500;600&family=Cinzel:wght@500;600;700;800&family=Playfair+Display:wght@600;700;800&display=swap" },
    ],
    scripts: [
      { src: "/~flock.js", async: true, defer: true },
      { src: "https://www.googletagmanager.com/gtag/js?id=G-TKGLV8VB6W", async: true },
      {
        children: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-TKGLV8VB6W');
gtag('config', 'AW-16655771808');`,
      },

      {

        children: `!function (w, d, t) {
  w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script");n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};
  ttq.load('D97FQ2RC77U5KEVKK73G');
  ttq.page();
}(window, document, 'ttq');`,
      },




      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "EliteBoost Prime",
          legalName: "EliteBoost Prime",
          url: "https://boostgg.com.br",
          logo: "https://boostgg.com.br/favicon.ico",
          taxID: "47.363.210/0001-08",
          vatID: "47363210000108",
          identifier: { "@type": "PropertyValue", propertyID: "CNPJ", value: "47.363.210/0001-08" },
          address: { "@type": "PostalAddress", addressCountry: "BR" },
          sameAs: [
            "https://boostgg.com.br/",
            "https://boostgg.com.br/tiktok",
            "https://boostgg.com.br/youtube",
            "https://boostgg.com.br/facebook",
            "https://boostgg.com.br/telegram",
            "https://boostgg.com.br/trafego",
          ],
        }),
      },
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
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    const { pathname, search, hash } = window.location;
    const canonicalPath = pathname.replace(/\/{2,}/g, "/") || "/";

    if (canonicalPath !== pathname) {
      window.location.replace(`${canonicalPath}${search}${hash}`);
    }
  }, []);

  useEffect(() => {
    // Trava silenciadora de áudio concorrente: pausa Jarvis em qualquer troca de rota
    const unsub = router.subscribe("onBeforeNavigate", () => {
      import("@/hooks/useJarvis").then((m) => m.stopAllJarvis()).catch(() => {});
    });
    return () => { unsub(); };
  }, [router]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrandGuard />
      
      <SupportChatWidget />
      <Outlet />
      <Toaster theme="dark" position="top-center" richColors />
    </QueryClientProvider>
  );
}

