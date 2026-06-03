export interface KeywordTemplate {
  id: string;
  name: string;
  description: string;
  keywords: { text: string; category: string }[];
}

export const KEYWORD_TEMPLATES: KeywordTemplate[] = [
  {
    id: 'ai-models',
    name: 'AI 大模型',
    description: '主流大模型与厂商动态',
    keywords: [
      { text: 'GPT-5', category: 'AI大模型' },
      { text: 'Claude', category: 'AI大模型' },
      { text: 'Gemini', category: 'AI大模型' },
      { text: 'DeepSeek', category: 'AI大模型' },
      { text: '通义千问', category: 'AI大模型' }
    ]
  },
  {
    id: 'ai-coding',
    name: 'AI 编程工具',
    description: '编程助手与开发工具',
    keywords: [
      { text: 'Cursor', category: 'AI编程' },
      { text: 'GitHub Copilot', category: 'AI编程' },
      { text: 'Windsurf', category: 'AI编程' },
      { text: 'v0', category: 'AI编程' }
    ]
  },
  {
    id: 'ai-news',
    name: 'AI 行业资讯',
    description: '泛 AI 热点与政策',
    keywords: [
      { text: '人工智能', category: '行业' },
      { text: 'AGI', category: '行业' },
      { text: 'AI监管', category: '行业' }
    ]
  }
];
