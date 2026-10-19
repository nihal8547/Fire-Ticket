import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "hsl(var(--brand))",
          mid:   "hsl(var(--brand-mid))",
          light: "hsl(var(--brand-light))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          hover:  "hsl(var(--accent-hover))",
        },
        surface: {
          DEFAULT: "hsl(var(--surface))",
          2:      "hsl(var(--surface-2))",
          3:      "hsl(var(--surface-3))",
        },
        border: {
          DEFAULT: "hsl(var(--border))",
          strong: "hsl(var(--border-strong))",
        },
        tx: {
          DEFAULT: "hsl(var(--text))",
          2:      "hsl(var(--text-2))",
          3:      "hsl(var(--text-3))",
          inv:    "hsl(var(--text-inv))",
        },
        bg: "hsl(var(--bg))",
        // keep backward-compat aliases
        primary: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "#ffffff",
        },
      },
      borderRadius: {
        DEFAULT: "var(--radius)",
        lg:     "var(--radius-lg)",
        xl:     "var(--radius-xl)",
        "2xl":  "1rem",
        "3xl":  "1.5rem",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        DEFAULT: "var(--shadow)",
        lg:  "var(--shadow-lg)",
        xl:  "var(--shadow-xl)",
      },
      backgroundImage: {
        "gradient-brand": "linear-gradient(135deg, hsl(var(--brand)) 0%, hsl(var(--accent)) 100%)",
        "gradient-page":  "linear-gradient(135deg, hsl(220 25% 10%) 0%, hsl(0 40% 15%) 50%, hsl(220 25% 10%) 100%)",
      },
      transitionTimingFunction: {
        smooth: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
      animation: {
        "fade-in":   "fade-in 200ms ease both",
        "slide-up":  "slide-up 250ms ease both",
        "pulse-soft":"pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      keyframes: {
        "fade-in":  { from: { opacity: "0", transform: "translateY(4px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        "slide-up": { from: { opacity: "0", transform: "translateY(12px)" }, to: { opacity: "1", transform: "translateY(0)" } },
      },
    },
  },
  plugins: [],
};

export default config;
