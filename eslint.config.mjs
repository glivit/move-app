import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    // Catches ".next 2/", ".next 3/" build-artefact dupes that some tooling creates.
    ".next*/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Local-only directories that contain code-as-data, not source under lint:
    ".claude/worktrees/**",
    "scripts/tmp/**",
  ]),
]);

export default eslintConfig;
