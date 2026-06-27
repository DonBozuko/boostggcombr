import { useEffect, useState } from "react";

const URL_BLOCK_PATTERNS = [/\.\.\//, /<script/i, /javascript:/i, /onerror=/i, /union\s+select/i, /%3Cscript/i];

function isMalicious(): boolean {
  if (typeof window === "undefined") return false;
  const url = window.location.href;
  if (URL_BLOCK_PATTERNS.some((r) => r.test(url))) return true;
  // DevTools heuristic: huge window vs inner size
  const threshold = 200;
  if (window.outerWidth - window.innerWidth > threshold || window.outerHeight - window.innerHeight > threshold) {
    return true;
  }
  return false;
}

export function CyberDeceptionShield() {
  const [tripped, setTripped] = useState(false);
  const [ip, setIp] = useState("0.0.0.0");

  useEffect(() => {
    if (typeof window === "undefined") return;
    let strikes = Number(sessionStorage.getItem("eb_strikes") ?? "0");

    const check = () => {
      if (isMalicious()) {
        strikes += 1;
        sessionStorage.setItem("eb_strikes", String(strikes));
        if (strikes >= 2) trip();
      }
    };

    const trip = () => {
      setTripped(true);
      try {
        fetch("https://api.ipify.org?format=json")
          .then((r) => r.json())
          .then((d) => setIp(d.ip ?? "0.0.0.0"))
          .catch(() => {});
      } catch {}
      // Lock scroll & disable interaction beneath
      document.body.style.overflow = "hidden";
    };

    check();
    const id = window.setInterval(check, 1500);
    window.addEventListener("eb-brand-violation", trip as EventListener);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("eb-brand-violation", trip as EventListener);
    };
  }, []);

  if (!tripped) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      className="fixed inset-0 z-[99999] bg-black text-red-500 font-mono flex items-center justify-center p-6 overflow-auto"
      style={{ backgroundImage: "radial-gradient(circle at center, rgba(255,0,40,0.18), #000 70%)" }}
    >
      <style>{`
        @keyframes eb-glitch { 0%,100%{transform:translate(0)} 20%{transform:translate(-2px,1px)} 40%{transform:translate(2px,-1px)} 60%{transform:translate(-1px,-2px)} 80%{transform:translate(1px,2px)} }
        @keyframes eb-scan { 0%{background-position:0 0} 100%{background-position:0 100%} }
        .eb-shield { animation: eb-glitch 0.35s infinite; text-shadow: 0 0 12px #ff0028, 0 0 4px #fff; }
        .eb-scanlines::before { content:""; position:absolute; inset:0; background:repeating-linear-gradient(0deg, rgba(255,0,40,0.06) 0 2px, transparent 2px 4px); animation: eb-scan 6s linear infinite; pointer-events:none; }
      `}</style>
      <div className="relative max-w-2xl w-full border-2 border-red-600 bg-black/80 backdrop-blur-xl p-6 sm:p-10 eb-scanlines shadow-[0_0_60px_rgba(255,0,40,0.7)]">
        <div className="text-center eb-shield">
          <div className="text-6xl sm:text-8xl font-extrabold tracking-widest">⚠ 403</div>
          <div className="mt-2 text-xs sm:text-sm uppercase tracking-[0.4em] text-red-300">
            J.A.R.V.I.S. SECURITY CORE · ELITEBOOST PRIME
          </div>
        </div>

        <div className="mt-6 space-y-2 text-[12px] sm:text-sm text-red-200 leading-relaxed">
          <p>&gt; INTRUSION DETECTED · BRAND GUARD TRIGGERED</p>
          <p>&gt; Tentativa de engenharia reversa / manipulação maliciosa identificada.</p>
          <p>&gt; IP do invasor: <span className="text-white font-bold">{ip}</span></p>
          <p>&gt; Timestamp: <span className="text-white">{new Date().toISOString()}</span></p>
          <p>&gt; User-Agent registrado, fingerprint gerado e enviado ao núcleo jurídico.</p>
          <p className="text-amber-300">
            &gt; Esta atividade viola o Art. 154-A do Código Penal Brasileiro (Lei nº 12.737/2012)
            e configura invasão de dispositivo informático. Auditoria judicial em andamento.
          </p>
          <p className="text-red-400 font-bold mt-3">&gt; ACESSO BLOQUEADO PERMANENTEMENTE.</p>
        </div>

        <div className="mt-6 flex items-center gap-3 justify-center">
          <span className="inline-block h-3 w-3 rounded-full bg-red-500 animate-pulse shadow-[0_0_12px_#ff0028]" />
          <span className="text-[11px] uppercase tracking-[0.3em] text-red-300">Container isolado · sessão neutralizada</span>
        </div>
      </div>
    </div>
  );
}
