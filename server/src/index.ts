import dotenv from 'dotenv';
import { prisma } from './db.js';
import { createApp } from './app.js';
import { getAppSettings } from './services/settings.js';

dotenv.config();

const { httpServer, io } = createApp({ enableCron: true });

export { io };

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, async () => {
  const settings = await getAppSettings();
  console.log(`
  🔥 热点监控服务启动成功!
  📡 Server running on http://localhost:${PORT}
  🔌 WebSocket ready
  ⏰ Scan interval: ${settings.scanIntervalMinutes} minutes
  `);
});

process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await prisma.$disconnect();
  process.exit(0);
});
