import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://148.135.56.115:8001',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React 核心库
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // 图表库（较大）
          'vendor-charts': ['recharts'],
          // 动画库
          'vendor-animation': ['framer-motion'],
          // 工具库
          'vendor-utils': ['axios', 'zustand', 'date-fns'],
        },
      },
    },
    // 减少 chunk 大小警告阈值
    chunkSizeWarningLimit: 600,
  },
})
