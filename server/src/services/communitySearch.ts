import axios from 'axios';
import type { SearchResult } from '../types.js';

class RateLimiter {
  private lastRequestTime = 0;
  constructor(private minIntervalMs: number) {}
  async wait(): Promise<void> {
    const elapsed = Date.now() - this.lastRequestTime;
    if (elapsed < this.minIntervalMs) {
      await new Promise((r) => setTimeout(r, this.minIntervalMs - elapsed));
    }
    this.lastRequestTime = Date.now();
  }
}

const githubLimiter = new RateLimiter(2000);
const huggingfaceLimiter = new RateLimiter(1500);

interface GitHubRepoSearch {
  items: Array<{
    id: number;
    full_name: string;
    html_url: string;
    description: string | null;
    stargazers_count: number;
    updated_at: string;
    owner: { login: string };
  }>;
}

/** GitHub 仓库搜索（官方 REST API，可选 GITHUB_TOKEN 提高限额） */
export async function searchGitHub(query: string): Promise<SearchResult[]> {
  await githubLimiter.wait();

  const token = process.env.GITHUB_TOKEN?.trim();
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'HotPulse-Monitor/1.0'
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const response = await axios.get<GitHubRepoSearch>(
      'https://api.github.com/search/repositories',
      {
        params: {
          q: `${query} in:name,description`,
          sort: 'updated',
          order: 'desc',
          per_page: 15
        },
        headers,
        timeout: 15000
      }
    );

    const results: SearchResult[] = response.data.items.map((repo) => ({
      title: repo.full_name,
      content: repo.description || `⭐ ${repo.stargazers_count.toLocaleString()} stars`,
      url: repo.html_url,
      source: 'github',
      sourceId: String(repo.id),
      publishedAt: new Date(repo.updated_at),
      score: repo.stargazers_count,
      author: {
        name: repo.owner.login,
        username: repo.owner.login
      }
    }));

    console.log(`GitHub search for "${query}": found ${results.length} results`);
    return results;
  } catch (error) {
    console.error('GitHub search error:', error);
    return [];
  }
}

interface HuggingFaceModel {
  id: string;
  modelId?: string;
  downloads?: number;
  likes?: number;
  pipeline_tag?: string;
  lastModified?: string;
}

/** Hugging Face Hub 模型搜索（https://huggingface.co/api/models） */
export async function searchHuggingFace(query: string): Promise<SearchResult[]> {
  await huggingfaceLimiter.wait();

  try {
    const response = await axios.get<HuggingFaceModel[]>(
      'https://huggingface.co/api/models',
      {
        params: {
          search: query,
          limit: 20,
          sort: 'downloads',
          direction: -1
        },
        headers: { Accept: 'application/json' },
        timeout: 15000
      }
    );

    const models = Array.isArray(response.data) ? response.data : [];
    const results: SearchResult[] = models.map((m) => {
      const modelId = m.modelId || m.id;
      const parts: string[] = [];
      if (m.pipeline_tag) parts.push(m.pipeline_tag);
      if (m.downloads != null) parts.push(`下载 ${m.downloads.toLocaleString()}`);
      if (m.likes != null) parts.push(`赞 ${m.likes}`);

      return {
        title: modelId,
        content: parts.join(' · ') || 'Hugging Face 模型',
        url: `https://huggingface.co/${modelId}`,
        source: 'huggingface',
        sourceId: modelId,
        publishedAt: m.lastModified ? new Date(m.lastModified) : undefined,
        likeCount: m.likes,
        viewCount: m.downloads
      };
    });

    console.log(`Hugging Face search for "${query}": found ${results.length} results`);
    return results;
  } catch (error) {
    console.error('Hugging Face search error:', error);
    return [];
  }
}
