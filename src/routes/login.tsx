import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { verifyAdminToken } from "@/lib/admin-auth.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const ADMIN_SESSION_KEY = "eliteboost_prime_admin_session";

export const Route = createFileRoute("/login")({
  ssr: false,
  head: () => ({ meta: [{ title: "Login · Admin" }, { name: "robots", content: "noindex,nofollow" }] }),
  beforeLoad: () => {
    if (typeof window !== "undefined" && window.localStorage.getItem(ADMIN_SESSION_KEY) === "1") {
      throw redirect({ to: "/admin" });
    }
  },
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const verify = useServerFn(verifyAdminToken);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;
    setLoading(true);
    try {
      const res = await verify({ data: { token: token.trim() } });
      if (res.ok) {
        window.localStorage.setItem(ADMIN_SESSION_KEY, "1");
        window.localStorage.setItem("eliteboost_prime_admin_token", token.trim());
        toast.success("Acesso autorizado");
        navigate({ to: "/admin" });
      } else {
        toast.error("Token inválido");
      }
    } catch {
      toast.error("Falha ao validar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dark min-h-screen flex items-center justify-center bg-background text-foreground p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 border border-border rounded-lg p-6 bg-card">
        <div>
          <h1 className="text-xl font-bold">🔐 Login Admin</h1>
          <p className="text-sm text-muted-foreground">Acesso restrito · BoostGG</p>
        </div>
        <Input
          type="password"
          placeholder="ADMIN_TOKEN"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          autoFocus
        />
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Validando..." : "Entrar"}
        </Button>
      </form>
    </div>
  );
}
