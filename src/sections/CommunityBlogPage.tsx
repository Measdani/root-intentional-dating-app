import React, { useState, useEffect } from 'react';
import { useApp } from '@/store/AppContext';
import { ArrowLeft, BookOpen, Clock, Search } from 'lucide-react';
import type { BlogArticle } from '@/types';

const CommunityBlogPage: React.FC = () => {
  const { setCurrentView } = useApp();
  const [blogs, setBlogs] = useState<BlogArticle[]>([]);
  const [selectedBlog, setSelectedBlog] = useState<BlogArticle | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Load blogs from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('community-blogs');
    if (saved) {
      setBlogs(JSON.parse(saved));
    }
  }, []);

  const filteredBlogs = blogs.filter((blog) => {
    const matchesSearch = blog.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      blog.excerpt.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || blog.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(blogs.map(b => b.category)));

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (selectedBlog) {
    return (
      <div className="min-h-screen bg-[#0F140F] text-white">
        {/* Header */}
        <div className="sticky top-0 z-50 bg-[#111611]/95 backdrop-blur border-b border-[#1A211A] px-4 sm:px-6 py-4">
          <div className="max-w-4xl mx-auto flex items-center gap-3">
            <button
              onClick={() => setSelectedBlog(null)}
              className="p-2 hover:bg-[#1A211A] rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold">Back to Blog</h1>
          </div>
        </div>

        {/* Article */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
          <article>
            <header className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs bg-[#D9FF3D]/10 text-[#D9FF3D] px-3 py-1 rounded-full">
                  {selectedBlog.category}
                </span>
                {selectedBlog.readTime && (
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {selectedBlog.readTime} read
                  </span>
                )}
              </div>
              <h1 className="text-4xl font-bold mb-4">{selectedBlog.title}</h1>
              <div className="flex items-center justify-between text-sm text-gray-400">
                {selectedBlog.author && <span>By {selectedBlog.author}</span>}
                <span>{formatDate(selectedBlog.createdAt)}</span>
              </div>
            </header>

            <div className="prose prose-invert max-w-none">
              <div className="space-y-6">
                {selectedBlog.content.split('\n\n').map((paragraph, idx) => (
                  <p key={idx} className="text-gray-300 leading-relaxed text-lg">
                    {paragraph}
                  </p>
                ))}
              </div>
            </div>
          </article>

          {/* Related Articles */}
          <div className="mt-16 pt-8 border-t border-[#1A211A]">
            <h3 className="text-2xl font-bold mb-6">More from this category</h3>
            <div className="grid gap-4">
              {blogs
                .filter(b => b.category === selectedBlog.category && b.id !== selectedBlog.id)
                .slice(0, 3)
                .map((blog) => (
                  <div
                    key={blog.id}
                    onClick={() => setSelectedBlog(blog)}
                    className="bg-[#111611] border border-[#1A211A] rounded-lg p-4 cursor-pointer hover:border-[#D9FF3D] transition"
                  >
                    <h4 className="font-bold mb-2 hover:text-[#D9FF3D] transition">
                      {blog.title}
                    </h4>
                    <p className="text-sm text-gray-400">{blog.excerpt}</p>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F140F] text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#111611]/95 backdrop-blur border-b border-[#1A211A] px-4 sm:px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentView('landing')}
              className="p-2 hover:bg-[#1A211A] rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold">Community Blog</h1>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="bg-gradient-to-b from-[#111611] to-[#0F140F] px-4 sm:px-6 py-12 border-b border-[#1A211A]">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4">Why Rooted Was Built This Way</h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-8">
            Explore articles about intentional dating, growth, and building meaningful connections.
          </p>

          {/* Search */}
          <div className="max-w-2xl mx-auto flex gap-2 mb-8">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
              <input
                type="text"
                placeholder="Search articles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-[#111611] border border-[#1A211A] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-[#D9FF3D]"
              />
            </div>
          </div>

          {/* Categories */}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-center">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-4 py-2 rounded-full transition ${
                  selectedCategory === null
                    ? 'bg-[#D9FF3D] text-[#0B0F0C]'
                    : 'bg-[#1A211A] text-gray-300 hover:bg-[#252C25]'
                }`}
              >
                All
              </button>
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full transition ${
                    selectedCategory === category
                      ? 'bg-[#D9FF3D] text-[#0B0F0C]'
                      : 'bg-[#1A211A] text-gray-300 hover:bg-[#252C25]'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Blog List */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        {filteredBlogs.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 text-[#1A211A] mx-auto mb-4" />
            <p className="text-gray-400">No articles found</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {filteredBlogs.map((blog) => (
              <div
                key={blog.id}
                onClick={() => setSelectedBlog(blog)}
                className="bg-[#111611] border border-[#1A211A] rounded-lg p-6 cursor-pointer hover:border-[#D9FF3D] transition h-full flex flex-col"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs bg-[#D9FF3D]/10 text-[#D9FF3D] px-3 py-1 rounded-full">
                    {blog.category}
                  </span>
                  {blog.readTime && (
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {blog.readTime}
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-bold mb-3 group-hover:text-[#D9FF3D] transition line-clamp-2">
                  {blog.title}
                </h3>
                <p className="text-gray-400 mb-4 flex-1">{blog.excerpt}</p>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  {blog.author && <span>{blog.author}</span>}
                  <span>{formatDate(blog.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CommunityBlogPage;
