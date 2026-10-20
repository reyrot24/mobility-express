import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  base: "/",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    // Edge Function "api" in locale (npm run api:dev) per "Il prezzo giusto per te"
    proxy: {
      "/api": {
        target: "http://localhost:54321",
        rewrite: (path) => `/functions/v1${path}`,
      },
    },
  },
});
