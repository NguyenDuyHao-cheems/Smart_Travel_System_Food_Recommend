"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { setTheme, theme } = useTheme();

  return (
    <button
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      className="relative flex items-center justify-center p-2.5 text-slate-500 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 dark:border-white/10 rounded-full transition-colors overflow-hidden border border-slate-900/10"
      title="Toggle theme"
    >
      <Sun className="h-5 w-5 scale-100 dark:scale-0 transition-transform duration-300 absolute" />
      <Moon className="h-5 w-5 scale-0 dark:scale-100 transition-transform duration-300" />
      <span className="sr-only">Toggle theme</span>
    </button>
  );
}
