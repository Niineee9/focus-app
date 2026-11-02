import { useState } from "react";
import { Loader2, PlugZap, ShieldCheck } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Logo } from "./Logo";

/** Primera pantalla: pegar el connection string de Neon. */
export function Setup({ today, previousError }: { today: string; previousError: string | null }) {
  const qc = useQueryClient();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(previousError);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const server = await api.connect(url, today);
      qc.setQueryData(["status"], { configured: true, server, error: null });
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-full items-center justify-center p-4">
      <form
        onSubmit={submit}
        className="flex w-full max-w-lg flex-col gap-5 rounded-2xl border border-line bg-surface p-6 shadow-sm"
      >
        <Logo />
        <div>
          <h1 className="text-lg font-semibold">Conecta tu base de datos</h1>
          <p className="mt-1 text-sm text-ink-2">
            Focus guarda tus hábitos en tu propio Postgres de <span className="font-medium text-ink">Neon</span>,
            así se sincronizan entre el PC y el móvil.
          </p>
        </div>

        <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm text-ink-2">
          <li>Entra en console.neon.tech y abre tu proyecto.</li>
          <li>
            Pulsa <span className="font-medium text-ink">Connect</span> y copia el connection string.
          </li>
          <li>Pégalo aquí. Las tablas se crean solas.</li>
        </ol>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold tracking-wide text-ink-2 uppercase">Connection string</span>
          <textarea
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="postgresql://usuario:contraseña@ep-xxxx.neon.tech/neondb?sslmode=require"
            rows={3}
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            className="resize-none rounded-xl border border-line bg-surface-2 p-3 font-mono text-xs break-all outline-none focus:border-accent"
          />
        </label>

        {error && (
          <p role="alert" className="rounded-lg bg-critical/10 p-3 text-sm text-critical">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy || !url.trim()}
          className="flex h-11 items-center justify-center gap-2 rounded-xl bg-accent font-medium text-white transition hover:brightness-110 disabled:opacity-50"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <PlugZap className="size-4" />}
          {busy ? "Conectando…" : "Conectar"}
        </button>

        <p className="flex items-start gap-2 text-xs text-muted">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" />
          El connection string se guarda solo en este dispositivo. No forma parte del código ni del instalador.
        </p>
      </form>
    </main>
  );
}
