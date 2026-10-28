"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

type Mode = "system" | "light" | "dark";
const NEXT: Record<Mode, Mode> = { system: "light", light: "dark", dark: "system" };
const LABEL: Record<Mode, string> = { system: "Theme: system", light: "Theme: light", dark: "Theme: dark" };

/** Cycles system → light → dark. The choice is stored and applied before paint by the root layout. */
export function ThemeToggle() {
  const [mode, setMode] = useState<Mode>("system");
  useEffect(() => {
    try {
      const saved = localStorage.getItem("saajha-theme") as Mode | null;
      if (saved === "light" || saved === "dark") setMode(saved);
    } catch {}
  }, []);

  function cycle() {
    const next = NEXT[mode];
    setMode(next);
    try {
      if (next === "system") {
        localStorage.removeItem("saajha-theme");
        delete document.documentElement.dataset.theme;
      } else {
        localStorage.setItem("saajha-theme", next);
        document.documentElement.dataset.theme = next;
      }
    } catch {}
  }

  const Icon = mode === "light" ? Sun : mode === "dark" ? Moon : Monitor;
  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`${LABEL[mode]}. Switch to ${NEXT[mode]}.`}
      title={LABEL[mode]}
      className="grid size-11 place-items-center rounded-full border border-rule bg-card text-ink transition-[border-color,transform] duration-150 hover:border-subtle active:scale-[0.97]"
    >
      <Icon className="size-[18px]" aria-hidden />
    </button>
  );
}
