import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  server: {
    port: 3100,
    proxy: {
      "/api": { target: "http://localhost:5000", changeOrigin: true },
      "/voice": { target: "http://localhost:8008", changeOrigin: true },
    },
  },
});
