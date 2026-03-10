/**
 * vitest.config.ts — Vitest configuration for CyberShield LMS unit tests.
 * Resolves the @/ path alias so lib/ files can import from '@/types' etc.
 * Run tests with: npx vitest run
 */

import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globals: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
