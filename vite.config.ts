import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";

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
    react(),
    nitro(),
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
            const chunks: Uint8Array[] = [];
            if (req.method !== "GET" && req.method !== "HEAD") {
              for await (const chunk of req) chunks.push(chunk as Uint8Array);
            }
            const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;
            const webReq = new Request(url.href, { method: req.method, headers, body });
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
