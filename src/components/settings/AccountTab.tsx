// AccountTab — troca de senha e de e-mail de login da própria conta, via
// Supabase Auth (supabase.auth.updateUser). Diferente das abas irmãs
// (Loja/Equipe/Funil), não opera sobre dados do tenant — é sempre sobre a
// própria sessão autenticada — por isso resolve o usuário atual internamente
// via useCrm() em vez de receber tenant/dispatch por props.

import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { currentUser } from "@/lib/selectors";
import { supabase } from "@/lib/supabaseClient";
import { useCrm } from "@/lib/store";

export function AccountTab() {
  const { state } = useCrm();
  const me = currentUser(state);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError("");

    if (newPassword.length < 6) {
      setPasswordError("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("As senhas não coincidem.");
      return;
    }

    setPasswordLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordLoading(false);

    if (error) {
      setPasswordError("Não foi possível trocar a senha. Tente novamente.");
      return;
    }
    toast.success("Senha atualizada.");
    setNewPassword("");
    setConfirmPassword("");
  }

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEmailError("");

    if (!newEmail.trim()) {
      setEmailError("Informe o novo e-mail.");
      return;
    }

    setEmailLoading(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
    setEmailLoading(false);

    if (error) {
      setEmailError("Não foi possível trocar o e-mail. Tente novamente.");
      return;
    }
    toast.success("Enviamos um e-mail de confirmação para o novo endereço — a troca só vale depois de confirmada.");
    setNewEmail("");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-sm font-medium text-foreground">Trocar senha</h2>
          <p className="text-xs text-muted-foreground">
            {me ? `Conectado como ${me.email}.` : ""}
          </p>
        </div>
        <form onSubmit={handlePasswordSubmit} className="flex flex-col gap-4 sm:max-w-sm">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="account-new-password">Nova senha</Label>
            <Input
              id="account-new-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              aria-invalid={!!passwordError}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="account-confirm-password">Confirmar nova senha</Label>
            <Input
              id="account-confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              aria-invalid={!!passwordError}
            />
          </div>
          {passwordError && <p className="text-xs text-destructive">{passwordError}</p>}
          <Button type="submit" className="w-fit" disabled={passwordLoading}>
            {passwordLoading ? "Salvando…" : "Trocar senha"}
          </Button>
        </form>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-medium text-foreground">Trocar e-mail de login</h2>
        <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4 sm:max-w-sm">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="account-new-email">Novo e-mail</Label>
            <Input
              id="account-new-email"
              type="email"
              placeholder="novo@email.com"
              autoComplete="email"
              value={newEmail}
              onChange={(event) => setNewEmail(event.target.value)}
              aria-invalid={!!emailError}
            />
          </div>
          {emailError && <p className="text-xs text-destructive">{emailError}</p>}
          <Button type="submit" className="w-fit" disabled={emailLoading}>
            {emailLoading ? "Enviando…" : "Trocar e-mail"}
          </Button>
        </form>
      </div>
    </div>
  );
}
