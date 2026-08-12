import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        options: resolve(import.meta.dirname, "options.html"),
        worker: resolve(import.meta.dirname, "src/worker/index.ts")
      },
      output: {
        entryFileNames: (chunkInfo) => {
          if (chunkInfo.name === "content") {
            return "content.js";
          }

          if (chunkInfo.name === "worker") {
            return "worker.js";
          }

          return "assets/[name].js";
        }
      }
    }
  }
});
