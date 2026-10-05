import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['packages/**/*.test.ts', 'tests/**/*.test.ts', 'content/**/*.test.ts'],
    environment: 'node',
  },
});
