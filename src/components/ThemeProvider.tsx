import { useEffect, useState, type PropsWithChildren } from "react";
import { themeContext } from "@/contexts/use-theme-context";

const ThemeProvider = ({ children }: PropsWithChildren) => {
  const [theme, setTheme] = useState<"dark" | "light" | null>(null);

  useEffect(() => {
    const storedTheme = localStorage.getItem("theme") as
      | "dark"
      | "light"
      | null;

    if (storedTheme) {
      setTheme(storedTheme);
    }
  }, []);

  useEffect(() => {
    if (!theme) return;

    const body = document.body;
    body.classList.remove(theme === "dark" ? "light" : "dark");
    body.classList.add(theme === "dark" ? "dark" : "light");

    localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <themeContext.Provider
      value={{
        theme,
        setTheme,
      }}
    >
      {children}
    </themeContext.Provider>
  );
};

export default ThemeProvider;
