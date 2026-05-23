import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    // Scope normal test runs to tests/ — scripts/ contains report generators, not test suites.
    include: ['tests/**/*.test.js'],
  },
})
