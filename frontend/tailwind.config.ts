import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "Fira Code", "monospace"],
      },
      colors: {
        surface: {
          primary: "#0d1117",
          secondary: "#161b22",
          elevated: "#1c2128",
          overlay: "#21262d",
        },
        border: {
          DEFAULT: "#30363d",
          muted: "#21262d",
          accent: "#388bfd33",
        },
        text: {
          primary: "#e6edf3",
          secondary: "#8b949e",
          muted: "#6e7681",
          placeholder: "#484f58",
        },
        bullish: {
          DEFAULT: "#3fb950",
          muted: "#3fb95033",
        },
        bearish: {
          DEFAULT: "#f85149",
          muted: "#f8514933",
        },
        neutral: {
          DEFAULT: "#58a6ff",
          muted: "#58a6ff33",
        },
        warning: {
          DEFAULT: "#d29922",
          muted: "#d2992233",
        },
        accent: {
          blue: "#58a6ff",
          purple: "#a371f7",
          teal: "#39d353",
          orange: "#f0883e",
        },
      },
      fontSize: {
        "data-xl": ["1.5rem", { lineHeight: "1.2", letterSpacing: "-0.02em" }],
        "data-lg": ["1.125rem", { lineHeight: "1.2", letterSpacing: "-0.01em" }],
        "data-md": ["0.875rem", { lineHeight: "1.3", letterSpacing: "0" }],
        "data-sm": ["0.75rem", { lineHeight: "1.3", letterSpacing: "0.01em" }],
        "data-xs": ["0.6875rem", { lineHeight: "1.3", letterSpacing: "0.02em" }],
      },
      borderRadius: {
        terminal: "6px",
      },
      spacing: {
        "terminal-gap": "12px",
      },
    },
  },
  plugins: [],
};

export default config;
