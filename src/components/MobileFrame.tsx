import type { ReactNode } from "react";

export function MobileFrame({
  bg = "#0a0a0a",
  children,
}: {
  bg?: string;
  children: ReactNode;
}) {
  return (
    <div
      className="min-h-screen flex justify-center"
      style={{ background: "#050505" }}
    >
      <div
        className="w-full max-w-[450px] min-h-screen text-white shadow-[0_0_60px_rgba(0,0,0,0.95)] relative pb-20 overflow-x-hidden"
        style={{ background: bg }}
      >
        {children}
      </div>
    </div>
  );
}
