import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = `file:${path.join(serverRoot, 'prisma', 'test.db')}`;
process.env.OPENROUTER_API_KEY = '';
process.env.SKIP_CRON = 'true';

execSync('npx prisma db push --skip-generate', {
  cwd: serverRoot,
  stdio: 'pipe',
  env: { ...process.env }
});

execSync('npx prisma generate', {
  cwd: serverRoot,
  stdio: 'pipe',
  env: { ...process.env }
});
