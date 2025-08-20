/** @type {import('tailwindcss').Config} */ 
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      animation: {
        blink: "blink 1s infinite",
        shimmer: "shimmer 1.5s infinite linear",
      },
      keyframes: {
        blink: {
          "0%, 50%, 100%": { opacity: 1 },
          "25%, 75%": { opacity: 0 },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        
      },
    },
  },
  plugins: [require("tailwind-scrollbar-hide")],
};
