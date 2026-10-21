import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
export default defineConfig({
  plugins: [
    react(),
    {
      name: "synthetic-test-fixtures",
      configureServer(server) {
        server.middlewares.use("/__fixtures", async (req, res) => {
          const name = decodeURIComponent((req.url || "").split("?")[0]).slice(
            1,
          );
          if (!/^[\w .-]+$/.test(name)) {
            res.statusCode = 400;
            res.end();
            return;
          }
          try {
            res.end(await readFile(resolve("work/fixtures", name)));
          } catch {
            res.statusCode = 404;
            res.end();
          }
        });
      },
    },
  ],
  server: { port: 5173, strictPort: true },
  build: { chunkSizeWarningLimit: 1800 },
});
