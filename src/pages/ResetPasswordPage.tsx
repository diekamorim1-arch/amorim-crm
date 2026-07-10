// ResetPasswordPage — destino do link de recuperação de senha enviado por
// supabase.auth.resetPasswordForEmail. O supabase-js detecta o token na URL
// (detectSessionInUrl, ligado por padrão) e estabelece uma sessão de
// recuperação temporária sozinho antes deste componente montar; daqui só
// chamamos updateUser com a nova senha.

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

export function ResetPasswordPage() {
  const { theme } = useTheme();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError("Não foi possível redefinir a senha. O link pode ter expirado — solicite um novo.");
      return;
    }

    toast.success("Senha redefinida com sucesso. Faça login com a nova senha.");
    navigate("/login", { replace: true });
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-10 bg-background px-4 py-12">
      <div className="flex flex-col items-center gap-3">
        <img
          src={theme === "dark" ? amorimMarkWhite : amorimMarkBlack}
          alt="Amorim CRM"
          className="h-10 w-auto"
        />
        <h1 className="font-display text-xl font-semibold tracking-[-0.02em] text-foreground">Amorim CRM</h1>
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="font-display">Redefinir senha</CardTitle>
          <CardDescription>Escolha uma nova senha para sua conta.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="new-password">Nova senha</Label>
              <Input
                id="new-password"
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-invalid={!!error}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="confirm-password">Confirmar nova senha</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                aria-invalid={!!error}
              />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button type="submit" className="mt-2" disabled={loading}>
              {loading ? "Salvando…" : "Redefinir senha"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
