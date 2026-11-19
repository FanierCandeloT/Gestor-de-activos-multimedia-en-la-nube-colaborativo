import type { NextConfig } from "next";

// CORS de la API: solo el origen indicado puede llamarla desde un navegador.
// En producción define ALLOWED_ORIGIN con la URL pública de la app.
// Las llamadas de la propia página (mismo origen) no dependen de esto.
const origenPermitido = process.env.ALLOWED_ORIGIN ?? "http://localhost:3000";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: origenPermitido },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, DELETE, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type" },
          { key: "Access-Control-Max-Age", value: "86400" },
          { key: "Vary", value: "Origin" },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
