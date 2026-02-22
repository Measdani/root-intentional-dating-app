import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '@/store/AppContext';
import { assessmentQuestions, followUpQuestions, calculateAssessmentResult } from '@/data/assessment';
import { ChevronRight, AlertCircle, BookOpen, Clock } from 'lucide-react';
import type { BlogArticle } from '@/types';
import { blogService } from '@/services/blogService';

const AssessmentSection: React.FC = () => {
  const {
    assessmentAnswers,
    addAssessmentAnswer,
    setAssessmentResult,
    saveAssessmentDate,
    setCurrentView
  } = useApp();

  const [isVisible, setIsVisible] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [blogs, setBlogs] = useState<BlogArticle[]>([]);
  const [currentBlogIndex, setCurrentBlogIndex] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);

  // Load blogs from Supabase
  useEffect(() => {
    const loadBlogs = async () => {
      try {
        const supabaseBlogList = await blogService.getAllBlogs();
        if (supabaseBlogList.length > 0) {
          // Only show public blogs (not module-only)
          const publicBlogs = supabaseBlogList.filter(b => !b.moduleOnly);
          setBlogs(publicBlogs.slice(0, 3)); // Show latest 3
        }
      } catch (error) {
        console.error('Error loading blogs:', error);
      }
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

  // Fallback for standalone assessment rendering (not embedded in landing page)
  useEffect(() => {
    const fallback = setTimeout(() => setIsVisible(true), 200);
    return () => clearTimeout(fallback);
  }, []);

  const currentQuestions = showFollowUp ? followUpQuestions : assessmentQuestions;
  const currentQuestion = currentQuestions[currentQuestionIndex];
  const progress = ((assessmentAnswers.length) / (assessmentQuestions.length + 2)) * 100;

  const handleAnswer = (score: number, redFlag?: boolean) => {
    if (isTransitioning) return;
    
    setIsTransitioning(true);
    addAssessmentAnswer(currentQuestion.id, score, redFlag);

    // Check for integrity triggers
    if (!showFollowUp && redFlag && assessmentAnswers.filter(a => a.redFlag).length >= 2) {
      setShowFollowUp(true);
      setCurrentQuestionIndex(0);
      setIsTransitioning(false);
      return;
    }

    setTimeout(() => {
      if (currentQuestionIndex < currentQuestions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        setIsTransitioning(false);
      } else if (!showFollowUp && assessmentAnswers.filter(a => a.redFlag).length >= 2) {
        setShowFollowUp(true);
        setCurrentQuestionIndex(0);
        setIsTransitioning(false);
      } else {
        // Complete assessment
        const finalAnswers = [...assessmentAnswers, { questionId: currentQuestion.id, score, redFlag }];
        const result = calculateAssessmentResult(finalAnswers);
        setAssessmentResult(result);
        saveAssessmentDate();
        setCurrentView('assessment-result');
        setIsTransitioning(false);
      }
    }, 400);
  };

  const startAssessment = () => {
    const questionsContainer = document.getElementById('questions-container');
    if (questionsContainer) {
      questionsContainer.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section
      ref={sectionRef}
      id="section-assessment"
      className="section-pinned bg-[#0B0F0C] flex items-center justify-center"
    >
      {/* Background */}
      <div className="absolute inset-0">
        <img
          src="https://images.unsplash.com/photo-1507041957456-9c397ce39c97?w=1920&q=80"
          alt="Forest trail"
          className="w-full h-full object-cover opacity-45"
        />
        <div className="absolute inset-0 gradient-vignette" />
        <div className="absolute inset-0 bg-[#0B0F0C]/50" />
      </div>

      {/* Center Circle */}
      <div
        className={`relative z-10 transition-all duration-1000 ease-out ${
          isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
        }`}
      >
        <div className="w-[90vw] h-[90vw] max-w-[680px] max-h-[680px] circle-frame">
          <div className="absolute inset-4 rounded-full overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1507041957456-9c397ce39c97?w=700&q=80"
              alt=""
              className="w-full h-full object-cover opacity-30"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F0C]/90 via-[#0B0F0C]/50 to-[#0B0F0C]/70" />
          </div>

          {/* Content */}
          <div className="relative z-10 text-center px-6 md:px-12 w-full max-w-lg">
            {assessmentAnswers.length === 0 ? (
              // Blog Showcase
              blogs.length > 0 ? (
                <div className="space-y-6">
                  <h2
                    className={`font-display text-[clamp(28px,4vw,52px)] text-[#F6FFF2] transition-all duration-700 delay-300 ${
                      isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                    }`}
                  >
                    Community<br />Stories
                  </h2>

                  {/* Blog Card */}
                  {blogs[currentBlogIndex] && (
                    <div
                      className={`space-y-4 transition-all duration-500 ${
                        isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                      }`}
                    >
                      <div className="bg-[#111611]/60 border border-[#1A211A] rounded-lg p-4">
                        <div className="flex items-start gap-2 mb-2">
                          <span className="text-xs bg-[#D9FF3D]/10 text-[#D9FF3D] px-2 py-1 rounded">
                            {blogs[currentBlogIndex].category}
                          </span>
                          {blogs[currentBlogIndex].readTime && (
                            <span className="text-xs text-[#A9B5AA] flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {blogs[currentBlogIndex].readTime}
                            </span>
                          )}
                        </div>
                        <h3 className="text-[#F6FFF2] font-semibold line-clamp-2">
                          {blogs[currentBlogIndex].title}
                        </h3>
                        <p className="text-[#A9B5AA] text-sm mt-2 line-clamp-2">
                          {blogs[currentBlogIndex].excerpt}
                        </p>
                      </div>

                      {/* Navigation */}
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={() => setCurrentBlogIndex((prev) => (prev - 1 + blogs.length) % blogs.length)}
                          className="text-[#D9FF3D] hover:text-[#F6FFF2] transition"
                        >
                          ← Prev
                        </button>
                        <span className="text-[#A9B5AA] text-sm">
                          {currentBlogIndex + 1} / {blogs.length}
                        </span>
                        <button
                          onClick={() => setCurrentBlogIndex((prev) => (prev + 1) % blogs.length)}
                          className="text-[#D9FF3D] hover:text-[#F6FFF2] transition"
                        >
                          Next →
                        </button>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => setCurrentView('community-blog')}
                    className={`btn-primary w-full transition-all duration-700 delay-700 ${
                      isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                    }`}
                  >
                    <BookOpen className="w-4 h-4 inline mr-2" />
                    View All Articles
                  </button>
                </div>
              ) : (
                // Fallback Assessment Section
                <>
                  <h2
                    className={`font-display text-[clamp(28px,4vw,52px)] text-[#F6FFF2] mb-4 transition-all duration-700 delay-300 ${
                      isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                    }`}
                  >
                    NOT EVERYONE<br />GETS IN.
                  </h2>
                  <p
                    className={`text-[#A9B5AA] text-base md:text-lg mb-8 max-w-sm mx-auto transition-all duration-700 delay-500 ${
                      isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
                    }`}
                  >
                    A short assessment. Real standards. No performative answers.
                  </p>
                  <button
                    onClick={startAssessment}
                    className={`btn-primary transition-all duration-700 delay-700 ${
                      isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                    }`}
                  >
                    Preview the questions
                  </button>
                </>
              )
            ) : (
              <div id="questions-container" className="w-full">
                {/* Progress Bar */}
                <div className="w-full h-1 bg-[#1A211A] rounded-full mb-6 overflow-hidden">
                  <div 
                    className="h-full bg-[#D9FF3D] transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                {showFollowUp && (
                  <div className="flex items-center justify-center gap-2 text-[#D9FF3D] text-sm mb-4">
                    <AlertCircle className="w-4 h-4" />
                    <span>Additional questions</span>
                  </div>
                )}

                <h3 className="text-[#F6FFF2] text-lg md:text-xl font-medium mb-6 leading-snug">
                  {currentQuestion?.question}
                </h3>

                <div className="space-y-3">
                  {currentQuestion?.options.map((option, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleAnswer(option.score, option.redFlag)}
                      disabled={isTransitioning}
                      className={`w-full text-left p-4 rounded-xl border border-[#1A211A] bg-[#111611]/80 
                        hover:border-[#D9FF3D]/50 hover:bg-[#1A211A] transition-all duration-300
                        flex items-center justify-between group ${isTransitioning ? 'opacity-50' : ''}`}
                    >
                      <span className="text-[#F6FFF2] text-sm md:text-base">{option.text}</span>
                      <ChevronRight className="w-4 h-4 text-[#A9B5AA] opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>

                <p className="text-[#A9B5AA] text-xs mt-6">
                  Question {assessmentAnswers.length + 1} of {assessmentQuestions.length + (showFollowUp ? followUpQuestions.length : 0)}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AssessmentSection;
