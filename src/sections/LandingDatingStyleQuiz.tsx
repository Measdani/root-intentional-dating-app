import React, { useMemo, useState } from 'react';

type StyleKey = 'oak' | 'willow' | 'fern' | 'gardener' | 'wildflower';

type QuizOption = {
  text: string;
  scores: Partial<Record<StyleKey, number>>;
};

type QuizQuestion = {
  text: string;
  options: QuizOption[];
};

type StyleResult = {
  name: string;
  emoji: string;
  archetype: string;
  description: string;
  growth: string;
};

const questions: QuizQuestion[] = [
  {
    text: 'Something upsets you in your relationship. What do you do first?',
    options: [
      { text: 'Bring it up right away. I need to address it before it grows.', scores: { oak: 3 } },
      { text: 'Take time alone to process before I say anything.', scores: { fern: 3 } },
      { text: 'Let it go to keep the peace, even if it bothers me.', scores: { willow: 3 } },
      { text: 'Talk it through. I want us to understand each other.', scores: { gardener: 3 } },
      { text: 'Follow how I feel in the moment.', scores: { wildflower: 3 } },
    ],
  },
  {
    text: 'Your partner goes quiet and seems distant. You...',
    options: [
      { text: "Ask directly. I need to know what's going on.", scores: { oak: 3 } },
      { text: 'Give them space. I know what it feels like to need time.', scores: { fern: 2, willow: 1 } },
      { text: "Worry they're upset and try to fix the mood.", scores: { willow: 2, wildflower: 1 } },
      { text: "Check in gently and let them know I'm here.", scores: { gardener: 3 } },
      { text: 'Feel it deeply and want to reconnect right away.', scores: { wildflower: 3 } },
    ],
  },
  {
    text: "You really like someone but aren't sure how they feel. You...",
    options: [
      { text: "Tell them directly. I'd rather know than wonder.", scores: { oak: 3 } },
      { text: 'Pull back and observe before opening up.', scores: { fern: 3 } },
      { text: 'Wait for them to show their feelings first.', scores: { willow: 3 } },
      { text: 'Have an honest conversation about where things are going.', scores: { gardener: 3 } },
      { text: 'Go all in. If it feels right, I trust it.', scores: { wildflower: 3 } },
    ],
  },
  {
    text: 'After a hard week, what do you need most from a partner?',
    options: [
      { text: "Straight talk. Don't sugarcoat, just be real with me.", scores: { oak: 3 } },
      { text: 'Quiet presence. Just be there without pressure.', scores: { fern: 3 } },
      { text: 'Gentleness and understanding. I need to feel safe.', scores: { willow: 3 } },
      { text: 'A real conversation where I feel heard.', scores: { gardener: 3 } },
      { text: 'Deep closeness and warmth.', scores: { wildflower: 3 } },
    ],
  },
  {
    text: 'When someone you love hurts you, you tend to...',
    options: [
      { text: 'Address it head-on. Avoiding it only makes it worse.', scores: { oak: 3 } },
      { text: 'Withdraw and process quietly before saying anything.', scores: { fern: 3 } },
      { text: 'Downplay it to avoid conflict, even if it still hurts.', scores: { willow: 3 } },
      { text: 'Talk it through. I believe in working things out.', scores: { gardener: 3 } },
      { text: 'Feel it intensely and struggle to hide it.', scores: { wildflower: 3 } },
    ],
  },
  {
    text: 'Which feels most true about how you show up in love?',
    options: [
      { text: "I lead. I handle things. I don't avoid what matters.", scores: { oak: 3 } },
      { text: 'I reflect. I observe. I need room to process before I respond.', scores: { fern: 3 } },
      { text: "I adapt. I keep things smooth. I'd rather bend than break the peace.", scores: { willow: 3 } },
      { text: 'I invest. I communicate. I believe in building something real.', scores: { gardener: 3 } },
      { text: 'I feel deeply. I love freely. I follow my heart.', scores: { wildflower: 3 } },
    ],
  },
  {
    text: "What's the hardest part of relationships for you?",
    options: [
      { text: "When people can't handle my honesty or need me to slow down.", scores: { oak: 3 } },
      { text: 'When people misread my need for space as not caring.', scores: { fern: 3 } },
      { text: 'Saying what I actually need without feeling like a burden.', scores: { willow: 3 } },
      { text: "Carrying the emotional weight when the other person won't meet me.", scores: { gardener: 3 } },
      { text: 'Missing red flags because the connection just feels so real.', scores: { wildflower: 3 } },
    ],
  },
];

const styles: Record<StyleKey, StyleResult> = {
  oak: {
    name: 'The Oak',
    emoji: 'O',
    archetype: 'The Confrontationalist',
    description:
      "You are strong, direct, and grounded. You lead in relationships and believe honesty is the foundation of real love. You don't avoid what needs to be addressed. You handle it.",
    growth:
      "Your power isn't just in how you lead. It's in knowing when to lead and when to allow. Space is not rejection. Patience can strengthen connection.",
  },
  willow: {
    name: 'The Willow',
    emoji: 'W',
    archetype: 'The Adapter',
    description:
      'You are gentle, emotionally aware, and deeply caring. You create peace in the spaces you enter and make people feel safe. Your adaptability is a gift, but you deserve to take up full space in your own relationship.',
    growth:
      "Your power isn't just in how you adapt. It's in learning when to stand firm. Honesty creates deeper connection than silence. Your needs matter just as much.",
  },
  fern: {
    name: 'The Fern',
    emoji: 'F',
    archetype: 'The Withdrawer',
    description:
      "You feel deeply and process thoughtfully. You're not distant, you're intentional. When things get heavy, you step back to understand before you respond.",
    growth:
      "Your power isn't just in how deeply you process. It's in staying connected while you do. It's okay to say, 'I need time,' instead of going silent.",
  },
  gardener: {
    name: 'The Gardener',
    emoji: 'G',
    archetype: 'The Collaborator',
    description:
      "You are intentional, growth-minded, and committed to building something real. You believe love is something you grow, not just feel. You don't run from hard conversations.",
    growth:
      "Your power isn't just in your ability to build. It's in knowing what's worth building. Not everything is meant to be grown. Effort cannot replace alignment.",
  },
  wildflower: {
    name: 'The Wildflower',
    emoji: 'W',
    archetype: 'The Emotional Explorer',
    description:
      'You love freely, feel deeply, and bring life into every relationship you enter. Your emotional depth and authenticity are powerful. You make people feel something real.',
    growth:
      "Your power isn't just in how deeply you feel. It's in learning to stay rooted while feeling it. Consistency is just as important as connection.",
  },
};

const initialScores: Record<StyleKey, number> = {
  oak: 0,
  willow: 0,
  fern: 0,
  gardener: 0,
  wildflower: 0,
};

const LandingDatingStyleQuiz: React.FC = () => {
  const [started, setStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [showResult, setShowResult] = useState(false);

  const rankedStyles = useMemo(() => {
    const scores = { ...initialScores };

    Object.entries(answers).forEach(([questionIndex, optionIndex]) => {
      const option = questions[Number(questionIndex)]?.options[optionIndex];
      if (!option) return;

      Object.entries(option.scores).forEach(([style, value]) => {
        scores[style as StyleKey] += value ?? 0;
      });
    });

    return Object.entries(scores).sort((a, b) => b[1] - a[1]) as Array<[StyleKey, number]>;
  }, [answers]);

  const currentQuestion = questions[currentIndex];
  const selectedOption = answers[currentIndex];
  const primaryStyle = styles[rankedStyles[0][0]];
  const secondaryStyle = styles[rankedStyles[1][0]];

  const chooseOption = (optionIndex: number) => {
    setAnswers((prev) => ({ ...prev, [currentIndex]: optionIndex }));
  };

  const goNext = () => {
    if (selectedOption === undefined) return;

    if (currentIndex === questions.length - 1) {
      setShowResult(true);
      return;
    }

    setCurrentIndex((prev) => prev + 1);
  };

  const goBack = () => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  };

  const retake = () => {
    setAnswers({});
    setCurrentIndex(0);
    setShowResult(false);
    setStarted(false);
  };

  const goToPricing = () => {
    document.getElementById('section-membership')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section id="section-dating-style-quiz" className="bg-[#171108] px-6 py-20 text-[#FFF8EE]">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
        <div>
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.32em] text-[#C9A96E]">
            Rooted Hearts
          </p>
          <h2 className="font-display text-[clamp(38px,6vw,76px)] leading-none">
            Find your dating style before you join.
          </h2>
          <p className="mt-6 max-w-md text-base leading-8 text-[#D8C59B]">
            A quick seven-question reflection that gives new members a first glimpse at how they love,
            repair, and grow in connection.
          </p>
        </div>

        <div className="rounded-lg border border-[#6A5A38] bg-[#2C2416] p-5 shadow-2xl shadow-black/30 sm:p-8">
          {!started ? (
            <div className="py-8 text-center">
              <p className="mb-4 text-xs uppercase tracking-[0.3em] text-[#C9A96E]">Dating style quiz</p>
              <h3 className="font-display text-4xl leading-tight text-[#FFF8EE]">What's Your Dating Style?</h3>
              <p className="mx-auto mt-4 max-w-sm text-sm leading-7 text-[#D4B882]">
                Answer seven questions to discover your primary style and what it means for how you love.
              </p>
              <button
                type="button"
                onClick={() => setStarted(true)}
                className="mt-8 rounded bg-[#C9A96E] px-12 py-4 text-sm font-bold uppercase tracking-[0.18em] text-[#1A1008] transition-colors hover:bg-[#DBB97E]"
              >
                Begin
              </button>
            </div>
          ) : showResult ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-[#C9A96E] text-xl font-display text-[#C9A96E]">
                {primaryStyle.emoji}
              </div>
              <p className="text-xs uppercase tracking-[0.3em] text-[#C9A96E]">Your primary style</p>
              <h3 className="mt-2 font-display text-5xl text-[#C9A96E]">{primaryStyle.name}</h3>
              <p className="mt-1 text-xs uppercase tracking-[0.2em] text-[#A08848]">{primaryStyle.archetype}</p>
              <p className="mt-6 text-sm leading-7 text-[#F0E0B8]">{primaryStyle.description}</p>

              <div className="mt-6 rounded-md border border-[#6A5A38] bg-[#3A2E18] p-5 text-left">
                <p className="mb-2 text-[10px] uppercase tracking-[0.25em] text-[#C9A96E]">Your growth edge</p>
                <p className="font-display text-lg italic leading-7 text-[#FFF8EE]">{primaryStyle.growth}</p>
              </div>

              <p className="mt-5 text-sm text-[#A08848]">
                Your secondary style is <span className="text-[#C9A96E]">{secondaryStyle.name}</span>,{' '}
                {secondaryStyle.archetype.toLowerCase()}.
              </p>

              <div className="mt-6 flex flex-col items-center gap-3 border-t border-[#4A3C24] pt-6">
                <button
                  type="button"
                  onClick={goToPricing}
                  className="rounded bg-[#C9A96E] px-7 py-3 text-xs font-bold uppercase tracking-[0.18em] text-[#1A1008] transition-colors hover:bg-[#DBB97E]"
                >
                  See Membership Pricing
                </button>
                <button
                  type="button"
                  onClick={retake}
                  className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8A7848] hover:text-[#C9A96E]"
                >
                  Retake the quiz
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="mb-6 flex justify-center gap-1.5">
                {questions.map((_, index) => (
                  <span
                    key={index}
                    className={`h-1.5 w-1.5 rounded-full border ${
                      index < currentIndex
                        ? 'border-[#C9A96E] bg-[#C9A96E]'
                        : index === currentIndex
                          ? 'border-[#C9A96E] bg-transparent'
                          : 'border-[#6A5A38] bg-[#4A3C24]'
                    }`}
                  />
                ))}
              </div>
              <p className="mb-3 text-center text-[10px] uppercase tracking-[0.25em] text-[#C9A96E]">
                Question {currentIndex + 1} of {questions.length}
              </p>
              <h3 className="mb-6 text-center font-display text-3xl italic leading-snug text-[#FFF8EE]">
                {currentQuestion.text}
              </h3>
              <div className="space-y-2">
                {currentQuestion.options.map((option, optionIndex) => (
                  <button
                    key={option.text}
                    type="button"
                    onClick={() => chooseOption(optionIndex)}
                    className={`w-full rounded-md border px-4 py-3 text-left text-sm leading-6 transition-colors ${
                      selectedOption === optionIndex
                        ? 'border-[#C9A96E] bg-[#4A3C20] text-[#C9A96E]'
                        : 'border-[#6A5A38] bg-[#3A2E18] text-[#F0E0B8] hover:border-[#C9A96E] hover:bg-[#4A3C20]'
                    }`}
                  >
                    {option.text}
                  </button>
                ))}
              </div>
              <div className="mt-6 flex items-center justify-between">
                <button
                  type="button"
                  onClick={goBack}
                  disabled={currentIndex === 0}
                  className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8A7848] hover:text-[#C9A96E] disabled:cursor-not-allowed disabled:opacity-30"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  disabled={selectedOption === undefined}
                  className="rounded bg-[#C9A96E] px-6 py-3 text-xs font-bold uppercase tracking-[0.16em] text-[#1A1008] opacity-100 transition-all hover:bg-[#DBB97E] disabled:pointer-events-none disabled:opacity-0"
                >
                  {currentIndex === questions.length - 1 ? 'See My Style' : 'Next'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default LandingDatingStyleQuiz;
