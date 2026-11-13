import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: [".next/**", "src/generated/**", "node_modules/**", "next-env.d.ts"],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    files: ["src/components/atoms/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/features/*", "@/features/**"],
              message: "Atoms must not import from features.",
            },
            {
              group: ["@/store/*", "@/store/**"],
              message: "Atoms must not import from store.",
            },
            {
              group: ["next/navigation", "next/router"],
              message: "Atoms must not use navigation — keep them presentational.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/components/molecules/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/features/*", "@/features/**"],
              message: "Molecules must stay presentational — no features imports.",
            },
            {
              group: ["@/components/organisms/*", "@/components/organisms/**"],
              message: "Molecules must not depend on organisms.",
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
