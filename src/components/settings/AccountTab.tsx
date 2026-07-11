// AccountTab — dados da própria conta: nome, foto, e-mail e senha de login.
// Diferente das abas irmãs (Loja/Equipe/Funil), não opera sobre dados do
// tenant — é sempre sobre a própria sessão autenticada — por isso resolve o
// usuário atual internamente via useCrm() em vez de receber tenant/dispatch
// por props. Nome/foto vão via api.updateMe/uploadAvatar + refreshCrmData;
// senha/e-mail vão via Supabase Auth direto.

import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, api, mapUser } from "@/lib/apiClient";
import { currentUser } from "@/lib/selectors";
import { supabase } from "@/lib/supabaseClient";
import { useCrm } from "@/lib/store";

// Mesmo valor do MAX_AVATAR_BYTES em app/modules/users/service.py — divergir
// aqui faz uma foto "menor que 2MB" na tela ser rejeitada pelo backend.
const MAX_AVATAR_BYTES = 2_000_000;

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

// Fotos de iPhone vêm em HEIC por padrão — nem o backend aceita esse
// Content-Type (ALLOWED_AVATAR_TYPES não inclui heic/heif) nem a maioria dos
// navegadores (fora Safari) renderiza um <img src> HEIC, então aceitar o
// arquivo cru deixaria o avatar "quebrado" pra quase todo mundo que vir a
// foto depois. Convertemos pra JPEG no navegador antes de enviar.
function isHeicFile(file: File): boolean {
  const type = file.type.toLowerCase();
  if (type === "image/heic" || type === "image/heif") return true;
  return /\.(heic|heif)$/i.test(file.name);
}

async function toUploadableImage(file: File): Promise<File> {
  if (!isHeicFile(file)) return file;

  const heic2any = (await import("heic2any")).default;
  const converted = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
  const jpegBlob = Array.isArray(converted) ? converted[0] : converted;
  const jpegName = file.name.replace(/\.(heic|heif)$/i, "") + ".jpg";
  return new File([jpegBlob], jpegName, { type: "image/jpeg" });
}

export function AccountTab() {
  const { state, dispatch } = useCrm();
  const me = currentUser(state);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(me?.name ?? "");
  const [nameError, setNameError] = useState("");
  const [nameLoading, setNameLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);

  async function handleNameSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNameError("");

    if (!name.trim()) {
      setNameError("Informe seu nome.");
      return;
    }
    if (!me) return;

    setNameLoading(true);
    try {
      const updated = await api.updateMe(name.trim());
      dispatch({ type: "UPDATE_USER", user: mapUser(updated) });
      toast.success("Nome atualizado.");
    } catch (error) {
      setNameError(error instanceof ApiError ? error.message : "Não foi possível atualizar o nome.");
    } finally {
      setNameLoading(false);
    }
  }

  async function handleAvatarSelected(event: ChangeEvent<HTMLInputElement>) {
    const rawFile = event.target.files?.[0];
    event.target.value = "";
    if (!rawFile || !me) return;

    setAvatarLoading(true);
    try {
      const file = await toUploadableImage(rawFile);

      if (file.size > MAX_AVATAR_BYTES) {
        toast.error("Imagem maior que 2MB. Escolha uma imagem menor.");
        return;
      }

      const updated = await api.uploadAvatar(file);
      dispatch({ type: "UPDATE_USER", user: mapUser(updated) });
      toast.success("Foto atualizada.");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Não foi possível processar essa imagem. Tente novamente ou use outro formato.");
    } finally {
      setAvatarLoading(false);
    }
  }

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
        <h2 className="text-sm font-medium text-foreground">Perfil</h2>
        <div className="flex items-center gap-4">
          <Avatar size="lg">
            {me?.avatarUrl && <AvatarImage src={me.avatarUrl} alt={me.name} />}
            <AvatarFallback style={{ backgroundColor: me?.avatarColor, color: "#fff" }}>
              {me ? initials(me.name) : ""}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-1.5">
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*,.heic,.heif"
              className="hidden"
              onChange={handleAvatarSelected}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit"
              disabled={avatarLoading}
              onClick={() => avatarInputRef.current?.click()}
            >
              {avatarLoading ? "Enviando…" : "Trocar foto"}
            </Button>
            <p className="text-xs text-muted-foreground">Imagem até 2MB.</p>
          </div>
        </div>
        <form onSubmit={handleNameSubmit} className="flex flex-col gap-4 sm:max-w-sm">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="account-name">Nome</Label>
            <Input
              id="account-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-invalid={!!nameError}
            />
          </div>
          {nameError && <p className="text-xs text-destructive">{nameError}</p>}
          <Button type="submit" className="w-fit" disabled={nameLoading}>
            {nameLoading ? "Salvando…" : "Salvar nome"}
          </Button>
        </form>
      </div>

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
