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
          // 图表库（较大，仅报告页面使用）
          'vendor-charts': ['recharts'],
          // 动画库
          'vendor-animation': ['framer-motion'],
          // 工具库
          'vendor-utils': ['axios', 'zustand', 'date-fns'],
          // Supabase 客户端（较大的认证库）
          'vendor-supabase': ['@supabase/supabase-js'],
          // Markdown 渲染（仅报告页面使用）
          'vendor-markdown': ['react-markdown'],
          // UI 组件库
          'vendor-ui': ['lucide-react', 'react-hot-toast', 'canvas-confetti'],
        },
      },
    },
    // 减少 chunk 大小警告阈值
    chunkSizeWarningLimit: 600,
    // 生产构建优化
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // 生产环境移除 console.log
        drop_debugger: true,
      },
    },
    // 启用 CSS 代码分割
    cssCodeSplit: true,
    // 启用 source map（可选，调试用）
    sourcemap: false,
  },
})
