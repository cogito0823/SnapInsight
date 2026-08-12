import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  define: {
    __SNAPINSIGHT_INFERENCE_PROVIDER__: JSON.stringify(
      process.env.SNAPINSIGHT_INFERENCE_PROVIDER ?? "ollama"
    )
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        options: resolve(__dirname, "options.html"),
        promptApiLab: resolve(__dirname, "prompt-api-lab.html"),
        promptHost: resolve(__dirname, "prompt-host.html"),
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
