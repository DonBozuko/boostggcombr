/**
 * Captura o último erro real lançado no runtime do servidor.
 *
 * O h3 engole o erro original do SSR e devolve só um corpo genérico, então
 * interceptamos console.error e rejeições não tratadas para preservar a causa
 * real e exibi-la nos logs (ver src/server.ts).
 */

let lastCapturedError: unknown;

function record(err: unknown) {
  if (err instanceof Error) lastCapturedError = err;
}

export function consumeLastCapturedError(): unknown {
  const err = lastCapturedError;
  lastCapturedError = undefined;
  return err;
}

const globalScope = globalThis as typeof globalThis & {
  __ebpErrorCaptureInstalled?: boolean;
};

if (!globalScope.__ebpErrorCaptureInstalled) {
  globalScope.__ebpErrorCaptureInstalled = true;

  const originalConsoleError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    for (const arg of args) record(arg);
    originalConsoleError(...(args as []));
  };

  try {
    globalThis.addEventListener?.("unhandledrejection", (event: unknown) => {
      record((event as { reason?: unknown })?.reason);
    });
    globalThis.addEventListener?.("error", (event: unknown) => {
      record((event as { error?: unknown })?.error);
    });
  } catch {}
}
