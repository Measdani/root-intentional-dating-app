import React from 'react';
import { X, ArrowLeft, Clock } from 'lucide-react';
import type { BlogArticle } from '@/types';

interface ModuleBlogModalProps {
  blog: BlogArticle | null;
  isOpen: boolean;
  onClose: () => void;
  onBack?: () => void;
}

const ModuleBlogModal: React.FC<ModuleBlogModalProps> = ({
  blog,
  isOpen,
  onClose,
  onBack,
}) => {
  if (!isOpen || !blog) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-[#0B0F0C]/90 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-[#111611] border border-[#1A211A] rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-[#111611] border-b border-[#1A211A] px-6 py-4 flex items-center justify-between">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-[#F6FFF2]">{blog.title}</h2>
            <div className="flex items-center gap-3 mt-2 text-sm text-gray-400">
              {blog.author && <span>{blog.author}</span>}
              {blog.readTime && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {blog.readTime}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-2 hover:bg-[#1A211A] rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8">
          <div className="prose prose-invert max-w-none text-gray-300">
            {blog.content.split('\n\n').map((paragraph, idx) => (
              <p key={idx} className="mb-4 leading-relaxed">
                {paragraph}
              </p>
            ))}
          </div>
        </div>

        {/* Footer with Navigation */}
        <div className="sticky bottom-0 bg-[#111611] border-t border-[#1A211A] px-6 py-4 flex gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="flex-1 py-3 px-4 bg-[#1A211A] text-white rounded-lg hover:bg-[#252C25] transition font-medium flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Module
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-[#D9FF3D] text-[#0B0F0C] rounded-lg hover:scale-[1.02] transition font-bold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModuleBlogModal;
