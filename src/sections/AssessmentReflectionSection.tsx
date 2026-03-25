import React, { useState } from 'react';
import { useApp } from '@/store/AppContext';
import {
  communityIdToPoolId,
  getUserPoolId,
  persistUserPoolMembership,
  toAdvancedPool,
  toInnerPool,
  useCommunity,
} from '@/modules';
import { userService } from '@/services/userService';
import { BookOpen, ArrowRight } from 'lucide-react';
import { PATH_LABELS } from '@/lib/pathways';

const AssessmentReflectionSection: React.FC = () => {
  const { assessmentResult, setCurrentView } = useApp();
  const { activeCommunityId } = useCommunity();
  const [selectedBlog, setSelectedBlog] = useState<string | null>(null);

  if (!assessmentResult) return null;

  const isInnerWork = !assessmentResult.passed;

  // Sample strengths and development areas
  const strengths = [
    'You demonstrate genuine self-awareness about your values and boundaries',
    'Your honesty in responses shows readiness to do intentional work',
    'You\'ve reflected deeply on what partnership truly means to you',
    'Your openness to growth signals maturity in relationship readiness'
  ];

  const developmentAreas = [
    'Deeper understanding of your attachment patterns and triggers',
    'Expanding your emotional vocabulary and communication clarity',
    'Building confidence in expressing needs within relationships',
    'Exploring family patterns that shape your relational choices'
  ];

  const blogOptions = [
    {
      id: 'values',
      title: 'Understanding Core Values in Partnership',
      category: 'Foundation'
    },
    {
      id: 'attachment',
      title: 'Attachment Styles & Relational Health',
      category: 'Growth'
    },
    {
      id: 'communication',
      title: 'Intentional Communication Skills',
      category: 'Skills'
    }
  ];

  const handleEnterSpace = () => {
    // Write assessmentPassed + score back to currentUser in localStorage
    try {
      const savedUser = localStorage.getItem('currentUser');
      if (savedUser) {
        const rawUser = JSON.parse(savedUser);
        const currentPoolId = getUserPoolId(rawUser, communityIdToPoolId(activeCommunityId));
        const nextPoolId = assessmentResult.passed
          ? toAdvancedPool(currentPoolId)
          : toInnerPool(currentPoolId);
        const updated = {
          ...rawUser,
          assessmentPassed: assessmentResult.passed,
          alignmentScore: assessmentResult.percentage,
          primaryStyle: assessmentResult.primaryStyle,
          secondaryStyle: assessmentResult.secondaryStyle,
          userStatus: assessmentResult.passed ? 'active' : 'needs-growth',
          poolId: nextPoolId,
        };
        persistUserPoolMembership(updated, nextPoolId);
        localStorage.setItem('currentUser', JSON.stringify(updated));
        void userService.updateUser(updated.id, {
          assessmentPassed: updated.assessmentPassed,
          alignmentScore: updated.alignmentScore,
          primaryStyle: updated.primaryStyle,
          secondaryStyle: updated.secondaryStyle,
          userStatus: updated.userStatus,
          poolId: updated.poolId,
        });
        window.dispatchEvent(new CustomEvent('user-login', { detail: updated }));
      }
    } catch (err) {
      console.error('Failed to update assessmentPassed:', err);
    }

    // Route based on assessment result
    if (assessmentResult.passed) {
      setCurrentView('browse');
    } else {
      setCurrentView('growth-mode');
    }
  };

  const handleVisitBlog = () => {
    setCurrentView('community-blog');
  };

  return (
    <div className="min-h-screen bg-[#0B0F0C] flex items-center justify-center p-4 md:p-6">
      {/* Background */}
      <div className="fixed inset-0">
        <img
          src="https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1920&q=80"
          alt="Forest"
          className="w-full h-full object-cover opacity-25"
        />
        <div className="absolute inset-0 gradient-vignette" />
        <div className="absolute inset-0 bg-[#0B0F0C]/75" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="font-display text-[clamp(36px,6vw,56px)] text-[#F6FFF2] mb-4">
            Relationship Readiness Reflection
          </h1>
          <p className="text-[#A9B5AA] text-lg max-w-2xl mx-auto">
            {isInnerWork
              ? 'Your path to lasting partnership begins with inner clarity.'
              : 'You\'re ready to meet someone aligned with your values.'}
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Strengths & Development */}
          <div className="space-y-8">
            {/* Strengths */}
            <div className="bg-[#111611]/80 backdrop-blur-sm rounded-[24px] border border-[#1A211A] p-8">
              <h2 className="text-[#D9FF3D] font-display text-xl mb-4">Your Strengths</h2>
              <ul className="space-y-3">
                {strengths.map((strength, idx) => (
                  <li key={idx} className="flex gap-3 text-[#A9B5AA] text-sm leading-relaxed">
                    <span className="text-[#D9FF3D] font-bold flex-shrink-0">•</span>
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Development Areas */}
            <div className="bg-[#111611]/80 backdrop-blur-sm rounded-[24px] border border-[#1A211A] p-8">
              <h2 className="text-amber-500 font-display text-xl mb-4">Areas for Continued Development</h2>
              <ul className="space-y-3">
                {developmentAreas.map((area, idx) => (
                  <li key={idx} className="flex gap-3 text-[#A9B5AA] text-sm leading-relaxed">
                    <span className="text-amber-500 font-bold flex-shrink-0">•</span>
                    <span>{area}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Placement & Blog CTAs */}
          <div className="space-y-8">
            {/* Placement Explanation */}
            <div className="bg-[#111611]/80 backdrop-blur-sm rounded-[24px] border border-[#1A211A] p-8">
              <h2 className="font-display text-xl mb-4 text-[#F6FFF2]">
                {isInnerWork ? PATH_LABELS.intentional : PATH_LABELS.alignment}
              </h2>
              <p className="text-[#A9B5AA] text-sm leading-relaxed mb-4">
                {isInnerWork
                  ? `${PATH_LABELS.intentional} is a structured environment designed to help you explore your patterns, clarify your values, and build the relational foundation needed for lasting partnership.`
                  : `${PATH_LABELS.alignment} is where you'll discover compatible partners who share your vision for intentional relationships built on shared values.`}
              </p>
              {isInnerWork && (
                <p className="text-[#A9B5AA] text-sm leading-relaxed text-amber-500/80">
                  You\'ll be able to retake this assessment in 6 months to track your progress.
                </p>
              )}
            </div>

            {/* Blog CTAs */}
            <div className="bg-[#111611]/80 backdrop-blur-sm rounded-[24px] border border-[#1A211A] p-8">
              <h2 className="font-display text-lg mb-4 text-[#F6FFF2]">Explore Resources</h2>
              <p className="text-[#A9B5AA] text-sm mb-4">
                {isInnerWork
                  ? 'Explore our collection of articles to deepen your understanding.'
                  : 'Learn more about building healthy, intentional relationships.'}
              </p>
              <div className="space-y-2">
                {blogOptions.map((blog) => (
                  <button
                    key={blog.id}
                    onClick={() => setSelectedBlog(blog.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
                      selectedBlog === blog.id
                        ? 'bg-[#D9FF3D]/10 border-[#D9FF3D] text-[#D9FF3D]'
                        : 'bg-[#0B0F0C]/50 border-[#1A211A] text-[#A9B5AA] hover:border-[#D9FF3D]/50'
                    }`}
                  >
                    <div className="font-medium text-sm">{blog.title}</div>
                    <div className="text-xs opacity-75">{blog.category}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={handleEnterSpace}
            className="btn-primary flex items-center justify-center gap-2 order-2 sm:order-1"
          >
            Enter Your Space
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={handleVisitBlog}
            className="px-6 py-3 rounded-lg border border-[#D9FF3D] text-[#D9FF3D] hover:bg-[#D9FF3D]/10 transition-all duration-200 font-medium flex items-center justify-center gap-2 order-1 sm:order-2"
          >
            <BookOpen className="w-4 h-4" />
            Visit Blog to Learn More
          </button>
        </div>

        {/* Score Info (subtle) */}
        <div className="text-center mt-12">
          <p className="text-[#A9B5AA] text-sm">
            Your assessment score: <span className="text-[#D9FF3D] font-semibold">{assessmentResult.percentage}%</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AssessmentReflectionSection;
