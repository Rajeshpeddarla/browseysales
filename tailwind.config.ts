import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: "#07071A",
          soft: "#0B0B22",
        },
        surface: {
          DEFAULT: "#10102B",
          1: "#13132F",
          2: "#191940",
          3: "#22224E",
        },
        border: {
          DEFAULT: "#272754",
          soft: "#1C1C42",
          strong: "#3A3A6E",
        },
        brand: {
          blue: "#5B8BFF",
          violet: "#7C5BFF",
          pink: "#D966FF",
          glow: "#B19CFF",
        },
        text: {
          DEFAULT: "#F4F4FB",
          muted: "#9A9AB8",
          subtle: "#6E6E92",
        },
        success: "#3DD68C",
        warning: "#FFB454",
        danger: "#FF5C7A",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      backgroundImage: {
        "brand-gradient":
          "linear-gradient(135deg, #5B8BFF 0%, #7C5BFF 45%, #D966FF 100%)",
        "brand-gradient-soft":
          "linear-gradient(135deg, rgba(91,139,255,0.18) 0%, rgba(124,91,255,0.18) 45%, rgba(217,102,255,0.18) 100%)",
        "radial-fade":
          "radial-gradient(60% 60% at 50% 0%, rgba(124,91,255,0.25), transparent 70%)",
        "grid":
          "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
      },
      backgroundSize: {
        grid: "32px 32px",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(124,91,255,0.35), 0 12px 40px -8px rgba(124,91,255,0.45)",
        "glow-pink":
          "0 0 0 1px rgba(217,102,255,0.35), 0 12px 40px -8px rgba(217,102,255,0.45)",
        card: "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 30px 60px -30px rgba(0,0,0,0.6)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      keyframes: {
        floaty: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "200% 50%" },
        },
        pulseGlow: {
          "0%,100%": { opacity: "0.7" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        floaty: "floaty 4s ease-in-out infinite",
        shimmer: "shimmer 6s linear infinite",
        pulseGlow: "pulseGlow 2.5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
