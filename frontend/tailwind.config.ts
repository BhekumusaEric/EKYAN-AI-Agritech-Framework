import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eff8f1",
          100: "#d8eddc",
          200: "#b5ddbe",
          300: "#83c69a",
          400: "#52a874",
          500: "#2f8959",
          600: "#216e47",
          700: "#1d583b",
          800: "#194732",
          900: "#143a2c",
        },
        harvest: "#F4B942",
        soil: "#94644A",
        sky: "#4A99B7",
        unicef: {
          blue:    "#1CABE2",
          navy:    "#0077B6",
          pale:    "#E8F6FD",
          green:   "#00833D",
          yellow:  "#FFC20E",
          red:     "#E2231A",
        },
        surface:  "#F7F9FC",
        border:   "#E2E8F0",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
