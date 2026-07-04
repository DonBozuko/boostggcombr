import { Link } from "@tanstack/react-router";
import { TrendingUp } from "lucide-react";
import type { ReactNode } from "react";

export function BlogLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="dark min-h-screen text-foreground">
      <header className="sticky top-0 z-50 bg-background/95 border-b border-border">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-[image:var(--gradient-cta)] grid place-items-center shadow-glow">
              <TrendingUp className="size-4 text-background" />
            </div>
            <span className="font-display font-bold text-lg">EliteBoost Prime</span>
          </Link>
          <Link to="/blog" className="text-sm text-muted-foreground hover:text-foreground">
            Blog
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-6 py-16 max-w-3xl">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">{title}</h1>
        {subtitle && <p className="text-lg text-muted-foreground mb-10">{subtitle}</p>}
        <article className="prose prose-invert max-w-none space-y-6 text-muted-foreground leading-relaxed [&_h2]:font-display [&_h2]:font-bold [&_h2]:text-2xl [&_h2]:text-foreground [&_h2]:mt-10 [&_h2]:mb-3 [&_a]:text-primary [&_a]:underline [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-2">
          {children}
        </article>

        <div className="mt-16 rounded-2xl border border-border bg-card/60 p-8 text-center">
          <h2 className="font-display font-bold text-2xl mb-2">Pronto para crescer?</h2>
          <p className="text-muted-foreground mb-6">
            Escolha o pacote ideal e receba seguidores reais em minutos.
          </p>
          <Link
            to="/"
            className="inline-block px-8 py-3 rounded-lg bg-[image:var(--gradient-cta)] text-background font-bold shadow-glow"
          >
            Ver pacotes
          </Link>
        </div>
      </main>

      <footer className="border-t border-border py-10 mt-8">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-md bg-[image:var(--gradient-cta)]" />
            <span className="font-display font-semibold text-foreground">EliteBoost Prime</span>
          </div>
          <p>© 2026 EliteBoost Prime. Não somos afiliados ao Instagram ou Meta.</p>
        </div>
      </footer>
    </div>
  );
}
