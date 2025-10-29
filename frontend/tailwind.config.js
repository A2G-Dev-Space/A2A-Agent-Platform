/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "#607AFB",
        "primary-dark": "#5719e6",

        "background-light": "#f5f6f8",
        "background-dark": "#0f1323",

        "panel-light": "#ffffff",
        "panel-dark": "#1f2937",

        "surface-light": "#FFFFFF",
        "surface-dark": "#1E293B",

        "border-light": "#e5e7eb",
        "border-dark": "#2d2938",

        "text-light": "#1E293B",
        "text-dark": "#E2E8F0",
        "text-light-primary": "#111827",
        "text-dark-primary": "#f9fafb",
        "text-light-secondary": "#6b7281",
        "text-dark-secondary": "#9ca3af",

        "accent": "#CCFBF1",
        "accent-dark": "#0d9488",

        "hub-accent": "#0284c7",
        "hub-accent-light": "#E0F2FE",
        "hub-accent-dark": "#0369a1",
      },
      fontFamily: {
        display: ['Manrope', 'Public Sans', 'Pretendard', 'sans-serif'],
        mono: ['Fira Code', 'JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        full: "9999px",
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}