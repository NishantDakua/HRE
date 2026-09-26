import http from "node:http";
import path from "node:path";
import { defineConfig } from "vite";
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

export default defineConfig({
  plugins: [react(), redirectLegacyPort()],
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
