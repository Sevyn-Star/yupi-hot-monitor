import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: [path.join(__dirname, 'src/__tests__/setup.ts')],
    include: ['src/__tests__/**/*.test.ts'],
    fileParallelism: false,
    testTimeout: 30000
  }
});
