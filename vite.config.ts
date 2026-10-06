import { defineConfig } from "vite";
import { Readable } from "node:stream";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 3000,
  },
  optimizeDeps: {
    exclude: ["@tanstack/react-router", "@tanstack/react-store"],
  },
  plugins: [
    tanstackStart({
      server: { entry: "server" },
    }),
    nitro(),
    tailwindcss(),
    react(),
    tsconfigPaths(),
    {
      name: "lms-dev-api-middleware",
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (!req.url?.startsWith("/api/lms")) return next();
          try {
            const { handleLmsApiRequest } = await import("./src/lib/lms-api.server");
            const protocol = req.headers["x-forwarded-proto"] || "http";
            const host = req.headers.host || "localhost:3000";
            const url = new URL(req.url, `${protocol}://${host}`);
            const headers = new Headers();
            for (const [k, v] of Object.entries(req.headers)) {
              if (v !== undefined) {
                if (Array.isArray(v)) v.forEach((val) => headers.append(k, val));
                else headers.set(k, v);
              }
            }
            const hasBody = req.method !== "GET" && req.method !== "HEAD";
            const webReq = new Request(url.href, {
              method: req.method,
              headers,
              body: hasBody ? Readable.toWeb(req) : undefined,
              duplex: "half",
            });
            const webRes = await handleLmsApiRequest(webReq);
            if (!webRes) return next();
            res.statusCode = webRes.status;
            webRes.headers.forEach((val, key) => res.setHeader(key, val));
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
});
