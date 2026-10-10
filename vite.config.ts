// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { readFile } from "node:fs/promises";

function base64AssetPlugin() {
  return {
    name: "base64-asset",
    enforce: "pre" as const,
    async load(id: string) {
      const separator = id.indexOf("?");
      if (separator < 0) return null;
      const file = id.slice(0, separator);
      const query = id.slice(separator + 1);
      if (!query.split("&").includes("base64") || !/\.(?:png|jpe?g)$/iu.test(file)) return null;
      const mimeType = /\.png$/iu.test(file) ? "image/png" : "image/jpeg";
      const data = await readFile(file);
      return `export default ${JSON.stringify(`data:${mimeType};base64,${data.toString("base64")}`)};`;
    },
  };
}

export default defineConfig({
  vite: {
    plugins: [base64AssetPlugin()],
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
