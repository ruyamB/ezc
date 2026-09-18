"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Sun, Moon } from "@phosphor-icons/react";

type Theme = "light" | "dark";

const ThemeCtx = createContext<{ theme: Theme; toggle: () => void }>({ theme: "light", toggle: () => {} });

const LS_KEY = "ezc-theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  const toggle = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem(LS_KEY, theme);
    } catch {
      /* private mode */
    }
  }, [theme]);

  return <ThemeCtx.Provider value={{ theme, toggle }}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  return useContext(ThemeCtx);
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";
  return (
    <button
      onClick={toggle}
      aria-label={dark ? "Switch to day mode" : "Switch to night mode"}
      title={dark ? "Switch to day mode" : "Switch to night mode"}
      className={`flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-inksoft transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-ink/30 hover:text-ink active:scale-[0.96] dark:border-white/10 dark:bg-white/5 dark:text-fog dark:hover:border-white/25 dark:hover:text-mist ${className}`}
    >
      {dark ? <Sun size={18} weight="light" /> : <Moon size={18} weight="light" />}
    </button>
  );
}
