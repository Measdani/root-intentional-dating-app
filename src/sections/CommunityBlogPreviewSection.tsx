import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '@/store/AppContext';
import { sampleBlogs } from '@/data/blogs';
import { BookOpen, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import type { BlogArticle } from '@/types';
import { blogService } from '@/services/blogService';

const CommunityBlogPreviewSection: React.FC = () => {
  const { setCurrentView } = useApp();
  const [isVisible, setIsVisible] = useState(false);
  const [blogs, setBlogs] = useState<BlogArticle[]>([]);
  const [currentBlogIndex, setCurrentBlogIndex] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);

  // Load public blogs from Supabase or localStorage, fallback to sample blogs
  useEffect(() => {
    const loadBlogs = async () => {
      try {
        const supabaseBlogList = await blogService.getAllBlogs();
        if (supabaseBlogList.length > 0) {
          // Only show public blogs (not module-only)
          const publicBlogs = supabaseBlogList.filter(b => !b.moduleOnly);
          setBlogs(publicBlogs.slice(0, 6)); // Show up to 6
          return;
        }
      } catch (error) {
        console.error('Error loading blogs from Supabase:', error);
      }

      // Try localStorage as fallback
      try {
        const saved = localStorage.getItem('community-blogs');
        if (saved) {
          const localBlogs = JSON.parse(saved);
          const publicBlogs = localBlogs.filter((b: BlogArticle) => !b.moduleOnly);
          setBlogs(publicBlogs.slice(0, 6));
          return;
        }
      } catch (error) {
        console.error('Error loading blogs from localStorage:', error);
      }

      // Use sample blogs as final fallback
      const publicSamples = sampleBlogs.filter(b => !b.moduleOnly);
      setBlogs(publicSamples.slice(0, 6));
    };

    loadBlogs();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="section-community-blog-preview"
      className="section-pinned bg-[#0B0F0C] py-20 px-4 md:px-8"
    >
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 gradient-vignette opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0B0F0C] via-[#111611] to-[#0B0F0C]" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2
            className={`font-display text-[clamp(32px,5vw,56px)] text-[#F6FFF2] mb-4 transition-all duration-700 delay-300 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            Community<br />Blog
          </h2>
          <p
            className={`text-[#A9B5AA] text-base md:text-lg max-w-2xl mx-auto transition-all duration-700 delay-500 ${
              isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
          >
            Insights, stories, and guidance from our community exploring intentional relationships.
          </p>
        </div>

        {/* Blog Grid */}
        {blogs.length > 0 ? (
          <>
            <div
              className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 transition-all duration-700 delay-700 ${
                isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
              }`}
            >
              {blogs.map((blog, idx) => (
                <button
                  key={blog.id}
                  onClick={() => setCurrentView('community-blog')}
                  className="group text-left h-full"
                >
                  <div className="h-full bg-[#111611]/60 border border-[#1A211A] rounded-lg p-5 hover:border-[#D9FF3D]/50 hover:bg-[#1A211A] transition-all duration-300 flex flex-col">
                    {/* Category & Read Time */}
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-xs bg-[#D9FF3D]/10 text-[#D9FF3D] px-2 py-1 rounded">
                        {blog.category}
                      </span>
                      {blog.readTime && (
                        <span className="text-xs text-[#A9B5AA] flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {blog.readTime}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="text-[#F6FFF2] font-semibold text-base mb-2 line-clamp-2 group-hover:text-[#D9FF3D] transition-colors">
                      {blog.title}
                    </h3>

                    {/* Excerpt */}
                    <p className="text-[#A9B5AA] text-sm flex-1 line-clamp-3 mb-4">
                      {blog.excerpt}
                    </p>

                    {/* Author */}
                    {blog.author && (
                      <p className="text-xs text-[#A9B5AA]">
                        By {blog.author}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* View All Button */}
            <div
              className={`text-center mt-12 transition-all duration-700 delay-900 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              <button
                onClick={() => setCurrentView('community-blog')}
                className="btn-primary"
              >
                <BookOpen className="w-4 h-4 inline mr-2" />
                View All Articles
              </button>
            </div>
          </>
        ) : (
          <div className="text-center text-[#A9B5AA]">
            <p>Blog articles coming soon...</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default CommunityBlogPreviewSection;
