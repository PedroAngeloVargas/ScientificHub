import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Site estático (HTML/JS/CSS em out/): todas as páginas buscam os dados no navegador,
  // então em produção basta um nginx a servir ficheiros, sem servidor Node.
  output: "export",
  reactCompiler: true,
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
