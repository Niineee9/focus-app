import { useSyncExternalStore } from "react";

// Paleta categórica validada (orden fijo; el color sigue a la categoría).
// Se guarda el tono claro; en modo oscuro se muestra su paso oscuro.
export const PALETTE: { name: string; light: string; dark: string }[] = [
  { name: "Azul", light: "#2a78d6", dark: "#3987e5" },
  { name: "Naranja", light: "#eb6834", dark: "#d95926" },
  { name: "Aqua", light: "#1baf7a", dark: "#199e70" },
  { name: "Amarillo", light: "#eda100", dark: "#c98500" },
  { name: "Magenta", light: "#e87ba4", dark: "#d55181" },
  { name: "Verde", light: "#008300", dark: "#008300" },
  { name: "Violeta", light: "#6250d6", dark: "#9085e9" },
  { name: "Rojo", light: "#e34948", dark: "#e66767" },
];

const media = window.matchMedia("(prefers-color-scheme: dark)");
const subscribe = (cb: () => void) => {
  media.addEventListener("change", cb);
  return () => media.removeEventListener("change", cb);
};

/** Devuelve una función que traduce el color guardado al tono del tema actual. */
export function useShade() {
  const dark = useSyncExternalStore(subscribe, () => media.matches);
  return (hex: string) => {
    const entry = PALETTE.find((p) => p.light.toLowerCase() === hex.toLowerCase());
    return entry ? (dark ? entry.dark : entry.light) : hex;
  };
}

/** Mezcla un color con transparente: `tint(c, 15)` = 15 % de opacidad. */
export const tint = (color: string, percent: number) =>
  `color-mix(in srgb, ${color} ${percent}%, transparent)`;
