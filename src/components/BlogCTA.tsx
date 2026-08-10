import React from "react";
import { Link } from "@tanstack/react-router";

interface BlogCTAProps {
  title: string;
  description: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  accent?: string;
}

/**
 * v605 — Conversão em Massa (Blog).
 * Componente injetável para capturar tráfego orgânico e converter em checkout.
 */
export const BlogCTA: React.FC<BlogCTAProps> = ({
  title,
  description,
  primaryLabel,
  primaryHref,
  secondaryLabel,
  secondaryHref,
  accent = "amber-500",
}) => {
  return (
    <div className={`my-10 rounded-2xl p-8 bg-zinc-900 border border-${accent}/20 relative overflow-hidden group`}>
      <div className={`absolute top-0 right-0 w-32 h-32 bg-${accent}/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-${accent}/10 transition-colors`} />
      
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-3">
          <span className={`w-2 h-2 rounded-full bg-${accent} animate-pulse`} />
          <span className={`text-${accent} text-xs font-black uppercase tracking-widest`}>Oportunidade Premium</span>
        </div>
        
        <h3 className="text-2xl font-black text-white mb-3 tracking-tight">{title}</h3>
        <p className="text-zinc-400 text-base mb-6 leading-relaxed max-w-xl">
          {description}
        </p>
        
        <div className="flex flex-wrap gap-4">
          <Link 
            to={primaryHref as any} 
            className={`rounded-xl px-7 py-4 bg-${accent} text-black font-black text-sm hover:scale-105 active:scale-95 transition-all shadow-lg shadow-${accent}/20`}
          >
            {primaryLabel}
          </Link>
          
          {secondaryLabel && secondaryHref && (
            <Link 
              to={secondaryHref as any} 
              className="rounded-xl px-7 py-4 bg-zinc-800 text-white font-bold text-sm hover:bg-zinc-700 active:scale-95 transition-all"
            >
              {secondaryLabel}
            </Link>
          )}
        </div>
      </div>
      
      <div className="mt-6 pt-6 border-t border-zinc-800/50 flex items-center justify-between text-[10px] text-zinc-500 font-bold uppercase tracking-tighter">
        <span>Entrega Automática via Pix</span>
        <span>•</span>
        <span>Garantia de Reposição 30d</span>
        <span>•</span>
        <span>Sem Senha</span>
      </div>
    </div>
  );
};
