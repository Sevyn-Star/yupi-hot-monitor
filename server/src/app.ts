import express, { type Express } from 'express';
import cors from 'cors';
import { createServer, type Server as HttpServer } from 'http';
import { Server } from 'socket.io';

import keywordsRouter from './routes/keywords.js';
import hotspotsRouter from './routes/hotspots.js';
import settingsRouter from './routes/settings.js';
import notificationsRouter from './routes/notifications.js';
import scanRouter from './routes/scan.js';
import healthRouter from './routes/health.js';
import discoverRouter from './routes/discover.js';
import { runHotspotCheck } from './jobs/hotspotChecker.js';
import { initHotspotCron } from './cron.js';
import { runWithScanLock } from './services/scanStatus.js';

export interface AppBundle {
  app: Express;
  httpServer: HttpServer;
  io: Server;
}

export function createApp(options?: { enableCron?: boolean }): AppBundle {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST']
    }
  });

  app.use(cors());
  app.use(express.json());

  app.use('/api/keywords', keywordsRouter);
  app.use('/api/hotspots', hotspotsRouter);
  app.use('/api/settings', settingsRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/scan', scanRouter);
  app.use('/api/health', healthRouter);
  app.use('/api/discover', discoverRouter);

  app.post('/api/check-hotspots', async (_req, res) => {
    try {
      const result = await runWithScanLock('manual', () => runHotspotCheck(io));
      if (result.skipped) {
        return res.status(409).json({
          error: 'Scan already in progress',
          code: 'SCAN_IN_PROGRESS'
        });
      }
      res.json({
        message: 'Hotspot check completed',
        newHotspotsCount: result.newHotspotsCount,
        keywordsChecked: result.keywordsChecked
      });
    } catch (error) {
      console.error('Manual hotspot check failed:', error);
      res.status(500).json({ error: 'Failed to run hotspot check' });
    }
  });

  io.on('connection', (socket) => {
    socket.on('subscribe', (keywords: string[]) => {
      keywords.forEach((kw) => socket.join(`keyword:${kw}`));
    });
    socket.on('unsubscribe', (keywords: string[]) => {
      keywords.forEach((kw) => socket.leave(`keyword:${kw}`));
    });
  });

  const enableCron = options?.enableCron ?? process.env.NODE_ENV !== 'test';
  if (enableCron) {
    initHotspotCron(io);
  }

  return { app, httpServer, io };
}
