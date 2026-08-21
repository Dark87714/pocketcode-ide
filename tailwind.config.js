/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        vscode: {
          bg: '#1e1e1e',
          sidebar: '#252526',
          activityBar: '#333333',
          header: '#3c3c3c',
          status: '#007acc',
          accent: '#0e639c',
          border: '#3c3c3c',
          activeTab: '#1e1e1e',
          inactiveTab: '#2d2d2d',
          tabBorder: '#252526',
          hover: '#2a2d2e',
          selection: '#264f78',
          text: '#cccccc',
          bright: '#ffffff',
          muted: '#858585',
        }
      },
      fontFamily: {
        mono: ['"Fira Code"', 'Consolas', '"Courier New"', 'monospace'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      screens: {
        'xs': '420px',
      }
    },
  },
  plugins: [],
}
