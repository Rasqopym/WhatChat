/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        whatsapp: {
          green: "#25D366",
          darkgreen: "#075E54",
          lightgreen: "#DCF8C6",
          teal: "#128C7E",
          chatbg: "#EFEAE2",
        }
      }
    },
  },
  plugins: [],
};
