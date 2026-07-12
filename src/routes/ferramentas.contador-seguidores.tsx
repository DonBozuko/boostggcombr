import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { contarSeguidores } from "@/lib/contador-seguidores.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, Users, UserPlus, Image as ImageIcon, BadgeCheck, Lock } from "lucide-react";

const CANON = "https://boostgg.com.br/ferramentas/contador-seguidores";

export const Route = createFileRoute("/ferramentas/contador-seguidores")({
  head: () => ({
    meta: [
      { title: "Contador de Seguidores Instagram Grátis — EliteBoost Prime" },
      {
        name: "description",
        content:
          "Contador de seguidores Instagram grátis, em tempo real. Digite @usuario e veja seguidores, seguindo, posts e status de verificação. Sem login.",
      },
      { property: "og:title", content: "Contador de Seguidores Instagram Grátis" },
      { property: "og:description", content: "Descubra em segundos quantos seguidores um perfil tem no Instagram." },
      { property: "og:url", content: CANON },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: CANON }],
  }),
  component: ContadorPage,
});

function formatNum(n: number) {
  return new Intl.NumberFormat("pt-BR").format(n);
}

function ContadorPage() {
  const [username, setUsername] = useState("");
  const fn = useServerFn(contarSeguidores);
  const mut = useMutation({ mutationFn: (u: string) => fn({ data: { username: u } }) });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) mut.mutate(username);
  };

  const res = mut.data;
  const data = res && res.ok ? res : null;
  const erro = res && !res.ok ? res.error : null;


  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold md:text-4xl">
            Contador de Seguidores Instagram <span className="text-primary">Grátis</span>
          </h1>
          <p className="mt-3 text-muted-foreground">
            Digite qualquer <strong>@usuario</strong> e veja seguidores, seguindo, posts e status em tempo real.
            Sem login, sem cadastro.
          </p>
        </div>

        <Card className="p-6">
          <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/^@/, ""))}
                placeholder="usuario_do_instagram"
                className="pl-7"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                maxLength={30}
              />
            </div>
            <Button type="submit" disabled={mut.isPending || !username.trim()} className="sm:w-48">
              {mut.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Consultando…
                </>
              ) : (
                "Contar seguidores"
              )}
            </Button>
          </form>

          {erro && (
            <p className="mt-4 text-sm text-destructive">
              {erro === "NOT_FOUND"
                ? "Perfil não encontrado. Verifique o @usuario."
                : "Falha ao consultar. Tente novamente em alguns segundos."}
            </p>
          )}

          {data && (
            <div className="mt-6 rounded-lg border bg-card p-5">
              <div className="flex items-center gap-4">
                {data.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={data.avatar}
                    alt={data.username}
                    className="h-16 w-16 rounded-full border object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : null}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold">@{data.username}</p>
                    {data.verified && <BadgeCheck className="h-4 w-4 text-primary" />}
                    {data.privado && <Lock className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  {data.fullName && <p className="truncate text-sm text-muted-foreground">{data.fullName}</p>}
                </div>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3">
                <Stat icon={<Users className="h-4 w-4" />} label="Seguidores" value={formatNum(data.seguidores)} highlight />
                <Stat icon={<UserPlus className="h-4 w-4" />} label="Seguindo" value={formatNum(data.seguindo)} />
                <Stat icon={<ImageIcon className="h-4 w-4" />} label="Posts" value={formatNum(data.posts)} />
              </div>

              <div className="mt-5 flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Quer <strong className="text-foreground">turbinar</strong> esse perfil?
                </p>
                <Link
                  to="/"
                  className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
                >
                  Impulsionar perfil no Pix →
                </Link>
              </div>
            </div>
          )}
        </Card>

        <section className="mt-10 space-y-4 text-sm text-muted-foreground">
          <h2 className="text-lg font-semibold text-foreground">Como funciona</h2>
          <p>
            Consultamos o perfil público do Instagram e devolvemos os números atualizados em segundos. Só funciona para perfis
            <strong> públicos</strong>; contas privadas mostram apenas nome e foto.
          </p>
          <h2 className="text-lg font-semibold text-foreground">Para que serve</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Analisar concorrentes antes de investir em conteúdo.</li>
            <li>Acompanhar o crescimento de perfis parceiros.</li>
            <li>Validar se um influencer tem engajamento real (razão seguidores/seguindo).</li>
          </ul>
        </section>
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-lg border p-3 text-center ${highlight ? "bg-primary/10 border-primary/40" : ""}`}>
      <div className="mb-1 flex items-center justify-center gap-1 text-xs text-muted-foreground">
        {icon} {label}
      </div>
      <div className="text-lg font-bold tabular-nums">{value}</div>
    </div>
  );
}
