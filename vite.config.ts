import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    cloudflare({
      config: {
        name: "vcc",
        main: "./src/worker/index.ts",
        compatibility_date: "2026-07-02",
        compatibility_flags: ["nodejs_compat"],
        minify: true,
      },
      resolve: {
        alias: {
          "@": path.resolve(__dirname, "./src"),
        },
      },
    }),
  ],
  build: {
    outDir: "dist/client",
    emptyOutDir: true,
    assetsDir: "assets",
    target: "esnext",
    minify: "esbuild",
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (
            id.includes("node_modules/react") ||
            id.includes("node_modules/react-dom")
          ) {
            return "react-core";
          }
        },
      },
    },
  },
  ssr: {
    external: ["node:crypto", "node:buffer", "node:stream"],
  },
});
