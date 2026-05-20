import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Theme = "light" | "dark";
export type Palette = "forest" | "ocean" | "sunset" | "galaxy" | "crimson";

type Ctx = {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
  palette: Palette;
  setPalette: (p: Palette) => void;
};

const ThemeCtx = createContext<Ctx | null>(null);

const metaColors: Record<Palette, { light: string; dark: string }> = {
  forest:  { light: "#2d8a4e", dark: "#0f1a14" },
  ocean:   { light: "#1e6aad", dark: "#0a1220" },
  sunset:  { light: "#d4681a", dark: "#1a0d07" },
  galaxy:  { light: "#7b2fd4", dark: "#100820" },
  crimson: { light: "#c41a2a", dark: "#150508" },
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [palette, setPaletteState] = useState<Palette>("forest");

  useEffect(() => {
    const savedTheme = (typeof window !== "undefined" && (localStorage.getItem("theme") as Theme)) || null;
    const savedPalette = (typeof window !== "undefined" && (localStorage.getItem("palette") as Palette)) || null;
    setThemeState(savedTheme ?? "dark");
    setPaletteState(savedPalette ?? "forest");
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    if (palette === "forest") root.removeAttribute("data-palette");
    else root.setAttribute("data-palette", palette);
    const meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
    if (meta) meta.content = metaColors[palette][theme];
  }, [theme, palette]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    if (typeof window !== "undefined") localStorage.setItem("theme", t);
  };

  const setPalette = (p: Palette) => {
    setPaletteState(p);
    if (typeof window !== "undefined") localStorage.setItem("palette", p);
  };

  return (
    <ThemeCtx.Provider value={{ theme, setTheme, toggle: () => setTheme(theme === "dark" ? "light" : "dark"), palette, setPalette }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export function useTheme() {
  const c = useContext(ThemeCtx);
  if (!c) throw new Error("useTheme outside provider");
  return c;
}
