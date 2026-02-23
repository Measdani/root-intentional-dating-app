import React, { useEffect, useState } from 'react';
import { useApp } from '@/store/AppContext';
import { assessmentQuestions, followUpQuestions, calculateAssessmentResult } from '@/data/assessment';
import { ChevronRight, AlertCircle } from 'lucide-react';

const AssessmentSection: React.FC = () => {
  const {
    assessmentAnswers,
    addAssessmentAnswer,
    setAssessmentResult,
    saveAssessmentDate,
    setCurrentView
  } = useApp();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showAssessmentStatement, setShowAssessmentStatement] = useState(true);
  const [showQuestions, setShowQuestions] = useState(false);
  const [assessmentStartTime, setAssessmentStartTime] = useState<number | null>(null);
  const [answerTimestamps, setAnswerTimestamps] = useState<Array<{ questionId: string; timestamp: number; score: number }>>([]);
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  const [understoodAssessment, setUnderstoodAssessment] = useState(false);

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

  const currentQuestions = showFollowUp ? followUpQuestions : assessmentQuestions;
  const currentQuestion = currentQuestions[currentQuestionIndex];
  const progress = ((assessmentAnswers.length) / (assessmentQuestions.length + 2)) * 100;

  const handleAnswer = (score: number, redFlag?: boolean) => {
    if (isTransitioning) return;

    setIsTransitioning(true);
    addAssessmentAnswer(currentQuestion.id, score, redFlag);

    // Track answer timestamp
    const timestamp = Date.now();
    setAnswerTimestamps(prev => [...prev, { questionId: currentQuestion.id, timestamp, score }]);

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
        // Complete assessment - log data
        const completionTime = Date.now();
        const totalTimeTaken = assessmentStartTime ? completionTime - assessmentStartTime : 0;
        const finalAnswers = [...assessmentAnswers, { questionId: currentQuestion.id, score, redFlag }];

        // Log assessment metadata
        const assessmentLog = {
          completionTimestamp: new Date(completionTime).toISOString(),
          totalTimeTakenMs: totalTimeTaken,
          totalTimeTakenSeconds: Math.round(totalTimeTaken / 1000),
          answerPatterns: answerTimestamps,
          questionCount: finalAnswers.length,
          redFlagCount: finalAnswers.filter(a => a.redFlag).length,
          suspiciousSpeed: totalTimeTaken < 15000 && finalAnswers.length > 5 // Less than 15 seconds for 5+ questions
        };

        // Store in localStorage for later analysis
        localStorage.setItem('assessmentLog', JSON.stringify(assessmentLog));
        console.log('Assessment completed:', assessmentLog);

        const result = calculateAssessmentResult(finalAnswers);
        setAssessmentResult(result);
        saveAssessmentDate();
        setCurrentView('assessment-reflection');
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

    // Reset assessment state completely
    setShowAssessmentStatement(true);
    setShowQuestions(false);
    setShowFollowUp(false);
    setCurrentQuestionIndex(0);
    setUnderstoodAssessment(false);
    setIsTransitioning(false);
    setAssessmentStartTime(null);

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
      id="section-assessment"
      className="min-h-screen bg-[#0B0F0C] flex items-center justify-center"
    >
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <img
          src="https://images.unsplash.com/photo-1507041957456-9c397ce39c97?w=1920&q=80"
          alt="Forest trail"
          className="w-full h-full object-cover opacity-80"
        />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-3xl px-4 md:px-8 py-12">
        {assessmentAnswers.length === 0 && document.querySelector('main.relative') ? (
          // Assessment Preview (embedded in landing page)
          <div className="text-center">
            <h2 className="font-display text-[clamp(36px,6vw,64px)] text-[#F6FFF2] mb-6">
              BUILT FOR<br />INTENTIONAL LOVE
            </h2>
            <div className="text-[#A9B5AA] text-base md:text-lg mb-8 max-w-2xl mx-auto space-y-4">
              <p>A brief readiness assessment. Real structure. Thoughtful placement.</p>
              <p className="text-[#F6FFF2]">This isn't about perfection.<br />It's about alignment.</p>
              <p>Before joining, take a moment to understand how we define relationship readiness and why structure matters here.</p>
            </div>
            <button
              onClick={() => setCurrentView('community-blog')}
              className="btn-primary"
            >
              Learn How We Define Readiness →
            </button>
          </div>
        ) : showAssessmentStatement && localStorage.getItem('currentUser') ? (
          // Assessment Statement (full-screen page) - only show if logged in
          <div>
            <h1 className="font-display text-[clamp(40px,7vw,56px)] text-[#F6FFF2] mb-12 text-center">
              Before You Begin Your Assessment
            </h1>

            <div className="space-y-6">
              {/* Time Requirements */}
              <div className="bg-[#111611]/80 backdrop-blur-sm border border-[#1A211A] rounded-lg p-6">
                <p className="text-[#A9B5AA] text-base leading-relaxed">
                  Please set aside approximately <span className="text-[#D9FF3D] font-semibold">15–30 minutes</span> to complete your assessment.
                </p>
              </div>

              {/* No Pausing Warning */}
              <div className="bg-[#111611]/80 backdrop-blur-sm border border-[#D9FF3D]/30 rounded-lg p-6">
                <p className="text-[#A9B5AA] text-base leading-relaxed">
                  <span className="text-[#D9FF3D] font-semibold">Once started, the assessment cannot be paused or exited.</span> If you leave before completion, you will automatically be placed in <span className="text-[#D9FF3D]">Inner Work Space</span> and must wait <span className="text-[#D9FF3D] font-semibold">6 months</span> before you can retake the assessment.
                </p>
              </div>

              {/* Preparation */}
              <div className="bg-[#111611]/80 backdrop-blur-sm border border-[#1A211A] rounded-lg p-6">
                <p className="text-[#A9B5AA] text-base leading-relaxed">
                  To avoid unintended placement, please ensure you have enough <span className="text-[#F6FFF2]">uninterrupted time</span> before beginning.
                </p>
              </div>

              {/* Honesty Section */}
              <div className="bg-[#111611]/80 backdrop-blur-sm border border-[#1A211A] rounded-lg p-6">
                <h3 className="text-[#F6FFF2] font-semibold mb-4 text-lg">A Note on Honesty</h3>
                <ul className="text-[#A9B5AA] space-y-3 leading-relaxed">
                  <li className="flex gap-3">
                    <span className="text-[#D9FF3D] font-bold flex-shrink-0">•</span>
                    <span><span className="text-[#F6FFF2] font-semibold">There is no perfect score.</span></span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-[#D9FF3D] font-bold flex-shrink-0">•</span>
                    <span><span className="text-[#F6FFF2] font-semibold">There are no trick questions.</span></span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-[#D9FF3D] font-bold flex-shrink-0">•</span>
                    <span>Do not use outside resources, coaching prompts, or search engines while answering.</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-[#D9FF3D] font-bold flex-shrink-0">•</span>
                    <span>The purpose of this assessment is not to perform well — it is to understand where you truly are.</span>
                  </li>
                </ul>
              </div>

              {/* Answer From Experience */}
              <div className="bg-[#111611]/80 backdrop-blur-sm border border-[#1A211A] rounded-lg p-6">
                <h3 className="text-[#F6FFF2] font-semibold mb-4 text-lg">Answer From Your Truth</h3>
                <ul className="text-[#A9B5AA] space-y-3 leading-relaxed mb-4">
                  <li className="flex gap-3">
                    <span className="text-[#D9FF3D] font-bold flex-shrink-0">•</span>
                    <span>Answer from your <span className="text-[#F6FFF2] font-semibold">lived experience.</span></span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-[#D9FF3D] font-bold flex-shrink-0">•</span>
                    <span>Answer from your <span className="text-[#F6FFF2] font-semibold">current patterns.</span></span>
                  </li>
                  <li className="flex gap-3">
                    <span className="text-[#D9FF3D] font-bold flex-shrink-0">•</span>
                    <span>Answer <span className="text-[#F6FFF2] font-semibold">honestly.</span></span>
                  </li>
                </ul>
                <p className="text-[#A9B5AA] leading-relaxed mb-3">
                  The more authentic your responses, the more accurately we can meet you where you are — and help you grow into where you want to be.
                </p>
                <p className="text-[#D9FF3D] font-semibold">This process is about alignment, not judgment.</p>
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
                I understand the assessment requirements and commitment
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

            {showFollowUp && (
              <div className="flex items-center justify-center gap-2 text-[#D9FF3D] text-sm mb-6">
                <AlertCircle className="w-4 h-4" />
                <span>Additional questions</span>
              </div>
            )}

            <h3 className="text-[#F6FFF2] text-xl md:text-2xl font-medium mb-8 leading-snug">
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
                  <span className="text-[#F6FFF2] text-base">{option.text}</span>
                  <ChevronRight className="w-4 h-4 text-[#A9B5AA] opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>

            <p className="text-[#A9B5AA] text-sm mt-8 text-center">
              Question {assessmentAnswers.length + 1} of {assessmentQuestions.length + (showFollowUp ? followUpQuestions.length : 0)}
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
                  If you leave before completing the assessment, you will automatically be placed in <span className="text-[#D9FF3D] font-semibold">Inner Work Space</span>.
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
