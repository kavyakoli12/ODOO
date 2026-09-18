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
        brand: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5', // Main Indigo Brand
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
          950: '#1E1B4B',
        },
        surface: {
          dark: '#0B0F19',
          card: '#111827',
          cardHover: '#1F2937',
          border: '#374151',
          input: '#1E293B',
        },
        status: {
          submitted: '#6B7280',
          under_review: '#F59E0B',
          verified: '#4F46E5',
          rejected: '#EF4444',
          assigned: '#3B82F6',
          investigation_ongoing: '#8B5CF6',
          resolved: '#10B981',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
