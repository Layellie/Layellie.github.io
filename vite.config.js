import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tailwindSourceScope } from "./build/tailwind-source-scope.js";
import { adminRedirectPlugin } from "./build/admin-redirect.js";

// https://vite.dev/config/
export default defineConfig({
  cacheDir: "node_modules/.vite-site",
  plugins: [
    tailwindSourceScope(["./App.jsx", "./main.jsx", "./components/project-visuals"]),
    react(),
    tailwindcss(),
    adminRedirectPlugin(),
  ],
});
