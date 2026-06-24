import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        card: "var(--surface)",
        border: "var(--border)",
        foreground: "var(--text-primary)",
        textSecondary: "var(--text-secondary)",
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "#ffffff",
        },
        success: {
          DEFAULT: "var(--success)",
          foreground: "#ffffff",
        },
        warning: "var(--warning)",
        critical: "var(--critical)",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
