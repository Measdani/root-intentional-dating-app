import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, ArrowLeft, Clock } from 'lucide-react';
import type { BlogArticle } from '@/types';

interface ModuleBlogModalProps {
  blog: BlogArticle | null;
  isOpen: boolean;
  onClose: () => void;
  onBack?: () => void;
  onComplete?: () => void;
}

type ModuleInputBehaviorOption = {
  option: string;
  response: string;
};

type ModuleInputData = {
  version?: number;
  selfAwareness?: string;
  skillBuilding?: string;
  behaviorPractice?: {
    question?: string;
    options?: ModuleInputBehaviorOption[];
  };
  dating?: string;
  healthyTip?: string;
  healthyConversationStarters?: string;
};

const MODULE_INPUT_CONTENT_START = '[[MODULE_INPUT_JSON]]';
const MODULE_INPUT_CONTENT_END = '[[/MODULE_INPUT_JSON]]';

const parseModuleInputContent = (
  content: string
): { cleanedContent: string; moduleInputData: ModuleInputData | null } => {
  const startIdx = content.indexOf(MODULE_INPUT_CONTENT_START);
  const endIdx = content.indexOf(MODULE_INPUT_CONTENT_END);

  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    return { cleanedContent: content, moduleInputData: null };
  }

  const jsonRaw = content
    .slice(startIdx + MODULE_INPUT_CONTENT_START.length, endIdx)
    .trim();

  try {
    const parsed = JSON.parse(jsonRaw);
    if (!parsed || typeof parsed !== 'object') {
      return { cleanedContent: content, moduleInputData: null };
    }

    const cleanedContent = [
      content.slice(0, startIdx).trim(),
      content.slice(endIdx + MODULE_INPUT_CONTENT_END.length).trim(),
    ]
      .filter(Boolean)
      .join('\n\n');

    return { cleanedContent, moduleInputData: parsed as ModuleInputData };
  } catch (error) {
    console.warn('Failed to parse module input metadata:', error);
    return { cleanedContent: content, moduleInputData: null };
  }
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const ModuleBlogModal: React.FC<ModuleBlogModalProps> = ({
  blog,
  isOpen,
  onClose,
  onBack,
  onComplete,
}) => {
  if (!isOpen || !blog) return null;

  const { cleanedContent, moduleInputData } = useMemo(
    () => parseModuleInputContent(blog.content || ''),
    [blog.content]
  );

  const behaviorOptions = useMemo(() => {
    if (!moduleInputData?.behaviorPractice?.options) return [];
    return moduleInputData.behaviorPractice.options.filter(
      (entry): entry is ModuleInputBehaviorOption =>
        !!entry && isNonEmptyString(entry.option) && isNonEmptyString(entry.response)
    );
  }, [moduleInputData]);

  const [selectedBehaviorOption, setSelectedBehaviorOption] = useState<string>('');

  useEffect(() => {
    if (!behaviorOptions.length) {
      setSelectedBehaviorOption('');
      return;
    }

    const hasCurrent = behaviorOptions.some((entry) => entry.option === selectedBehaviorOption);
    if (!hasCurrent) {
      setSelectedBehaviorOption('');
    }
  }, [behaviorOptions, selectedBehaviorOption, blog.id]);

  const selectedBehaviorResponse =
    behaviorOptions.find((entry) => entry.option === selectedBehaviorOption)?.response || '';

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);

  const updateScrollCompletion = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const reachedBottom =
      container.scrollTop + container.clientHeight >= container.scrollHeight - 8;
    setHasScrolledToEnd(reachedBottom);
  };

  useEffect(() => {
    setHasScrolledToEnd(false);
    const frame = window.requestAnimationFrame(() => {
      updateScrollCompletion();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [blog.id, cleanedContent, moduleInputData, behaviorOptions.length]);

  const requiresBehaviorSelection = !!moduleInputData && behaviorOptions.length > 0;
  const hasSelectedBehaviorOption = selectedBehaviorOption.trim().length > 0;
  const canComplete =
    hasScrolledToEnd && (!requiresBehaviorSelection || hasSelectedBehaviorOption);

  const handleComplete = () => {
    if (!canComplete) return;
    if (onComplete) {
      onComplete();
      return;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-[#0B0F0C]/90 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        ref={scrollContainerRef}
        onScroll={updateScrollCompletion}
        className="relative bg-[#111611] border border-[#1A211A] rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto"
      >
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
          {moduleInputData ? (
            <div className="space-y-6">
              {isNonEmptyString(moduleInputData.selfAwareness) && (
                <div className="rounded-xl border border-[#2A312A] bg-[#0B0F0C] p-4">
                  <h3 className="text-xs uppercase tracking-[0.18em] text-[#D9FF3D] mb-2">Self-Awareness</h3>
                  <p className="text-[#F6FFF2] whitespace-pre-wrap">{moduleInputData.selfAwareness}</p>
                </div>
              )}

              {isNonEmptyString(moduleInputData.skillBuilding) && (
                <div className="rounded-xl border border-[#2A312A] bg-[#0B0F0C] p-4">
                  <h3 className="text-xs uppercase tracking-[0.18em] text-[#D9FF3D] mb-2">Skill Building</h3>
                  <p className="text-[#F6FFF2] whitespace-pre-wrap">{moduleInputData.skillBuilding}</p>
                </div>
              )}

              {(isNonEmptyString(moduleInputData.behaviorPractice?.question) || behaviorOptions.length > 0) && (
                <div className="rounded-xl border border-[#2A312A] bg-[#0B0F0C] p-4 space-y-3">
                  <h3 className="text-xs uppercase tracking-[0.18em] text-[#D9FF3D]">Behavior Practice</h3>
                  {isNonEmptyString(moduleInputData.behaviorPractice?.question) && (
                    <p className="text-[#F6FFF2] font-medium whitespace-pre-wrap">
                      {moduleInputData.behaviorPractice?.question}
                    </p>
                  )}
                  {behaviorOptions.length > 0 && (
                    <>
                      <select
                        value={selectedBehaviorOption}
                        onChange={(event) => setSelectedBehaviorOption(event.target.value)}
                        className="w-full px-3 py-2 bg-[#111611] border border-[#1A211A] rounded-lg text-[#F6FFF2] focus:outline-none focus:border-[#D9FF3D]"
                      >
                        <option value="">Select option</option>
                        {behaviorOptions.map((entry, idx) => (
                          <option key={`behavior-option-${idx}`} value={entry.option}>
                            {entry.option}
                          </option>
                        ))}
                      </select>
                      {hasSelectedBehaviorOption && (
                        <div className="rounded-lg border border-[#1A211A] bg-[#111611] p-3 text-[#F6FFF2] whitespace-pre-wrap min-h-[80px]">
                          {selectedBehaviorResponse}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {isNonEmptyString(moduleInputData.dating) && (
                <div className="rounded-xl border border-[#2A312A] bg-[#0B0F0C] p-4">
                  <h3 className="text-xs uppercase tracking-[0.18em] text-[#D9FF3D] mb-2">Dating</h3>
                  <p className="text-[#F6FFF2] whitespace-pre-wrap">{moduleInputData.dating}</p>
                </div>
              )}

              {isNonEmptyString(moduleInputData.healthyTip) && (
                <div className="rounded-xl border border-[#2A312A] bg-[#0B0F0C] p-4">
                  <h3 className="text-xs uppercase tracking-[0.18em] text-[#D9FF3D] mb-2">Healthy Tip</h3>
                  <p className="text-[#F6FFF2] whitespace-pre-wrap">{moduleInputData.healthyTip}</p>
                </div>
              )}

              {isNonEmptyString(moduleInputData.healthyConversationStarters) && (
                <div className="rounded-xl border border-[#2A312A] bg-[#0B0F0C] p-4">
                  <h3 className="text-xs uppercase tracking-[0.18em] text-[#D9FF3D] mb-2">Healthy Conversation Starters</h3>
                  <p className="text-[#F6FFF2] whitespace-pre-wrap">
                    {moduleInputData.healthyConversationStarters}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="prose prose-invert max-w-none text-gray-300">
              {(blog.content || '')
                .split('\n\n')
                .map((paragraph) => paragraph.trim())
                .filter(Boolean)
                .map((paragraph, idx) => (
                  <p key={idx} className="mb-4 leading-relaxed">
                    {paragraph}
                  </p>
                ))}
            </div>
          )}
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
            onClick={handleComplete}
            disabled={!canComplete}
            className="flex-1 py-3 px-4 bg-[#D9FF3D] text-[#0B0F0C] rounded-lg hover:scale-[1.02] transition font-bold disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            Complete
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModuleBlogModal;
