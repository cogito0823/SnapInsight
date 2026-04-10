import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        options: resolve(__dirname, "options.html"),
        worker: resolve(__dirname, "src/worker/index.ts")
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
