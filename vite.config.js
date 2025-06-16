import { defineConfig } from 'vite'

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: './index.html',
        login: './login.html',
        register: './register.html'
      },
      output: {
        manualChunks: {
          vendor: ['./src/utils', './src/components'],
          main: ['./src/main.js'],
          auth: ['./src/controllers/authController.js']
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    },
    minify: 'terser',
    sourcemap: false,
    cssCodeSplit: false
  },
  server: {
    port: 5173,
    open: true
  },
  optimizeDeps: {
    exclude: ['json-server']
  }
})