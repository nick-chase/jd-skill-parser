import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
    plugins: [tailwindcss(), react()],
    resolve: {
        alias: {
            '@core': path.resolve(__dirname, '../nat20-core/src'),
            '@data': path.resolve(__dirname, '../nat20-core/data'),
        }
    },
    test: {
        include: ['tests/**/*.test.js'],
        resolve: {
            alias: {
                '@core': path.resolve(__dirname, '../nat20-core/src'),
                '@data': path.resolve(__dirname, '../nat20-core/data'),
            }
        }
    },
})
