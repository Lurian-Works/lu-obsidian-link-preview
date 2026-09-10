import { resolve } from "node:path"
import { defineConfig } from "vite"

export default defineConfig({
  root: resolve(import.meta.dirname, "playground"),
  server: {
    port: 5174,
    strictPort: true,
  },
})
