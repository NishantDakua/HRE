import http from "node:http";
import path from "node:path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

/** Old docs and QR codes used Vite's default port. The app listens on 3100. */
function redirectLegacyPort() {
  return {
    name: "redirect-legacy-port",
    configureServer() {
      const server = http.createServer((req, res) => {
        res.writeHead(302, { Location: `http://localhost:3100${req.url || "/"}` });
        res.end();
      });
      server.on("error", () => undefined);
      server.listen(5173);
    },
  };
}

/** The API port comes from server/.env (PORT, default 5000), so the proxy always matches the server. */
function apiTarget(mode: string) {
  const server = loadEnv(mode, path.resolve(__dirname, "../server"), "");
  return `http://localhost:${process.env.API_PORT || server.PORT || 5000}`;
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), redirectLegacyPort()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  server: {
    port: 3100,
    // Whatever port the client runs on, /api goes to the API.
    proxy: {
      "/api": { target: apiTarget(mode), changeOrigin: true },
    },
  },
}));
