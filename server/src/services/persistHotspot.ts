import { prisma } from '../db.js';
import type { SearchResult } from '../types.js';

export interface HotspotAnalysisPayload {
  isReal: boolean;
  relevance: number;
  relevanceReason?: string | null;
  keywordMentioned?: boolean | null;
  importance: string;
  summary?: string | null;
}

export interface SaveHotspotInput {
  title: string;
  content: string;
  url: string;
  source: string;
  sourceId?: string | null;
  isReal?: boolean;
  relevance?: number;
  relevanceReason?: string | null;
  keywordMentioned?: boolean | null;
  importance?: string;
  summary?: string | null;
  viewCount?: number | null;
  likeCount?: number | null;
  retweetCount?: number | null;
  replyCount?: number | null;
  commentCount?: number | null;
  quoteCount?: number | null;
  danmakuCount?: number | null;
  authorName?: string | null;
  authorUsername?: string | null;
  authorAvatar?: string | null;
  authorFollowers?: number | null;
  authorVerified?: boolean | null;
  publishedAt?: string | Date | null;
}

export async function resolveKeywordId(
  keywordId?: string,
  keywordText?: string
): Promise<string | null> {
  if (keywordId) {
    const k = await prisma.keyword.findUnique({ where: { id: keywordId } });
    if (k) return k.id;
  }
  if (keywordText?.trim()) {
    const k = await prisma.keyword.findUnique({
      where: { text: keywordText.trim() }
    });
    if (k) return k.id;
    const created = await prisma.keyword.create({
      data: { text: keywordText.trim() }
    });
    return created.id;
  }
  return null;
}

export async function persistHotspot(
  item: SaveHotspotInput,
  keywordId: string | null,
  options?: { createNotification?: boolean }
): Promise<{ hotspot: Awaited<ReturnType<typeof prisma.hotspot.create>>; created: boolean }> {
  const publishedAt =
    item.publishedAt instanceof Date
      ? item.publishedAt
      : item.publishedAt
        ? new Date(item.publishedAt)
        : null;

  const data = {
    title: item.title,
    content: item.content,
    url: item.url,
    source: item.source,
    sourceId: item.sourceId ?? null,
    isReal: item.isReal ?? true,
    relevance: item.relevance ?? 50,
    relevanceReason: item.relevanceReason ?? null,
    keywordMentioned: item.keywordMentioned ?? null,
    importance: item.importance ?? 'medium',
    summary: item.summary ?? null,
    viewCount: item.viewCount ?? null,
    likeCount: item.likeCount ?? null,
    retweetCount: item.retweetCount ?? null,
    replyCount: item.replyCount ?? null,
    commentCount: item.commentCount ?? null,
    quoteCount: item.quoteCount ?? null,
    danmakuCount: item.danmakuCount ?? null,
    authorName: item.authorName ?? null,
    authorUsername: item.authorUsername ?? null,
    authorAvatar: item.authorAvatar ?? null,
    authorFollowers: item.authorFollowers ?? null,
    authorVerified: item.authorVerified ?? null,
    publishedAt,
    keywordId
  };

  const existing = await prisma.hotspot.findUnique({
    where: { url_source: { url: item.url, source: item.source } }
  });

  if (existing) {
    const hotspot = await prisma.hotspot.update({
      where: { id: existing.id },
      data: {
        relevance: data.relevance,
        importance: data.importance,
        summary: data.summary,
        isReal: data.isReal,
        relevanceReason: data.relevanceReason,
        keywordMentioned: data.keywordMentioned,
        keywordId: keywordId ?? existing.keywordId
      },
      include: { keyword: true }
    });
    return { hotspot, created: false };
  }

  const hotspot = await prisma.hotspot.create({
    data,
    include: { keyword: true }
  });

  if (options?.createNotification !== false) {
    await prisma.notification.create({
      data: {
        type: 'hotspot',
        title: `入库热点: ${hotspot.title.slice(0, 50)}`,
        content: hotspot.summary || hotspot.content.slice(0, 100),
        hotspotId: hotspot.id
      }
    });
  }

  return { hotspot, created: true };
}

export function searchResultToSaveInput(
  item: SearchResult,
  analysis: HotspotAnalysisPayload
): SaveHotspotInput {
  return {
    title: item.title,
    content: item.content,
    url: item.url,
    source: item.source,
    sourceId: item.sourceId ?? null,
    isReal: analysis.isReal,
    relevance: analysis.relevance,
    relevanceReason: analysis.relevanceReason ?? null,
    keywordMentioned: analysis.keywordMentioned ?? null,
    importance: analysis.importance,
    summary: analysis.summary ?? null,
    viewCount: item.viewCount ?? null,
    likeCount: item.likeCount ?? null,
    retweetCount: item.retweetCount ?? null,
    replyCount: item.replyCount ?? null,
    commentCount: item.commentCount ?? null,
    quoteCount: item.quoteCount ?? null,
    danmakuCount: item.danmakuCount ?? null,
    authorName: item.author?.name ?? null,
    authorUsername: item.author?.username ?? null,
    authorAvatar: item.author?.avatar ?? null,
    authorFollowers: item.author?.followers ?? null,
    authorVerified: item.author?.verified ?? null,
    publishedAt: item.publishedAt ?? null
  };
}
