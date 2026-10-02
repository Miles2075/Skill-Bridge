// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 3000,
  },
  optimizeDeps: {
    exclude: ["@tanstack/react-router", "@tanstack/react-store"],
  },
  plugins: [
    {
      name: "lms-dev-api-middleware",
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (!req.url?.startsWith("/api/lms")) {
            return next();
          }
          try {
            const { handleLmsApiRequest } = await import("./src/lib/lms-api.server");
            const protocol = req.headers["x-forwarded-proto"] || "http";
            const host = req.headers.host || "localhost:3000";
            const url = new URL(req.url, `${protocol}://${host}`);

            const headers = new Headers();
            for (const [k, v] of Object.entries(req.headers)) {
              if (v !== undefined) {
                if (Array.isArray(v)) {
                  v.forEach((val) => headers.append(k, val));
                } else {
                  headers.set(k, v);
                }
              }
            }

            const chunks: Uint8Array[] = [];
            if (req.method !== "GET" && req.method !== "HEAD") {
              for await (const chunk of req) {
                chunks.push(chunk as Uint8Array);
              }
            }
            const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;

            const webReq = new Request(url.href, {
              method: req.method,
              headers,
              body,
            });

            const webRes = await handleLmsApiRequest(webReq);
            if (!webRes) {
              return next();
            }

            res.statusCode = webRes.status;
            webRes.headers.forEach((val, key) => {
              res.setHeader(key, val);
            });

            const arrayBuf = await webRes.arrayBuffer();
            res.end(Buffer.from(arrayBuf));
          } catch (err) {
            console.error("LMS Dev API Error:", err);
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: "Internal LMS server error" }));
          }
        });
      },
    },
  ],
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
