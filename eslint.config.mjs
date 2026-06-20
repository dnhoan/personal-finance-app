import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript", "prettier"),
  {
    // Lint app source only. `.claude/` is vendored Claude Code tooling (CommonJS
    // scripts/hooks) and plans/docs are prose — neither follows the app's lint
    // rules and `eslint .` would otherwise fail the CI lint gate on them.
    ignores: [
      ".next/**",
      "node_modules/**",
      "drizzle/**",
      "playwright-report/**",
      ".claude/**",
      "plans/**",
      "docs/**",
    ],
  },
];

export default eslintConfig;
