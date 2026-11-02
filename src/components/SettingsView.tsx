import { useState } from "react";
import { Database, Loader2, LogOut, ShieldCheck } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { api, type ServerInfo } from "../lib/api";

export function SettingsView({ server }: { server: ServerInfo }) {
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  async function disconnect() {
    setBusy(true);
    await api.disconnect();
    qc.clear();
    qc.setQueryData(["status"], { configured: false, server: null, error: null });
  }

  return (
    <div className="flex max-w-xl flex-col gap-5 pb-6">
      <h1 className="text-2xl font-bold tracking-tight lg:text-[26px]">Ajustes</h1>

      <section className="flex flex-col gap-4 rounded-2xl border border-ring bg-surface p-5 shadow-sm">
        <h2 className="font-semibold">Base de datos</h2>
        <div className="flex items-center gap-3 rounded-xl bg-good/10 p-4">
          <Database className="size-6 shrink-0 text-good" />
          <div className="min-w-0">
            <p className="font-semibold">Conectado a {server.database}</p>
            <p className="truncate text-sm text-ink-2">{server.host}</p>
            <p className="text-xs text-muted">PostgreSQL {server.version}</p>
          </div>
        </div>
        <p className="flex items-start gap-2 text-xs text-muted">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" />
          El connection string está guardado solo en este dispositivo. Al cambiar de base de datos se olvida aquí,
          pero tus datos en Neon no se borran.
        </p>
        {confirm ? (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={disconnect}
              disabled={busy}
              className="flex h-10 items-center gap-2 rounded-xl bg-critical px-4 text-sm font-medium text-white"
            >
              {busy && <Loader2 className="size-4 animate-spin" />}
              Sí, cambiar base de datos
            </button>
            <button onClick={() => setConfirm(false)} className="h-10 rounded-xl border border-line px-4 text-sm font-medium">
              Cancelar
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirm(true)}
            className="flex h-10 w-fit items-center gap-2 rounded-xl border border-line px-4 text-sm font-medium text-ink-2 hover:bg-surface-2"
          >
            <LogOut className="size-4" /> Cambiar base de datos
          </button>
        )}
      </section>

      <p className="text-xs text-muted">Focus v0.1.0</p>
    </div>
  );
}
