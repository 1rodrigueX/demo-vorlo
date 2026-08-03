import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Site público SYNEXA (agência): usa navegação com <a> de página inteira de
  // propósito (rotas separadas com tema carbono próprio) — o reload é aceitável
  // e reseta scroll/estado. Não força next/link nessas páginas de marketing.
  {
    files: ["src/app/(site)/**", "src/components/site/**"],
    rules: { "@next/next/no-html-link-for-pages": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Build gerado do app Flutter, copiado pra public/ pra ser servido como
    // estático — não é código-fonte do site (main.dart.js sozinho já é
    // minificado/enorme e sozinho gera milhares de falsos positivos).
    "public/app-web/**",
    // apps/frete-app é um projeto Flutter/Dart à parte, com tooling próprio
    // (dart analyze) — nunca deve ser varrido pelo ESLint do Next.js.
    "apps/**",
  ]),
]);

export default eslintConfig;
