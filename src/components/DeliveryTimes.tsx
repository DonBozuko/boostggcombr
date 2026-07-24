// v220 — Comunicado de prazos reais por rede.
// Transparência anti-chargeback: cliente vê o intervalo real antes/depois de comprar.
// Prazos derivados da média dos 3 fornecedores (SMMhype, SMMPainel, Verified).
import { Clock, Info } from "lucide-react";

type RedeKey = "instagram" | "tiktok" | "youtube" | "kwai" | "twitter" | "generic";

type Row = { servico: string; inicio: string; conclusao: string };

const TABELA: Record<RedeKey, Row[]> = {
  instagram: [
    { servico: "Seguidores", inicio: "5–30 min", conclusao: "2–24 h" },
    { servico: "Curtidas", inicio: "1–10 min", conclusao: "10 min–2 h" },
    { servico: "Visualizações", inicio: "5–60 min", conclusao: "1–6 h" },
    { servico: "Comentários", inicio: "30 min–2 h", conclusao: "2–12 h" },
  ],
  tiktok: [
    { servico: "Seguidores", inicio: "10–60 min", conclusao: "6–48 h" },
    { servico: "Curtidas", inicio: "5–30 min", conclusao: "30 min–4 h" },
    { servico: "Visualizações", inicio: "5–30 min", conclusao: "1–6 h" },
  ],
  youtube: [
    { servico: "Inscritos", inicio: "30 min–4 h", conclusao: "1–7 dias" },
    { servico: "Visualizações", inicio: "1–6 h", conclusao: "1–5 dias" },
    { servico: "Curtidas", inicio: "30 min–2 h", conclusao: "2–24 h" },
  ],
  kwai: [
    { servico: "Seguidores", inicio: "30 min–2 h", conclusao: "6–48 h" },
    { servico: "Curtidas / Views", inicio: "15 min–1 h", conclusao: "1–12 h" },
  ],
  twitter: [
    { servico: "Seguidores", inicio: "30 min–2 h", conclusao: "6–48 h" },
    { servico: "Curtidas / Retweets", inicio: "15 min–1 h", conclusao: "1–12 h" },
  ],
  generic: [
    { servico: "Início do processamento", inicio: "até 60 min", conclusao: "—" },
    { servico: "Conclusão média", inicio: "—", conclusao: "2–24 h (até 48 h em pacotes grandes)" },
  ],
};

export function DeliveryTimes({ rede = "generic", accent = "#22c55e" }: { rede?: RedeKey; accent?: string }) {
  const rows = TABELA[rede] ?? TABELA.generic;
  return (
    <section className="mt-8">
      <div
        className="rounded-2xl p-5 sm:p-6"
        style={{ background: "#0f0f0f", border: `1px solid ${accent}55` }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-5 h-5" style={{ color: accent }} />
          <h2 className="text-lg sm:text-xl font-black text-white">Prazos reais de entrega</h2>
        </div>
        <p className="text-zinc-400 text-sm mb-4 leading-relaxed">
          A gente <span className="text-white font-semibold">não promete entrega instantânea</span> porque
          as redes limitam a velocidade pra proteger sua conta. Abaixo os prazos que praticamos de verdade —
          confirmados nos últimos 30 dias com nossos 3 fornecedores.
        </p>

        <div className="overflow-x-auto -mx-1 px-1">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="text-left text-zinc-500 border-b border-white/10">
                <th className="py-2 pr-3 font-semibold">Serviço</th>
                <th className="py-2 pr-3 font-semibold">Início</th>
                <th className="py-2 font-semibold">Conclusão</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.servico} className="border-b border-white/5">
                  <td className="py-2 pr-3 text-white font-medium">{r.servico}</td>
                  <td className="py-2 pr-3 text-zinc-300">{r.inicio}</td>
                  <td className="py-2 text-zinc-300">{r.conclusao}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex gap-2 items-start text-[11px] sm:text-xs text-zinc-500 leading-relaxed">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: accent }} />
          <p>
            Se o seu pedido passar de <span className="text-white">48 h</span> sem completar,
            reembolsamos automaticamente até R$ 50 ou reprocessamos por outro fornecedor.
            Fale com a gente pelo WhatsApp em qualquer momento.
          </p>
        </div>
      </div>
    </section>
  );
}
