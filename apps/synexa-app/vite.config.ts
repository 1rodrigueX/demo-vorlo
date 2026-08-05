import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Config amigável ao Tauri: porta fixa, não limpa a tela, e caminhos relativos
// pra funcionar quando o app é servido pelo protocolo do Tauri (não só http).
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  server: { port: 5173, strictPort: true },
  resolve: {
    alias: { "@": new URL("./src", import.meta.url).pathname },
  },
});
