import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { prisma } from '../db.js';
import { createApp } from '../app.js';

const { app } = createApp({ enableCron: false });

describe('Discovery API', () => {
  beforeAll(async () => {
    await prisma.discoveryInsight.deleteMany();
    await prisma.platformSnapshot.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('GET /api/discover/capabilities lists all discovery platforms', async () => {
    const res = await request(app).get('/api/discover/capabilities');
    expect(res.status).toBe(200);
    expect(res.body.platforms.length).toBe(5);
    const sources = res.body.platforms.map((p: { source: string }) => p.source);
    expect(sources).toEqual(
      expect.arrayContaining(['github', 'weibo', 'hackernews', 'bilibili', 'huggingface'])
    );
    const gh = res.body.platforms.find((p: { source: string }) => p.source === 'github');
    expect(gh.capabilities.trending).toBe(true);
    expect(gh.capabilities.sortMetrics.some((m: { label: string }) => m.label.includes('Star'))).toBe(
      true
    );
    const bili = res.body.platforms.find((p: { source: string }) => p.source === 'bilibili');
    expect(bili.capabilities.sortMetrics.some((m: { label: string }) => m.label === '播放量')).toBe(
      true
    );
  });

  it('POST /api/discover rejects unsupported source', async () => {
    const res = await request(app).post('/api/discover').send({
      source: 'google',
      mode: 'trending',
      skipAi: true
    });
    expect(res.status).toBe(400);
    expect(res.body.code).toBe('DISCOVERY_NOT_SUPPORTED');
  });

  it('POST /api/discover with weibo returns items and saves snapshot', async () => {
    const res = await request(app)
      .post('/api/discover')
      .send({
        source: 'weibo',
        mode: 'trending',
        timeWindow: 'today',
        sortBy: 'views',
        limit: 10,
        saveSnapshot: true,
        skipAi: true
      });

    if (res.status !== 200) {
      console.warn('Weibo discover skipped (network):', res.body);
      return;
    }

    expect(res.body.results.length).toBeGreaterThan(0);
    expect(res.body.results[0].metricLabels?.primary).toBeTruthy();
    expect(res.body.meta.source).toBe('weibo');

    const history = await request(app).get(
      '/api/discover/snapshots?source=weibo&timeWindow=today'
    );
    expect(history.status).toBe(200);
    expect(history.body.history.length).toBeGreaterThan(0);
  }, 30000);

  it('POST /api/discover/insight/generate returns keywords and summary', async () => {
    await request(app)
      .post('/api/discover')
      .send({
        source: 'github',
        mode: 'trending',
        timeWindow: 'today',
        sortBy: 'hot',
        limit: 5,
        saveSnapshot: true,
        skipAi: true
      });

    const res = await request(app)
      .post('/api/discover/insight/generate')
      .send({
        source: 'github',
        period: '7d',
        sortBy: 'hot',
        force: true
      });

    expect(res.status).toBe(200);
    expect(res.body.insight.summary).toBeTruthy();
    expect(Array.isArray(res.body.insight.topKeywords)).toBe(true);
    expect(res.body.insight.stats).toHaveProperty('snapshotCount');
  }, 30000);
});
