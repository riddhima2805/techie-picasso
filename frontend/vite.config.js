import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const BACKEND = "http://localhost:3001";
const BACKEND_WS = "ws://localhost:3001";

export default defineConfig({
  plugins: [react()],
  server: {

    port: 5173,
    proxy: {
      // HTTP API (auth, rooms)
      "/api": {
        target: BACKEND,
        changeOrigin: true,},
      // WebSocket canvas data
      "/ws": {target: BACKEND_WS,
        ws: true,
        changeOrigin: true,
    },},
    },
}
);