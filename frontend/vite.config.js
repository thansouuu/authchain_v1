import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // THÊM DẤU GẠCH CHÉO VÀO CUỐI 'buffer/' 
      // Điều này lừa Vite lấy package npm thay vì chặn nó
      buffer: 'buffer/', 
    }
  },
  define: {
    // Ép Vite hiểu biến global cho thư viện Anchor
    'global': 'globalThis',
  }
})