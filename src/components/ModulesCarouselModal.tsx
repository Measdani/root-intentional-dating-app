import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface Module {
  id?: string;
  title: string;
  description: string;
  exercise?: string;
  orderIndex?: number;
}

interface ModulesCarouselModalProps {
  isOpen: boolean;
  resourceTitle: string;
  modules: Module[];
  onClose: () => void;
}

const ModulesCarouselModal: React.FC<ModulesCarouselModalProps> = ({
  isOpen,
  resourceTitle,
  modules,
  onClose,
}) => {
  const [currentModuleIndex, setCurrentModuleIndex] = useState(0);

  if (!isOpen || !modules || modules.length === 0) return null;

  const currentModule = modules[currentModuleIndex];
  const hasNext = currentModuleIndex < modules.length - 1;
  const hasPrev = currentModuleIndex > 0;

  const handleNext = () => {
    if (hasNext) setCurrentModuleIndex(currentModuleIndex + 1);
  };

  const handlePrev = () => {
    if (hasPrev) setCurrentModuleIndex(currentModuleIndex - 1);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[#0B0F0C]/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-[#111611] rounded-[28px] border border-[#1A211A] p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-scale-in">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#1A211A] flex items-center justify-center text-[#A9B5AA] hover:text-[#F6FFF2] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="mb-8">
          <h2 className="font-display text-3xl text-[#F6FFF2] mb-2">{resourceTitle}</h2>
          <p className="text-[#A9B5AA]">
            Module {currentModuleIndex + 1} of {modules.length}
          </p>
        </div>

        {/* Module Content */}
        <div className="space-y-6 mb-8">
          <div>
            <h3 className="text-2xl font-display text-[#D9FF3D] mb-3">{currentModule.title}</h3>
            <div className="text-[#A9B5AA] text-base leading-relaxed space-y-2">
              {currentModule.description.split('\n').map((line, idx) => (
                <p key={idx} className="whitespace-pre-wrap">
                  {line}
                </p>
              ))}
            </div>
          </div>

          {currentModule.exercise && (
            <div className="bg-[#0B0F0C] rounded-lg p-6 border border-[#1A211A]">
              <h4 className="text-[#D9FF3D] font-medium mb-3 flex items-center gap-2">
                <span className="text-lg">✓</span>
                Exercise
              </h4>
              <div className="text-[#A9B5AA] leading-relaxed space-y-2">
                {currentModule.exercise.split('\n').map((line, idx) => (
                  <p key={idx} className="whitespace-pre-wrap">
                    {line}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="h-1.5 bg-[#1A211A] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#D9FF3D] transition-all duration-300"
              style={{ width: `${((currentModuleIndex + 1) / modules.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={handlePrev}
            disabled={!hasPrev}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
              hasPrev
                ? 'bg-[#1A211A] text-[#A9B5AA] hover:bg-[#2A3A2A] hover:text-[#F6FFF2]'
                : 'bg-[#1A211A] text-[#666] cursor-not-allowed opacity-50'
            }`}
          >
            <ChevronLeft className="w-5 h-5" />
            Previous
          </button>

          <div className="flex gap-2">
            {modules.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentModuleIndex(idx)}
                className={`w-2 h-2 rounded-full transition-all ${
                  idx === currentModuleIndex ? 'bg-[#D9FF3D] w-8' : 'bg-[#1A211A]'
                }`}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            disabled={!hasNext}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all ${
              hasNext
                ? 'bg-[#D9FF3D] text-[#0B0F0C] hover:bg-[#C4E622]'
                : 'bg-[#1A211A] text-[#666] cursor-not-allowed opacity-50'
            }`}
          >
            Next
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModulesCarouselModal;
