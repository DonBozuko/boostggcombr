import { createFileRoute, Link } from "@tanstack/react-router";
import { PageGuide } from "@/components/PageGuide";

export const Route = createFileRoute("/api-revenda")({
  head: () => ({
    meta: [
      { title: "API para Revendedores — Elite Boost Prime | BoostGG" },
      {
        name: "description",
        content:
          "API de revenda do BoostGG: consulte serviços, saldo e crie pedidos por integração. Saldo pré-pago em Pix, preço com desconto de revenda e rastreio por pedido.",
      },
      { property: "og:title", content: "API para Revendedores — BoostGG" },
      {
        property: "og:description",
        content: "Integre seu painel ou site ao catálogo do BoostGG. Saldo pré-pago, desconto de revenda e status por pedido.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://www.boostgg.com.br/api-revenda" }],
  }),
  component: ApiRevenda,
});

const BASE = "https://www.boostgg.com.br/api/public/reseller/v1";

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border/60 bg-card/40 p-5">
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg bg-muted/40 p-3 text-xs leading-relaxed">
      <code>{children}</code>
    </pre>
  );
}

function ApiRevenda() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-bold sm:text-3xl">API para Revendedores</h1>
      <p className="mt-2 text-muted-foreground">
        Integre seu painel, site ou bot ao catálogo do BoostGG. Você trabalha com saldo pré-pago e preço
        de revenda; o cliente final é seu.
      </p>

      <div className="mt-6 space-y-5">
        <Block title="Como começar">
          <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Fale com o suporte no WhatsApp e peça acesso de revendedor.</li>
            <li>Você recebe uma chave de API (mostrada uma única vez) e um desconto contratado.</li>
            <li>Deposita saldo via Pix. Cada pedido debita do saldo automaticamente.</li>
          </ol>
        </Block>

        <Block title="Endpoint">
          <Code>{`POST ${BASE}
Content-Type: application/json`}</Code>
          <p className="mt-2 text-sm text-muted-foreground">
            Todos os parâmetros vão no corpo (JSON ou form). A chave pode ir em <code>key</code> ou no
            header <code>X-Api-Key</code>.
          </p>
        </Block>

        <Block title="1. Listar serviços">
          <Code>{`{ "key": "SUA_CHAVE", "action": "services" }

// resposta
{ "ok": true, "services": [
  { "service": "p1k", "name": "1.000 instagram seguidores",
    "quantity": 1000, "package_price": 25.90, "retail_price": 28.90,
    "refill": true, "currency": "BRL" }
] }`}</Code>
        </Block>

        <Block title="2. Consultar saldo">
          <Code>{`{ "key": "SUA_CHAVE", "action": "balance" }
// { "ok": true, "balance": "150.00", "currency": "BRL" }`}</Code>
        </Block>

        <Block title="3. Criar pedido">
          <Code>{`{ "key": "SUA_CHAVE", "action": "add",
  "service": "p1k", "link": "usuario_do_instagram" }

// { "ok": true, "order": "uuid-do-pedido",
//   "charge": "25.90", "balance": "124.10" }`}</Code>
          <p className="mt-2 text-sm text-muted-foreground">
            Sem saldo suficiente a resposta é <code>402</code> e nada é cobrado. Pacote pausado retorna{" "}
            <code>409</code> com o motivo.
          </p>
        </Block>

        <Block title="4. Status do pedido">
          <Code>{`{ "key": "SUA_CHAVE", "action": "status", "order": "uuid-do-pedido" }

// { "ok": true, "status": "Completed", "remains": 0, "charge": "25.90" }`}</Code>
          <p className="mt-2 text-sm text-muted-foreground">
            Status possíveis: Pending, In progress, Completed, Canceled, Refunded.
          </p>
        </Block>

        <Block title="Regras">
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Limite de 120 chamadas por minuto por chave.</li>
            <li>Pacotes com quantidade fixa: o campo <code>quantity</code> já vem definido por serviço.</li>
            <li>Reposição conforme o pacote (BR 30 dias, Premium BR 90 dias) — o campo <code>refill</code> indica.</li>
            <li>Pedido que não despacha na hora fica em fila e é reconciliado automaticamente.</li>
          </ul>
        </Block>
      </div>

      <p className="mt-8 text-sm">
        <Link to="/" className="underline">Voltar para a loja</Link>
      </p>
      <PageGuide page="api-revenda" />
    </main>
  );
}
