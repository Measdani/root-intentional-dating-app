import type { BlogArticle } from '@/types';

export const sampleBlogs: BlogArticle[] = [
  {
    id: 'blog-1',
    title: 'The Relationship Readiness Philosophy',
    excerpt: 'Why emotional stability matters more than attraction alone in building lasting partnerships.',
    content: 'Strong, lasting partnerships are not built on attraction alone. They require emotional regulation, accountability, boundary awareness, and the ability to repair conflict.\n\nAt Rooted Hearts, we believe that readiness is the foundation of alignment. By assessing emotional readiness before connection, we create a community of individuals committed to intentional partnership rather than casual disruption.\n\nThis approach protects you and others from emotional misalignment and reduces avoidable harm in connections.',
    category: 'Philosophy',
    author: 'Rooted Hearts',
    readTime: '5 min read',
    published: true,
    moduleOnly: false,
    createdAt: Date.now() - 7 * 24 * 60 * 60 * 1000, // 7 days ago
    updatedAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
  },
  {
    id: 'blog-2',
    title: 'Inner Work vs Alignment: Two Pathways to Love',
    excerpt: 'Understanding how growth and readiness create different connection environments.',
    content: 'At Rooted Hearts, we operate with two intentional connection environments designed to meet you where you are.\n\nInner Work Space is for individuals strengthening emotional regulation, building accountability skills, and working through past patterns. It\'s not a waiting room—it\'s a structured growth environment where development is supported and respected.\n\nAlignment Space is for those who demonstrate emotional stability, consistent accountability, and partnership readiness. This environment offers broader matchmaking access for those prepared to build stable, long-term partnerships.\n\nBoth are intentional. Both are valuable. The difference is in your current readiness.',
    category: 'Connection',
    author: 'Rooted Hearts',
    readTime: '7 min read',
    published: true,
    moduleOnly: false,
    createdAt: Date.now() - 14 * 24 * 60 * 60 * 1000, // 14 days ago
    updatedAt: Date.now() - 14 * 24 * 60 * 60 * 1000,
  },
  {
    id: 'blog-3',
    title: 'What We Believe About Intentional Dating',
    excerpt: 'The core values that guide Rooted Hearts and make us different from other platforms.',
    content: 'Rooted Hearts exists because we believe something different is possible in dating.\n\nWe believe that intention matters. That emotional stability creates better connections. That assessing readiness prevents avoidable harm. That growth is possible when effort is applied intentionally.\n\nWe are not built to be another swipe-based marketplace focused on volume. We are built to create emotionally stable, intentional partnerships.\n\nEvery feature, every policy, every decision at Rooted Hearts is guided by this belief: that dating works better when both people are genuinely ready for partnership.',
    category: 'Community',
    author: 'Rooted Hearts',
    readTime: '6 min read',
    published: true,
    moduleOnly: false,
    createdAt: Date.now() - 21 * 24 * 60 * 60 * 1000, // 21 days ago
    updatedAt: Date.now() - 21 * 24 * 60 * 60 * 1000,
  },
];
