import { Router } from 'express';
import { prisma } from '../db.js';
import { KEYWORD_TEMPLATES } from '../data/keywordTemplates.js';

const router = Router();

// 预设关键词模板
router.get('/templates', (_req, res) => {
  res.json(KEYWORD_TEMPLATES);
});

// 批量导入（跳过已存在词）
router.post('/import', async (req, res) => {
  try {
    const { templateId, keywords: rawKeywords } = req.body as {
      templateId?: string;
      keywords?: { text: string; category?: string }[];
    };

    let toImport: { text: string; category: string | null }[] = [];

    if (templateId) {
      const tpl = KEYWORD_TEMPLATES.find((t) => t.id === templateId);
      if (!tpl) {
        return res.status(404).json({ error: 'Template not found' });
      }
      toImport = tpl.keywords.map((k) => ({
        text: k.text,
        category: k.category
      }));
    } else if (Array.isArray(rawKeywords) && rawKeywords.length > 0) {
      toImport = rawKeywords
        .filter((k) => k?.text && typeof k.text === 'string')
        .map((k) => ({
          text: k.text.trim(),
          category: k.category?.trim() || null
        }));
    } else {
      return res.status(400).json({ error: 'templateId or keywords array required' });
    }

    const existing = await prisma.keyword.findMany({
      where: { text: { in: toImport.map((k) => k.text) } },
      select: { text: true }
    });
    const existingSet = new Set(existing.map((e) => e.text));

    const created = [];
    const skipped = [];

    for (const item of toImport) {
      if (existingSet.has(item.text)) {
        skipped.push(item.text);
        continue;
      }
      try {
        const kw = await prisma.keyword.create({ data: item });
        created.push(kw);
        existingSet.add(item.text);
      } catch {
        skipped.push(item.text);
      }
    }

    res.status(201).json({
      created: created.length,
      skipped: skipped.length,
      skippedTexts: skipped,
      keywords: created
    });
  } catch (error) {
    console.error('Error importing keywords:', error);
    res.status(500).json({ error: 'Failed to import keywords' });
  }
});

// 导出关键词 JSON
router.get('/export', async (_req, res) => {
  try {
    const keywords = await prisma.keyword.findMany({
      orderBy: { createdAt: 'asc' },
      select: {
        text: true,
        category: true,
        isActive: true,
        lastScannedAt: true
      }
    });
    res.json({
      exportedAt: new Date().toISOString(),
      version: 1,
      keywords
    });
  } catch (error) {
    console.error('Error exporting keywords:', error);
    res.status(500).json({ error: 'Failed to export keywords' });
  }
});

// 获取所有关键词
router.get('/', async (req, res) => {
  try {
    const keywords = await prisma.keyword.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { hotspots: true }
        }
      }
    });
    res.json(keywords);
  } catch (error) {
    console.error('Error fetching keywords:', error);
    res.status(500).json({ error: 'Failed to fetch keywords' });
  }
});

// 获取单个关键词
router.get('/:id', async (req, res) => {
  try {
    const keyword = await prisma.keyword.findUnique({
      where: { id: req.params.id },
      include: {
        hotspots: {
          orderBy: { createdAt: 'desc' },
          take: 20
        }
      }
    });

    if (!keyword) {
      return res.status(404).json({ error: 'Keyword not found' });
    }

    res.json(keyword);
  } catch (error) {
    console.error('Error fetching keyword:', error);
    res.status(500).json({ error: 'Failed to fetch keyword' });
  }
});

// 创建关键词
router.post('/', async (req, res) => {
  try {
    const { text, category } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'Keyword text is required' });
    }

    const keyword = await prisma.keyword.create({
      data: {
        text: text.trim(),
        category: category?.trim() || null
      }
    });

    res.status(201).json(keyword);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Keyword already exists' });
    }
    console.error('Error creating keyword:', error);
    res.status(500).json({ error: 'Failed to create keyword' });
  }
});

// 更新关键词
router.put('/:id', async (req, res) => {
  try {
    const { text, category, isActive } = req.body;

    const keyword = await prisma.keyword.update({
      where: { id: req.params.id },
      data: {
        ...(text && { text: text.trim() }),
        ...(category !== undefined && { category: category?.trim() || null }),
        ...(isActive !== undefined && { isActive })
      }
    });

    res.json(keyword);
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Keyword not found' });
    }
    console.error('Error updating keyword:', error);
    res.status(500).json({ error: 'Failed to update keyword' });
  }
});

// 删除关键词
router.delete('/:id', async (req, res) => {
  try {
    await prisma.keyword.delete({
      where: { id: req.params.id }
    });

    res.status(204).send();
  } catch (error: any) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Keyword not found' });
    }
    console.error('Error deleting keyword:', error);
    res.status(500).json({ error: 'Failed to delete keyword' });
  }
});

// 切换关键词状态
router.patch('/:id/toggle', async (req, res) => {
  try {
    const keyword = await prisma.keyword.findUnique({
      where: { id: req.params.id }
    });

    if (!keyword) {
      return res.status(404).json({ error: 'Keyword not found' });
    }

    const updated = await prisma.keyword.update({
      where: { id: req.params.id },
      data: { isActive: !keyword.isActive }
    });

    res.json(updated);
  } catch (error) {
    console.error('Error toggling keyword:', error);
    res.status(500).json({ error: 'Failed to toggle keyword' });
  }
});

export default router;
