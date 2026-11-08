import { defineConfig } from "vitest/config";
import baseConfig from "./vitest.config";

// Pure unit tests must not start the Python integration server or touch its DB.
export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    globalSetup: [],
    include: ["src/**/*.unit.test.{ts,tsx}"],
  },
});
