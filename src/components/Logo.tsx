import { X } from "lucide-react";

export function Logo() {
  return (
    <div className="flex items-center gap-2.5 text-xl font-bold">
      <span className="grid size-9 place-items-center rounded-xl bg-accent text-white">
        <X className="size-5" strokeWidth={3} />
      </span>
      Focus
    </div>
  );
}
