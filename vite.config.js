import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // 开发环境: 把 /backend 代理到 AI Builder Space 后端, 避免 CORS
      // 生产环境: 部署平台的 Nginx 会做同样的同源代理, 应用代码无需改动
      "/backend": {
        target: "https://space.ai-builders.com",
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
