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
