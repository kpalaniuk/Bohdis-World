import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Existing UI code is not part of the auth rebuild. Keep its established
  // behavior while leaving the React 19 rules enabled for all new code.
  {
    files: [
      "src/app/admin/page.tsx",
      "src/app/math/page.tsx",
      "src/components/game/GameInstructions.tsx",
      "src/components/math/AssessmentResults.tsx",
      "src/components/math/ProblemDisplay.tsx",
      "src/components/math/WordProblemCreator.tsx",
    ],
    rules: { "react/no-unescaped-entities": "off" },
  },
  {
    files: [
      "src/components/GameWrapper.tsx",
      "src/components/game/AsteroidsCanvas.tsx",
      "src/components/game/BrickBreakerCanvas.tsx",
      "src/components/ui/CoinDisplay.tsx",
    ],
    rules: { "react-hooks/set-state-in-effect": "off" },
  },
  {
    files: ["src/components/calculator/Calculator.tsx"],
    rules: { "react-hooks/static-components": "off" },
  },
  {
    files: [
      "src/components/math/ProblemDisplay.tsx",
      "src/components/math/WordProblemCreator.tsx",
      "src/components/math/WordProblemForum.tsx",
    ],
    rules: { "react-hooks/immutability": "off" },
  },
  {
    files: [
      "src/components/math/WordProblemCreator.tsx",
      "src/lib/sounds.ts",
      "src/**/*.test.ts",
      "src/**/*.test-helper.ts",
    ],
    rules: { "@typescript-eslint/no-explicit-any": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
