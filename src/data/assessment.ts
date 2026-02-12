import type { AssessmentQuestion, GrowthResource, MembershipTier } from '@/types';

export const assessmentQuestions: AssessmentQuestion[] = [
  {
    id: 'q1',
    category: 'emotional-regulation',
    question: 'When you feel overwhelmed by emotion, what is your typical response?',
    options: [
      { text: 'I pause, name the feeling, and choose when to respond', score: 10 },
      { text: 'I need time alone to process before engaging', score: 8 },
      { text: 'I sometimes react first, then apologize later', score: 5 },
      { text: 'I often say things I regret in the moment', score: 2, redFlag: true },
    ],
  },
  {
    id: 'q2',
    category: 'accountability',
    question: 'When you make a mistake that hurts someone, what do you do?',
    options: [
      { text: 'I acknowledge it fully, apologize sincerely, and change my behavior', score: 10 },
      { text: 'I apologize but sometimes struggle to change', score: 7 },
      { text: 'I explain my intentions to help them understand', score: 4 },
      { text: 'I usually feel defensive and need time before I can apologize', score: 2, redFlag: true },
    ],
  },
  {
    id: 'q3',
    category: 'autonomy',
    question: 'How would you describe your relationship with yourself?',
    options: [
      { text: 'I enjoy my own company and have a strong sense of who I am', score: 10 },
      { text: 'I am generally comfortable alone but still growing', score: 8 },
      { text: 'I prefer being with others but can manage alone time', score: 5 },
      { text: 'I feel incomplete without a partner and struggle when alone', score: 1, redFlag: true },
    ],
  },
  {
    id: 'q4',
    category: 'boundaries',
    question: 'How do you typically handle it when someone crosses your boundaries?',
    options: [
      { text: 'I communicate it clearly and calmly at the appropriate time', score: 10 },
      { text: 'I usually say something, though sometimes I wait too long', score: 7 },
      { text: 'I hint at it or hope they notice my discomfort', score: 4 },
      { text: 'I often let it go to avoid conflict', score: 2, redFlag: true },
    ],
  },
  {
    id: 'q5',
    category: 'conflict-repair',
    question: 'After a disagreement, what matters most to you?',
    options: [
      { text: 'Understanding each other and repairing the connection', score: 10 },
      { text: 'Finding a compromise we can both accept', score: 8 },
      { text: 'Being heard and having my perspective validated', score: 5 },
      { text: 'Proving my point and being right', score: 1, redFlag: true },
    ],
  },
  {
    id: 'q6',
    category: 'integrity-check',
    question: 'How do you feel about partners who have children from previous relationships?',
    options: [
      { text: 'I am open to it and would embrace the responsibility', score: 10 },
      { text: 'I am open but would need to learn and adapt', score: 8 },
      { text: 'It depends on the situation and the other parent', score: 6 },
      { text: 'I prefer not to date people with children', score: 5 },
    ],
  },
  {
    id: 'q7',
    category: 'emotional-regulation',
    question: 'When your partner is upset with you, how do you typically feel?',
    options: [
      { text: 'Curious about their experience and willing to understand', score: 10 },
      { text: 'Concerned and eager to make things right', score: 8 },
      { text: 'Anxious and worried about the relationship', score: 5 },
      { text: 'Attacked and defensive', score: 2, redFlag: true },
    ],
  },
  {
    id: 'q8',
    category: 'accountability',
    question: 'How often do you reflect on your patterns in relationships?',
    options: [
      { text: 'Regularly - I journal or talk through patterns with trusted people', score: 10 },
      { text: 'Sometimes - especially after something goes wrong', score: 7 },
      { text: 'Occasionally - when someone points something out', score: 4 },
      { text: 'Rarely - I prefer to focus on the present', score: 2, redFlag: true },
    ],
  },
  {
    id: 'q9',
    category: 'autonomy',
    question: 'What is your primary motivation for seeking a relationship right now?',
    options: [
      { text: 'I want to share my already-full life with someone', score: 10 },
      { text: 'I am ready for partnership and have done personal work', score: 9 },
      { text: 'I want companionship and connection', score: 6 },
      { text: 'I feel like I should be in a relationship by now', score: 2, redFlag: true },
    ],
  },
  {
    id: 'q10',
    category: 'boundaries',
    question: 'How do you respond when a partner needs space?',
    options: [
      { text: 'I respect it and use the time for my own interests', score: 10 },
      { text: 'I understand but sometimes feel anxious', score: 7 },
      { text: 'I try to understand why and when they will be back', score: 4 },
      { text: 'I feel rejected and worry they are losing interest', score: 2, redFlag: true },
    ],
  },
  {
    id: 'q11',
    category: 'conflict-repair',
    question: 'In your past relationships, how did conflicts typically end?',
    options: [
      { text: 'With mutual understanding and a plan for the future', score: 10 },
      { text: 'With apologies from both sides', score: 7 },
      { text: 'With one person giving in to keep the peace', score: 4 },
      { text: 'With unresolved tension that came up again later', score: 2, redFlag: true },
    ],
  },
  {
    id: 'q12',
    category: 'integrity-check',
    question: 'If you discovered you were not ready for this platform after joining, what would you do?',
    options: [
      { text: 'Be honest with myself and step back to focus on growth', score: 10 },
      { text: 'Talk to my matches about where I am', score: 7 },
      { text: 'Try to make it work anyway', score: 3 },
      { text: 'Hide my uncertainty and continue', score: 0, redFlag: true },
    ],
  },
];

// Follow-up questions for integrity detection
export const followUpQuestions: AssessmentQuestion[] = [
  {
    id: 'f1',
    category: 'integrity-check',
    question: 'You indicated you prefer being with others. Can you share more about how you handle extended alone time?',
    options: [
      { text: 'I have developed practices to enjoy solitude', score: 8 },
      { text: 'I manage but it is genuinely difficult for me', score: 4 },
      { text: 'I usually reach out to friends or family', score: 5 },
      { text: 'I avoid being alone for extended periods', score: 1, redFlag: true },
    ],
  },
  {
    id: 'f2',
    category: 'integrity-check',
    question: 'You mentioned feeling attacked when your partner is upset. What steps have you taken to work on this?',
    options: [
      { text: 'I have worked with a therapist on this pattern', score: 10 },
      { text: 'I am aware of it and actively practice pausing', score: 7 },
      { text: 'I try to remind myself it is not personal', score: 4 },
      { text: 'I have not really worked on it', score: 1, redFlag: true },
    ],
  },
];

export const growthResources: GrowthResource[] = [
  {
    id: 'g1',
    title: 'Emotional Regulation Foundations',
    description: 'Learn to identify, name, and navigate your emotions with greater ease.',
    category: 'Emotional Regulation',
    estimatedTime: '4 weeks',
  },
  {
    id: 'g2',
    title: 'The Art of Accountability',
    description: 'Practice owning your impact without defensiveness or over-apologizing.',
    category: 'Accountability',
    estimatedTime: '3 weeks',
  },
  {
    id: 'g3',
    title: 'Building Wholeness',
    description: 'Develop a stronger relationship with yourself before seeking partnership.',
    category: 'Autonomy',
    estimatedTime: '6 weeks',
  },
  {
    id: 'g4',
    title: 'Healthy Boundaries',
    description: 'Learn to set and maintain boundaries with clarity and kindness.',
    category: 'Boundaries',
    estimatedTime: '4 weeks',
  },
  {
    id: 'g5',
    title: 'Conflict as Connection',
    description: 'Transform disagreements into opportunities for deeper understanding.',
    category: 'Conflict Repair',
    estimatedTime: '5 weeks',
  },
];

export const membershipTiers: MembershipTier[] = [
  {
    id: 'monthly',
    name: 'Monthly',
    price: '$29',
    period: '/month',
    features: [
      'Full access to profiles',
      'Alignment-based matching',
      'Message read receipts',
      'Cancel anytime',
    ],
  },
  {
    id: 'quarterly',
    name: 'Quarterly',
    price: '$69',
    period: '/quarter',
    badge: 'Save 20%',
    features: [
      'Full access to profiles',
      'Alignment-based matching',
      'Priority support',
      'Cancel anytime',
    ],
  },
  {
    id: 'annual',
    name: 'Annual',
    price: '$199',
    period: '/year',
    badge: 'Best value',
    features: [
      'Full access to profiles',
      'Alignment-based matching',
      'Priority support',
      'Quarterly check-ins',
    ],
  },
];

export const calculateAssessmentResult = (answers: { questionId: string; score: number; redFlag?: boolean }[]) => {
  const totalScore = answers.reduce((sum, a) => sum + a.score, 0);
  const maxPossible = answers.length * 10;
  const percentage = Math.round((totalScore / maxPossible) * 100);
  
  const redFlags = answers.filter(a => a.redFlag).length;
  const integrityFlags: string[] = [];
  
  if (redFlags >= 3) {
    integrityFlags.push('Multiple concerning responses detected');
  }
  if (percentage < 60) {
    integrityFlags.push('Significant growth areas identified');
  }
  
  // Calculate category scores
  const categoryScores: Record<string, number> = {};
  const categoryCounts: Record<string, number> = {};
  
  answers.forEach(a => {
    const question = assessmentQuestions.find(q => q.id === a.questionId);
    if (question) {
      categoryScores[question.category] = (categoryScores[question.category] || 0) + a.score;
      categoryCounts[question.category] = (categoryCounts[question.category] || 0) + 1;
    }
  });
  
  // Normalize category scores
  Object.keys(categoryScores).forEach(cat => {
    categoryScores[cat] = Math.round((categoryScores[cat] / (categoryCounts[cat] * 10)) * 100);
  });
  
  // Identify growth areas
  const growthAreas: string[] = [];
  if (categoryScores['emotional-regulation'] < 70) growthAreas.push('Emotional Regulation');
  if (categoryScores['accountability'] < 70) growthAreas.push('Accountability');
  if (categoryScores['autonomy'] < 70) growthAreas.push('Autonomy & Wholeness');
  if (categoryScores['boundaries'] < 70) growthAreas.push('Boundaries');
  if (categoryScores['conflict-repair'] < 70) growthAreas.push('Conflict & Repair');
  
  return {
    totalScore,
    percentage,
    passed: percentage >= 78 && redFlags < 3,
    categoryScores,
    integrityFlags,
    growthAreas,
  };
};
