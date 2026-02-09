// src/components/ui/theme-toggle.tsx
import { Moon, Sun } from "lucide-react";
import { Button } from "./button";
import { useThemeStore } from "@/stores/theme-store";

export function ThemeToggle() {
  const { theme, setTheme } = useThemeStore();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Dark</span>
    </Button>
  );
}
