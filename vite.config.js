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
        assetFileNames: 'assets/[name].[hash].[ext]',
        chunkFileNames: 'assets/[name].[hash].js',
        entryFileNames: 'assets/[name].[hash].js'
      }
    },
    assetsDir: 'assets',
    cssCodeSplit: false
  },
  server: {
    port: 5173,
    open: true
  }
})