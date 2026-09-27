import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";
import plugin from "tailwindcss/plugin";

/** `size-*` (width + height) — built into Tailwind 3.4, polyfilled for 3.3. */
const sizeUtility = plugin(({ matchUtilities, theme }) => {
  matchUtilities({ size: (value: string) => ({ width: value, height: value }) }, { values: theme("spacing") });
});

const token = (name: string) => `hsl(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: "1.25rem", md: "2rem" },
      screens: { "2xl": "1360px" },
    },
    extend: {
      opacity: { "15": "0.15", "35": "0.35", "45": "0.45", "55": "0.55", "65": "0.65", "85": "0.85" },
      colors: {
        // Core palette
        paper: token("paper"),
        sand: token("sand"),
        ink: token("ink"),
        line: token("line"),
        terracotta: token("terracotta"),
        marigold: token("marigold"),
        peacock: token("peacock"),

        // Mumbai art-deco pastels (illustrations)
        peach: token("peach"),
        rose: token("rose"),
        mint: token("mint"),
        butter: token("butter"),
        powder: token("powder"),

        // Semantic
        bg: token("paper"),
        surface: token("sand"),
        card: {
          DEFAULT: token("card"),
          foreground: token("ink"),
        },
        border: token("line"),
        text: token("ink"),
        muted: token("muted"),
        available: token("peacock"),
        conflict: token("conflict"),
        pending: token("pending"),

        // shadcn/ui aliases
        background: token("paper"),
        foreground: token("ink"),
        popover: {
          DEFAULT: token("card"),
          foreground: token("ink"),
        },
        primary: {
          DEFAULT: token("terracotta"),
          foreground: token("ink"),
        },
        secondary: {
          DEFAULT: token("sand"),
          foreground: token("ink"),
        },
        accent: {
          DEFAULT: token("marigold"),
          foreground: token("ink"),
        },
        destructive: {
          DEFAULT: token("conflict"),
          foreground: token("card"),
        },
        input: token("line"),
        ring: token("terracotta"),
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
        hand: ["var(--font-hand)", "cursive"],
      },
      borderRadius: {
        DEFAULT: "var(--radius)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 6px)",
        sm: "calc(var(--radius) - 10px)",
        xl: "calc(var(--radius) + 4px)",
      },
      boxShadow: {
        none: "none",
        card: "0 8px 30px rgba(120, 70, 30, 0.08)",
        "card-hover": "0 12px 36px rgba(120, 70, 30, 0.12)",
        hairline: "0 0 0 1px hsl(var(--line))",
      },
      spacing: {
        18: "4.5rem",
        22: "5.5rem",
      },
      letterSpacing: {
        tightest: "-0.035em",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 320ms cubic-bezier(0.22, 1, 0.36, 1) both",
      },
    },
  },
  plugins: [
    animate,
    sizeUtility,
    plugin(({ addVariant }) => {
      addVariant("touch", "@media (pointer: coarse)");
    }),
  ],
};

export default config;
