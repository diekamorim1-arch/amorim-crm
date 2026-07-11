// LoginPage — autenticação real via Supabase Auth (signInWithPassword) +
// recuperação de senha (resetPasswordForEmail).

import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

import amorimMarkBlack from "@/assets/amorim-mark-black.png";
import amorimMarkWhite from "@/assets/amorim-mark-white.png";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabaseClient";
import { useTheme } from "@/lib/theme";

export function LoginPage() {
  const { theme } = useTheme();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Informe e-mail e senha.");
      return;
    }

    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);

    if (signInError) {
      setError("E-mail ou senha incorretos.");
      return;
    }

    navigate("/", { replace: true });
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      setError("Informe seu e-mail acima antes de clicar em \"Esqueci minha senha\".");
      return;
    }
    setError("");
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });
    if (resetError) {
      toast.error("Não foi possível enviar o e-mail de redefinição. Tente novamente.");
      return;
    }
    toast.success("Se esse e-mail estiver cadastrado, você vai receber um link para redefinir a senha.");
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-10 bg-background px-4 py-12">
      <div className="flex flex-col items-center gap-3">
        <img
          src={theme === "dark" ? amorimMarkWhite : amorimMarkBlack}
          alt="Amorim CRM"
          className="h-10 w-auto"
        />
        <h1 className="font-display text-xl font-semibold tracking-[-0.02em] text-foreground">
          Amorim CRM
        </h1>
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="font-display">Entrar</CardTitle>
          <CardDescription>Acesse com seu e-mail e senha.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="voce@sualoja.com.br"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-invalid={!!error}
              />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button type="submit" className="mt-2" disabled={loading}>
              {loading ? "Entrando…" : "Entrar"}
            </Button>
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-left text-xs text-muted-foreground underline-offset-2 hover:underline"
            >
              Esqueci minha senha
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
