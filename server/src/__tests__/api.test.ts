import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { prisma } from '../db.js';
import { createApp } from '../app.js';

const { app } = createApp({ enableCron: false });

describe('API integration', () => {
  beforeAll(async () => {
    await prisma.discoveryInsight.deleteMany();
    await prisma.platformSnapshot.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.hotspot.deleteMany();
    await prisma.keyword.deleteMany();
    await prisma.setting.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('GET /api/health', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /api/scan/status', async () => {
    const res = await request(app).get('/api/scan/status');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('isRunning');
    expect(res.body).toHaveProperty('scanIntervalMinutes');
  });

  it('keywords CRUD flow', async () => {
    const created = await request(app)
      .post('/api/keywords')
      .send({ text: 'test-keyword-api' });
    expect(created.status).toBe(201);
    expect(created.body.text).toBe('test-keyword-api');

    const list = await request(app).get('/api/keywords');
    expect(list.status).toBe(200);
    expect(list.body.some((k: { text: string }) => k.text === 'test-keyword-api')).toBe(true);

    const toggled = await request(app).patch(`/api/keywords/${created.body.id}/toggle`);
    expect(toggled.status).toBe(200);

    const removed = await request(app).delete(`/api/keywords/${created.body.id}`);
    expect(removed.status).toBe(204);
  });

  it('GET /api/settings returns defaults', async () => {
    const res = await request(app).get('/api/settings');
    expect(res.status).toBe(200);
    expect(res.body.scanIntervalMinutes).toBeGreaterThanOrEqual(5);
    expect(Array.isArray(res.body.enabledSources)).toBe(true);
    expect(res.body).toHaveProperty('webhookNotificationsEnabled');
  });

  it('GET /api/keywords/templates and import', async () => {
    const templates = await request(app).get('/api/keywords/templates');
    expect(templates.status).toBe(200);
    expect(templates.body.length).toBeGreaterThan(0);

    const imported = await request(app)
      .post('/api/keywords/import')
      .send({ templateId: templates.body[0].id });
    expect(imported.status).toBe(201);
    expect(imported.body.created).toBeGreaterThanOrEqual(0);

    await prisma.keyword.deleteMany({
      where: { text: { in: templates.body[0].keywords.map((k: { text: string }) => k.text) } }
    });
  });

  it('GET /api/hotspots/report', async () => {
    const res = await request(app).get('/api/hotspots/report?range=7d');
    expect(res.status).toBe(200);
    expect(res.body.markdown).toContain('HotPulse');
    expect(res.body.range).toBe('7d');
  });

  it('GET /api/hotspots/stats', async () => {
    const res = await request(app).get('/api/hotspots/stats');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('total');
  });

  it('GET /api/hotspots/trends', async () => {
    const res = await request(app).get('/api/hotspots/trends?days=7');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('byDay');
  });

  it('GET /api/health/startup', async () => {
    const res = await request(app).get('/api/health/startup');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('keywordCount');
  });

  it('GET /api/keywords/export', async () => {
    const res = await request(app).get('/api/keywords/export');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.keywords)).toBe(true);
  });

  it('POST /api/hotspots/search accepts source and timeWindow', async () => {
    const res = await request(app)
      .post('/api/hotspots/search')
      .send({
        query: 'typescript',
        sources: ['hackernews'],
        timeWindow: '7d',
        sortBy: 'hot'
      });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.results)).toBe(true);
    expect(Array.isArray(res.body.sourceStats)).toBe(true);
    const hn = res.body.sourceStats.find((s: { source: string }) => s.source === 'hackernews');
    expect(hn).toBeDefined();
  }, 30000);

  it('POST /api/hotspots/save', async () => {
    const kw = await request(app).post('/api/keywords').send({ text: 'save-test-kw' });
    const res = await request(app).post('/api/hotspots/save').send({
      keywordId: kw.body.id,
      items: [
        {
          title: 'Test save',
          content: 'body',
          url: 'https://example.com/save-test-unique',
          source: 'bing',
          importance: 'medium',
          relevance: 80,
          isReal: true
        }
      ]
    });
    expect(res.status).toBe(201);
    expect(res.body.created).toBe(1);
    await prisma.hotspot.deleteMany({ where: { url: 'https://example.com/save-test-unique' } });
    await prisma.keyword.delete({ where: { id: kw.body.id } });
  });
});
