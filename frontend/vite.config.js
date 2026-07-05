import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5000,
    allowedHosts: true,
    proxy: {
      "/auth": "http://localhost:8000",
      "/kitchens": "http://localhost:8000",
      "/orders": "http://localhost:8000",
      "/me": "http://localhost:8000",
      "/admin": "http://localhost:8000",
      "/promos": "http://localhost:8000",
      "/k": "http://localhost:8000",
      "/t": "http://localhost:8000",
      "/docs": "http://localhost:8000",
      "/openapi.json": "http://localhost:8000",
    },
  },
  preview: {
    host: "0.0.0.0",
    port: 5000,
    allowedHosts: true,
  },
});
