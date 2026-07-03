/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // UniRaw premium — near-black blue-tinted slate surface scale.
        // Legacy "surface" names kept so Edit/API pages retheme automatically.
        surface: {
          0: "#07080f", // --bg
          1: "#0d0f18", // --panel
          2: "#13151f", // --panel-2
          3: "#1a1d2b", // --panel-3
          4: "#242840", // --line
          5: "#2e3350",
        },
        // Electric indigo-blue primary.
        brand: {
          DEFAULT: "#6366f1",
          hi: "#7c9aff",
          lo: "#4f52d6",
          soft: "rgba(99, 102, 241, 0.16)",
          ring: "rgba(124, 154, 255, 0.45)",
        },
        cyan2: "#22d3ee",
        violet2: "#a78bfa",
        teal2: "#2dd4bf",
      },
      fontFamily: {
        sans: ['"Inter"', "-apple-system", "system-ui", "sans-serif"],
        mono: ['"IBM Plex Mono"', "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        soft: "0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 24px -12px rgba(0,0,0,0.5)",
        glow: "0 0 0 1px rgba(99,102,241,0.35), 0 8px 32px -8px rgba(99,102,241,0.45)",
      },
      ringColor: {
        DEFAULT: "rgba(124, 154, 255, 0.45)",
      },
    },
  },
  plugins: [],
};
