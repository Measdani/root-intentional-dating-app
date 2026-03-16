import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '@/store/AppContext';
import { useCommunity } from '@/modules';
import { assessmentQuestions as defaultAssessmentQuestions, calculateAssessmentResult } from '@/data/assessment';
import type { AssessmentQuestion } from '@/types';
import { ChevronRight } from 'lucide-react';
import { normalizeAssessmentQuestionsWithStyles, resolveAssessmentOptionStyle } from '@/services/assessmentStyleService';

const ADMIN_DATA_STORAGE_KEY = 'rooted-admin-data';

const loadAssessmentQuestions = (): AssessmentQuestion[] => {
  try {
    const raw = localStorage.getItem(ADMIN_DATA_STORAGE_KEY);
    if (!raw) return normalizeAssessmentQuestionsWithStyles(defaultAssessmentQuestions);

    const parsed = JSON.parse(raw);
    const candidate = parsed?.assessmentQuestions;
    if (!Array.isArray(candidate) || candidate.length === 0) {
      return normalizeAssessmentQuestionsWithStyles(defaultAssessmentQuestions);
    }

    const hasValidShape = candidate.every(
      (question: any) =>
        question &&
        typeof question.id === 'string' &&
        typeof question.question === 'string' &&
        typeof question.category === 'string' &&
        Array.isArray(question.options) &&
        question.options.length > 0
    );

    return hasValidShape
      ? normalizeAssessmentQuestionsWithStyles(candidate as AssessmentQuestion[])
      : normalizeAssessmentQuestionsWithStyles(defaultAssessmentQuestions);
  } catch {
    return normalizeAssessmentQuestionsWithStyles(defaultAssessmentQuestions);
  }
};

const AssessmentSection: React.FC = () => {
  const {
    assessmentAnswers,
    addAssessmentAnswer,
    setAssessmentResult,
    saveAssessmentDate,
    setCurrentView,
    currentUser
  } = useApp();
  const { activeCommunity } = useCommunity();
  const isLgbtqCommunity = activeCommunity.matchingMode === 'inclusive';
  const innerWorkLabel = isLgbtqCommunity ? 'LGBTQ+ Inner Work Space' : 'Inner Work Space';

  const [isVisible, setIsVisible] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showAssessmentStatement, setShowAssessmentStatement] = useState(true);
  const [showQuestions, setShowQuestions] = useState(false);
  const [assessmentStartTime, setAssessmentStartTime] = useState<number | null>(null);
  const [answerTimestamps, setAnswerTimestamps] = useState<Array<{ questionId: string; timestamp: number; score: number }>>([]);
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  const [understoodAssessment, setUnderstoodAssessment] = useState(false);
  const [assessmentQuestions, setAssessmentQuestions] = useState<AssessmentQuestion[]>(() =>
    loadAssessmentQuestions()
  );
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const refreshAssessmentQuestions = () => {
      setAssessmentQuestions(loadAssessmentQuestions());
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key && event.key !== ADMIN_DATA_STORAGE_KEY) return;
      refreshAssessmentQuestions();
    };

    refreshAssessmentQuestions();
    window.addEventListener('admin-assessment-questions-updated', refreshAssessmentQuestions as EventListener);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(
        'admin-assessment-questions-updated',
        refreshAssessmentQuestions as EventListener
      );
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Track if assessment was abandoned (user left mid-assessment)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (assessmentStartTime && showQuestions && !showAssessmentStatement) {
        // Prevent default browser confirmation
        e.preventDefault();
        e.returnValue = '';
        // Show our custom dialog
        setShowExitConfirmation(true);
      }
    };

    const handlePopState = () => {
      if (assessmentStartTime && showQuestions && !showAssessmentStatement) {
        // User clicked back button
        setShowExitConfirmation(true);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    // Prevent back button by pushing a new state
    if (assessmentStartTime && showQuestions && !showAssessmentStatement) {
      window.history.pushState(null, '', window.location.href);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [assessmentStartTime, showQuestions, showAssessmentStatement]);

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

  // Prevent users who have already passed from retaking the assessment
  useEffect(() => {
    if (currentUser.assessmentPassed === true && currentUser.userStatus === 'active') {
      console.log('[AssessmentSection] User has already passed - redirecting to browse');
      setCurrentView('browse');
    }
  }, [currentUser.assessmentPassed, currentUser.userStatus, setCurrentView]);

  const currentQuestions = assessmentQuestions;
  const currentQuestion = currentQuestions[currentQuestionIndex];
  const progress = ((assessmentAnswers.length) / assessmentQuestions.length) * 100;

  const handleAnswer = (score: number, style?: AssessmentQuestion['options'][number]['style']) => {
    if (isTransitioning) return;

    setIsTransitioning(true);
    const resolvedStyle = style || resolveAssessmentOptionStyle(score);
    addAssessmentAnswer(currentQuestion.id, score, resolvedStyle);

    // Track answer timestamp
    const timestamp = Date.now();
    setAnswerTimestamps(prev => [...prev, { questionId: currentQuestion.id, timestamp, score }]);

    setTimeout(() => {
      if (currentQuestionIndex < currentQuestions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        setIsTransitioning(false);
      } else {
        // Complete assessment - log data
        const completionTime = Date.now();
        const totalTimeTaken = assessmentStartTime ? completionTime - assessmentStartTime : 0;
        const finalAnswers = [
          ...assessmentAnswers,
          { questionId: currentQuestion.id, score, style: resolvedStyle },
        ];

        // Log assessment metadata
        const assessmentLog = {
          completionTimestamp: new Date(completionTime).toISOString(),
          totalTimeTakenMs: totalTimeTaken,
          totalTimeTakenSeconds: Math.round(totalTimeTaken / 1000),
          answerPatterns: answerTimestamps,
          questionCount: finalAnswers.length,
          suspiciousSpeed: totalTimeTaken < 15000 && finalAnswers.length > 5 // Less than 15 seconds for 5+ questions
        };

        // Store in localStorage for later analysis
        localStorage.setItem('assessmentLog', JSON.stringify(assessmentLog));
        console.log('Assessment completed:', assessmentLog);

        const result = calculateAssessmentResult(finalAnswers, assessmentQuestions);
        setAssessmentResult(result);
        saveAssessmentDate();
        // Always show the result screen first so users can review strengths,
        // growth focus areas, and choose where to go next.
        setCurrentView('assessment-result');
        setIsTransitioning(false);
      }
    }, 400);
  };

  const beginAssessment = () => {
    setAssessmentStartTime(Date.now());
    setShowAssessmentStatement(false);
    setShowQuestions(true);
    setTimeout(() => {
      const questionsContainer = document.getElementById('questions-container');
      if (questionsContainer) {
        questionsContainer.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  const handleLogoutFromAssessment = () => {
    // Record that assessment was abandoned
    const abandonmentData = {
      abandonedAt: new Date().toISOString(),
      coolingPeriodUntil: new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000).toISOString(), // 6 months
      canRetakeAssessment: false
    };
    localStorage.setItem('assessmentAbandonment', JSON.stringify(abandonmentData));

    // Clear current user and log out
    localStorage.removeItem('currentUser');
    window.dispatchEvent(new CustomEvent('user-logout'));

    // Navigate to landing page
    setCurrentView('landing');
  };

  const handleConfirmExit = () => {
    // Record that assessment was abandoned
    const abandonmentData = {
      abandonedAt: new Date().toISOString(),
      coolingPeriodUntil: new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000).toISOString(), // 6 months
      canRetakeAssessment: false
    };
    localStorage.setItem('assessmentAbandonment', JSON.stringify(abandonmentData));

    // Navigate away
    window.location.href = '/';
  };

  const handleStayContinue = () => {
    // Close the confirmation dialog and continue assessment
    setShowExitConfirmation(false);
  };

  return (
    <section
      ref={sectionRef}
      id="section-assessment"
      className="min-h-screen bg-[#0B0F0C] flex items-center justify-center"
    >
      {/* Background */}
      <div className="fixed inset-0">
        <img
          src="https://images.unsplash.com/photo-1507041957456-9c397ce39c97?w=1920&q=80"
          alt="Forest trail"
          className="w-full h-full object-cover opacity-50"
        />
        <div className="absolute inset-0 gradient-vignette opacity-30" />
        <div className="absolute inset-0 bg-[#0B0F0C]/40" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-3xl px-4 md:px-8 py-12">
        {assessmentAnswers.length === 0 && document.querySelector('main.relative') ? (
          // Assessment Preview (embedded in landing page)
          <div
            className={`text-center transition-all duration-1000 ease-out ${
              isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
            }`}
          >
            <h2
              className={`font-display text-[clamp(36px,6vw,64px)] text-[#F6FFF2] mb-6 transition-all duration-700 delay-300 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
            >
              BUILT FOR<br />INTENTIONAL LOVE
            </h2>
            <div
              className={`text-[#A9B5AA] text-base md:text-lg mb-8 max-w-2xl mx-auto transition-all duration-700 delay-500 space-y-4 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
              }`}
            >
              <p>
                {isLgbtqCommunity
                  ? 'A brief LGBTQ+ readiness assessment. Real structure. Thoughtful placement.'
                  : 'A brief readiness assessment. Real structure. Thoughtful placement.'}
              </p>
              <p className="text-[#F6FFF2]">This isn't about perfection.<br />It's about alignment.</p>
              <p>
                {isLgbtqCommunity
                  ? 'Before joining this space, take a moment to understand how we define relationship readiness, safety, and structure.'
                  : 'Before joining, take a moment to understand how we define relationship readiness and why structure matters here.'}
              </p>
            </div>
            <button
              onClick={() => setCurrentView('community-blog')}
              className={`btn-primary transition-all duration-700 delay-700 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              Learn How We Define Readiness →
            </button>
          </div>
        ) : showAssessmentStatement ? (
          // Assessment Statement (full-screen page)
          <div
            className={`transition-all duration-1000 ease-out ${
              isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
            }`}
          >
            <h1 className="font-display text-[clamp(40px,7vw,56px)] text-[#F6FFF2] mb-8 text-center">
              Before You Begin
            </h1>
            <div className="space-y-6">
              <div className="bg-[#111611]/80 backdrop-blur-sm border border-[#1A211A] rounded-lg p-6 space-y-4">
                <p className="text-[#A9B5AA] text-base leading-relaxed">
                  This short assessment helps us understand how you approach communication, conflict, and
                  connection in relationships.
                </p>
                <p className="text-[#A9B5AA] text-base leading-relaxed">
                  Your responses will determine whether you enter Alignment Space, where you'll have tools and
                  resources to support a healthy relationship as you date and grow, or the {innerWorkLabel},
                  where you can strengthen important relationship skills while continuing to meet others who are also
                  focused on personal growth.
                </p>
                <p className="text-[#A9B5AA] text-base leading-relaxed">
                  The assessment takes about 10-15 minutes to complete, and we recommend finishing it in one sitting.
                </p>
              </div>
              <div className="bg-[#111611]/80 backdrop-blur-sm border border-[#1A211A] rounded-lg p-6 space-y-4">
                <h3 className="text-[#F6FFF2] font-semibold text-lg">Discover Your Dating Style</h3>
                <p className="text-[#A9B5AA] text-base leading-relaxed">
                  As part of the assessment, you'll also discover your current dating style. Most people show a blend
                  of styles, but one or two may stand out more strongly.
                </p>
                <p className="text-[#A9B5AA] text-base leading-relaxed">You may resonate with:</p>
                <div className="space-y-3">
                  <p className="text-[#A9B5AA] leading-relaxed">
                    <span className="text-[#F6FFF2] font-semibold">Oak - The Courage Dater</span><br />
                    Direct, honest, and grounded in strong values.
                  </p>
                  <p className="text-[#A9B5AA] leading-relaxed">
                    <span className="text-[#F6FFF2] font-semibold">Willow - The Harmonizer</span><br />
                    Empathetic, emotionally aware, and focused on understanding others.
                  </p>
                  <p className="text-[#A9B5AA] leading-relaxed">
                    <span className="text-[#F6FFF2] font-semibold">Fern - The Reflective Dater</span><br />
                    Thoughtful, introspective, and comfortable taking space to process emotions.
                  </p>
                  <p className="text-[#A9B5AA] leading-relaxed">
                    <span className="text-[#F6FFF2] font-semibold">Gardener - The Growth Partner</span><br />
                    Collaborative, curious, and committed to growing through challenges together.
                  </p>
                  <p className="text-[#A9B5AA] leading-relaxed">
                    <span className="text-[#F6FFF2] font-semibold">Wildflower - The Adventure Dater</span><br />
                    Optimistic, playful, and energized by shared experiences and connection.
                  </p>
                </div>
              </div>
              <div className="bg-[#111611]/80 backdrop-blur-sm border border-[#1A211A] rounded-lg p-6 space-y-4">
                <h3 className="text-[#F6FFF2] font-semibold text-lg">A Quick Note</h3>
                <p className="text-[#A9B5AA] text-base leading-relaxed">
                  This assessment isn't about perfect answers.
                </p>
                <p className="text-[#A9B5AA] text-base leading-relaxed">
                  It's an opportunity to reflect on where you are today, recognize areas you may want to strengthen,
                  and learn the dating style you currently bring into relationships.
                </p>
                <p className="text-[#A9B5AA] text-base leading-relaxed">
                  That reflection helps you move closer to the kind of dating life and connection you truly want.
                </p>
                <p className="text-[#A9B5AA] text-base leading-relaxed">
                  Healthy relationships require emotional tools many of us were never taught.
                </p>
                <p className="text-[#A9B5AA] text-base leading-relaxed">
                  This assessment helps ensure that everyone entering the dating pool is approaching connection with
                  care, accountability, and respect.
                </p>
                <p className="text-[#A9B5AA] text-base leading-relaxed">
                  We also want you to feel confident that the people you meet here want meaningful connection just as
                  much as you do.
                </p>
                <p className="text-[#A9B5AA] text-base leading-relaxed">That's why this step matters.</p>
                <p className="text-[#F6FFF2] font-semibold leading-relaxed">
                  Everyone here has taken the time to reflect and show up intentionally.
                </p>
                <p className="text-[#D9FF3D] font-semibold leading-relaxed">
                  No wasted time - just people who are serious about building something real.
                </p>
              </div>
            </div>

            {/* Confirmation Checkbox */}
            <div className="flex items-center gap-3 mt-8 mb-8 bg-[#0B0F0C]/95 border border-[#1A211A] rounded-lg p-4">
              <input
                type="checkbox"
                id="understand-assessment"
                checked={understoodAssessment}
                onChange={(e) => setUnderstoodAssessment(e.target.checked)}
                className="w-5 h-5 cursor-pointer accent-[#D9FF3D] flex-shrink-0"
              />
              <label htmlFor="understand-assessment" className="text-[#F6FFF2] cursor-pointer flex-1">
                I understand this assessment and I am ready to begin intentionally.
              </label>
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mt-12">
              <button
                onClick={beginAssessment}
                disabled={!understoodAssessment}
                className={`btn-primary flex-1 ${!understoodAssessment ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                Begin Assessment
              </button>
              <button
                onClick={handleLogoutFromAssessment}
                className="px-6 py-3 rounded-xl border border-[#1A211A] bg-transparent text-[#A9B5AA] hover:text-[#F6FFF2] hover:border-[#A9B5AA] transition-all duration-300 font-medium flex-1"
              >
                Log Out & Return Later
              </button>
            </div>
          </div>
        ) : (
          // Assessment Questions
          <div id="questions-container" className="max-w-2xl mx-auto">
            {/* Progress Bar */}
            <div className="w-full h-1 bg-[#1A211A] rounded-full mb-8 overflow-hidden">
              <div
                className="h-full bg-[#D9FF3D] transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>

            <h3 className="text-[#F6FFF2] text-xl md:text-2xl font-medium mb-8 leading-snug">
              {currentQuestion?.question}
            </h3>

            <div className="space-y-3">
              {currentQuestion?.options.map((option, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAnswer(option.score, option.style)}
                  disabled={isTransitioning}
                  className={`w-full text-left p-4 rounded-xl border border-[#1A211A] bg-[#111611]/80
                    hover:border-[#D9FF3D]/50 hover:bg-[#1A211A] transition-all duration-300
                    flex items-center justify-between group ${isTransitioning ? 'opacity-50' : ''}`}
                >
                  <span className="text-[#F6FFF2] text-base">{option.text}</span>
                  <ChevronRight className="w-4 h-4 text-[#A9B5AA] opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>

            <p className="text-[#A9B5AA] text-sm mt-8 text-center">
              Question {assessmentAnswers.length + 1} of {assessmentQuestions.length}
            </p>
          </div>
        )}
      </div>

      {/* Exit Confirmation Modal */}
      {showExitConfirmation && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#111611] border border-[#1A211A] rounded-lg max-w-md w-full p-8 space-y-6">
            <div>
              <h3 className="text-[#F6FFF2] font-display text-2xl mb-2">
                Are You Sure You Want to Exit?
              </h3>
              <div className="space-y-4 mt-4">
                <p className="text-[#A9B5AA] text-sm leading-relaxed">
                  If you leave before completing the assessment, you will automatically be placed in <span className="text-[#D9FF3D] font-semibold">{innerWorkLabel}</span>.
                </p>
                <p className="text-[#A9B5AA] text-sm leading-relaxed">
                  You may retake the assessment after the required waiting period.
                </p>
                <p className="text-[#A9B5AA] text-sm leading-relaxed">
                  To avoid unintended placement, we recommend completing the assessment in one sitting.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleStayContinue}
                className="btn-primary w-full"
              >
                Stay & Continue Assessment
              </button>
              <button
                onClick={handleConfirmExit}
                className="w-full px-6 py-3 rounded-xl border border-[#D9FF3D]/50 bg-transparent text-[#D9FF3D] hover:bg-[#D9FF3D]/10 transition-all duration-300 font-semibold"
              >
                Exit & Accept Placement
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default AssessmentSection;
