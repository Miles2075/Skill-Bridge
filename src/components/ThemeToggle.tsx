import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

function getSavedTheme() {
  if (typeof window === "undefined") return "light";
  return localStorage.getItem("skillbridge-theme") === "dark" ? "dark" : "light";
}

export function ThemeToggle() {
  const [dark, setDark] = useState(() => getSavedTheme() === "dark");

  useEffect(() => {
    // Settings must never change the theme just by being opened.
    // Only the saved choice (or the button below) controls the theme.
    const saved = getSavedTheme();
    document.documentElement.classList.toggle("dark", saved === "dark");
    setDark(saved === "dark");
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("skillbridge-theme", next ? "dark" : "light");
    setDark(next);
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
    >
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
      {dark ? "Light Theme" : "Dark Theme"}
    </button>
  );
}
