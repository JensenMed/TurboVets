import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useTheme } from "@/contexts/theme-context";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleTheme}
          data-testid="button-theme-toggle"
          className="w-9 h-9 p-0 hover:bg-accent hover:text-accent-foreground transition-all duration-200"
        >
          {theme === "light" ? (
            <Sun className="h-4 w-4 transition-transform duration-200 hover:rotate-12" />
          ) : (
            <Moon className="h-4 w-4 transition-transform duration-200 hover:-rotate-12" />
          )}
          <span className="sr-only">Toggle theme</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Switch to {theme === "light" ? "dark" : "light"} mode</p>
      </TooltipContent>
    </Tooltip>
  );
}