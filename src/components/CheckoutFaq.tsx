import { ShieldCheck, Lock, Clock, RefreshCw, QrCode } from "lucide-react";

const faqs = [
  {
    icon: ShieldCheck,
    q: "É seguro comprar seguidores aqui?",
    a: "Sim. Somos uma empresa brasileira com CNPJ ativo. Não pedimos senha e usamos apenas o @ do seu perfil público.",
  },
  {
    icon: Lock,
    q: "Preciso passar a senha do Instagram?",
    a: "Nunca. Só pedimos o link ou @ do perfil. Sua conta continua 100% sob seu controle.",
  },
  {
    icon: Clock,
    q: "Em quanto tempo começa a entrega?",
    a: "A maioria dos pedidos inicia em até 5 minutos após a confirmação do Pix. Em picos de demanda, até 24h.",
  },
  {
    icon: RefreshCw,
    q: "E se cair seguidor depois?",
    a: "Todos os planos incluem reposição garantida por 30 dias. Se houver queda, repomos sem custo adicional.",
  },
  {
    icon: QrCode,
    q: "Como funciona o pagamento via Pix?",
    a: "Após preencher os dados, você recebe o QR Code no WhatsApp. Assim que o Pix cai no nosso sistema, a entrega começa automaticamente.",
  },
];

export function CheckoutFaq() {
  return (
    <div className="rounded-2xl border border-border bg-card/50 p-4 sm:p-5 mb-5">
      <h3 className="text-sm font-semibold text-foreground mb-3 text-center">
        Tire suas dúvidas antes de comprar
      </h3>
      <div className="space-y-2">
        {faqs.map((item, i) => (
          <details
            key={i}
            className="group rounded-lg border border-border bg-background/50"
          >
            <summary className="cursor-pointer list-none flex items-center gap-3 p-3 text-sm font-medium text-foreground">
              <item.icon className="size-4 shrink-0 text-primary" />
              <span className="flex-1">{item.q}</span>
              <span className="text-primary group-open:rotate-45 transition-transform text-lg leading-none">+</span>
            </summary>
            <p className="px-3 pb-3 text-sm text-muted-foreground leading-relaxed">
              {item.a}
            </p>
          </details>
        ))}
      </div>
    </div>
  );
}
