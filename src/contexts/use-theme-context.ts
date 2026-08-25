import {
  createContext,
  useContext,
  type Dispatch,
  type SetStateAction,
} from "react";

export type ThemeContextType = {
  theme: "light" | "dark";
  setTheme: Dispatch<SetStateAction<"dark" | "light">>;
};

export const themeContext = createContext<ThemeContextType | null>(null);

export const useThemeContext = () => {
  const ctx = useContext(themeContext);
  if (!ctx) {
    throw new Error("Theme context is used outside of it's provider.");
  }
  return ctx;
};
