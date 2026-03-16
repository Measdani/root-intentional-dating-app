import type { AssessmentAnswer, AssessmentQuestion, GrowthResource, MembershipTier } from '@/types';
import {
  ASSESSMENT_CORE_STYLES,
  buildEmptyStyleScores,
  isAssessmentCoreStyle,
  normalizeAssessmentQuestionsWithStyles,
} from '@/services/assessmentStyleService';

const baseAssessmentQuestions: AssessmentQuestion[] = [
  {
    id: 'q1',
    category: 'emotional-regulation',
    question: 'When you feel overwhelmed by emotion, what is your typical response?',
    options: [
      { text: 'I pause, name the feeling, and choose when to respond', score: 10, style: 'oak' },
      { text: 'I try to stay calm and consider how my emotions may affect the other person', score: 9, style: 'willow' },
      { text: 'I need time alone to process before engaging', score: 8, style: 'fern' },
      { text: 'I try to understand what is happening beneath the emotion so it can be worked through constructively', score: 9, style: 'gardener' },
      { text: 'I reconnect to something positive and return to the conversation when emotions settle', score: 7, style: 'wildflower' },
    ],
  },
  {
    id: 'q2',
    category: 'accountability',
    question: 'When you make a mistake that hurts someone, what do you do?',
    options: [
      { text: 'I acknowledge it fully, apologize sincerely, and change my behavior', score: 10, style: 'oak' },
      { text: 'I apologize and try to make sure the other person feels heard and cared for', score: 9, style: 'willow' },
      { text: 'I reflect deeply on what happened so I can respond more thoughtfully', score: 8, style: 'fern' },
      { text: 'I want to understand the root of the harm and work together to repair it', score: 10, style: 'gardener' },
      { text: 'I apologize sincerely and try to bring warmth and reconnection back to the relationship', score: 8, style: 'wildflower' },
    ],
  },
  {
    id: 'q3',
    category: 'autonomy',
    question: 'How would you describe your relationship with yourself?',
    options: [
      { text: 'I know who I am and stand firmly in my values', score: 10, style: 'oak' },
      { text: 'I have a caring relationship with myself and try to give myself grace as I grow', score: 9, style: 'willow' },
      { text: 'I know myself well and value time alone to reflect and reset', score: 10, style: 'fern' },
      { text: 'I see myself as always growing and becoming more whole over time', score: 9, style: 'gardener' },
      { text: 'I enjoy my independence and love sharing life and meaningful experiences with others', score: 8, style: 'wildflower' },
    ],
  },
  {
    id: 'q4',
    category: 'boundaries',
    question: 'How do you typically handle it when someone crosses your boundaries?',
    options: [
      { text: 'I communicate it clearly and calmly at the appropriate time', score: 10, style: 'oak' },
      { text: 'I try to express it in a way that protects both honesty and harmony', score: 8, style: 'willow' },
      { text: 'I step back to process first, then return to communicate my boundary', score: 8, style: 'fern' },
      { text: 'I address it directly and try to understand how to prevent it from happening again together', score: 9, style: 'gardener' },
      { text: 'I address it honestly but try to keep the conversation constructive and connected', score: 8, style: 'wildflower' },
    ],
  },
  {
    id: 'q5',
    category: 'conflict-repair',
    question: 'After a disagreement, what matters most to you?',
    options: [
      { text: 'That the issue is addressed honestly and clearly', score: 9, style: 'oak' },
      { text: 'That both people feel heard and emotionally safe again', score: 9, style: 'willow' },
      { text: 'That there is enough space to reflect before moving forward', score: 8, style: 'fern' },
      { text: 'Understanding each other and repairing the connection', score: 10, style: 'gardener' },
      { text: 'Restoring warmth, closeness, and positive energy between us', score: 8, style: 'wildflower' },
    ],
  },
  {
    id: 'q6',
    category: 'integrity-check',
    question: 'How do you feel about partners who have children from previous relationships?',
    options: [
      { text: 'I am open to it if our values, responsibilities, and expectations are clear', score: 9, style: 'oak' },
      { text: 'I am open to it and would want to approach the situation with care and empathy', score: 9, style: 'willow' },
      { text: 'I am open to it, but I would need time to understand the dynamic and what it requires', score: 8, style: 'fern' },
      { text: 'I am open to it and willing to grow into the responsibility together', score: 10, style: 'gardener' },
      { text: 'I am open to it and like the idea of building a blended life with warmth and intention', score: 8, style: 'wildflower' },
    ],
  },
  {
    id: 'q7',
    category: 'emotional-regulation',
    question: 'When your partner is upset with you, how do you typically feel?',
    options: [
      { text: 'Focused on understanding the issue clearly so it can be addressed', score: 9, style: 'oak' },
      { text: 'Concerned about their feelings and wanting to respond with care', score: 9, style: 'willow' },
      { text: 'I need a moment to process my emotions before I respond well', score: 8, style: 'fern' },
      { text: 'Curious about their experience and willing to work through it together', score: 10, style: 'gardener' },
      { text: 'I want to understand them and find a way for us to reconnect', score: 8, style: 'wildflower' },
    ],
  },
  {
    id: 'q8',
    category: 'accountability',
    question: 'How often do you reflect on your patterns in relationships?',
    options: [
      { text: 'Regularly - I believe self-awareness helps me show up with integrity', score: 9, style: 'oak' },
      { text: 'Often - especially when I notice tension or emotional disconnection', score: 8, style: 'willow' },
      { text: 'Regularly - I need time to think through my patterns deeply', score: 10, style: 'fern' },
      { text: 'Often - reflection helps me grow and build healthier relationships', score: 9, style: 'gardener' },
      { text: 'Often - and I also try to create better experiences moving forward', score: 8, style: 'wildflower' },
    ],
  },
  {
    id: 'q9',
    category: 'autonomy',
    question: 'What is your primary motivation for seeking a relationship right now?',
    options: [
      { text: 'I want a relationship built on honesty, stability, and shared values', score: 10, style: 'oak' },
      { text: 'I want emotional connection, peace, and mutual care', score: 9, style: 'willow' },
      { text: 'I want a meaningful connection that respects emotional depth and individuality', score: 9, style: 'fern' },
      { text: 'I want a partnership where both people can grow and build together', score: 10, style: 'gardener' },
      { text: 'I want to share life, joy, and meaningful experiences with someone', score: 9, style: 'wildflower' },
    ],
  },
  {
    id: 'q10',
    category: 'boundaries',
    question: 'How do you respond when a partner needs space?',
    options: [
      { text: 'I respect it and appreciate clear communication about what they need', score: 9, style: 'oak' },
      { text: 'I respect it and try to remain understanding and emotionally steady', score: 9, style: 'willow' },
      { text: 'I respect it and use the time for my own reflection and grounding', score: 10, style: 'fern' },
      { text: 'I respect it and trust we can return to the conversation with more clarity', score: 9, style: 'gardener' },
      { text: 'I respect their space and look forward to reconnecting when they are ready', score: 8, style: 'wildflower' },
    ],
  },
  {
    id: 'q11',
    category: 'conflict-repair',
    question: 'In your past relationships, how did conflicts typically end?',
    options: [
      { text: 'With honest conversations and a clearer understanding of what needed to change', score: 9, style: 'oak' },
      { text: 'With emotional reassurance and an effort to restore peace', score: 8, style: 'willow' },
      { text: 'With time to reflect and return to the issue more calmly', score: 8, style: 'fern' },
      { text: 'With mutual understanding and a plan for how to move forward together', score: 10, style: 'gardener' },
      { text: 'With reconnection and an effort to bring warmth back into the relationship', score: 8, style: 'wildflower' },
    ],
  },
  {
    id: 'q12',
    category: 'integrity-check',
    question: 'If you discovered you were not ready for this platform after joining, what would you do?',
    options: [
      { text: 'Be honest with myself and step back until I am ready', score: 10, style: 'oak' },
      { text: 'Communicate gently and respectfully about where I am emotionally', score: 8, style: 'willow' },
      { text: 'Take time away to reflect and focus on personal growth', score: 9, style: 'fern' },
      { text: 'Step back, do the work, and return when I can participate in a healthier way', score: 10, style: 'gardener' },
      { text: 'Be honest about where I am while staying hopeful and open to growth later', score: 8, style: 'wildflower' },
    ],
  },
];

export const assessmentQuestions: AssessmentQuestion[] =
  normalizeAssessmentQuestionsWithStyles(baseAssessmentQuestions);

export const growthResources: GrowthResource[] = [
  {
    id: 'g1',
    title: 'Emotional Regulation Foundations',
    description: 'Learn to identify, name, and navigate your emotions with greater ease.',
    category: 'Emotional Regulation',
    estimatedTime: '4 weeks',
    modules: [
      {
        id: 'g1-m1',
        title: 'Understanding Your Emotions',
        description: 'Learn what emotions are, why they matter, and how they\'re data about your values.',
        orderIndex: 1,
      },
      {
        id: 'g1-m2',
        title: 'The RAIN Technique',
        description: 'Recognize, Allow, Investigate, Nurture - a 4-step process for emotional awareness.',
        orderIndex: 2,
      },
      {
        id: 'g1-m3',
        title: 'Grounding Techniques',
        description: 'Practical exercises to anchor yourself in the present when overwhelmed.',
        orderIndex: 3,
      },
      {
        id: 'g1-m4',
        title: 'Emotions in Relationships',
        description: 'How to regulate emotions while staying connected to your partner.',
        orderIndex: 4,
      },
    ],
  },
  {
    id: 'g2',
    title: 'The Art of Accountability',
    description: 'Practice owning your impact without defensiveness or over-apologizing.',
    category: 'Accountability',
    estimatedTime: '3 weeks',
    modules: [
      {
        id: 'g2-m1',
        title: 'What Accountability Really Is',
        description: 'Understanding accountability vs shame, defensiveness, and excuse-making.',
        orderIndex: 1,
      },
      {
        id: 'g2-m2',
        title: 'The Accountability Cycle',
        description: 'The 4-step process: Awareness, Understanding, Apology, Repair & Commitment.',
        orderIndex: 2,
      },
      {
        id: 'g2-m3',
        title: 'The Genuine Apology',
        description: 'How to apologize in ways that actually repair trust and connection.',
        orderIndex: 3,
      },
      {
        id: 'g2-m4',
        title: 'Following Through',
        description: 'Building trust through consistent behavior change over time.',
        orderIndex: 4,
      },
    ],
  },
  {
    id: 'g3',
    title: 'Building Wholeness',
    description: 'Develop a stronger relationship with yourself before seeking partnership.',
    category: 'Autonomy',
    estimatedTime: '6 weeks',
    modules: [
      {
        id: 'g3-m1',
        title: 'The Wholeness Framework',
        description: 'Independence vs interdependence - building a complete self.',
        orderIndex: 1,
      },
      {
        id: 'g3-m2',
        title: 'The Three Pillars',
        description: 'Purpose, Connection, and Practice - the foundation of a strong self.',
        orderIndex: 2,
      },
      {
        id: 'g3-m3',
        title: 'Building Your Self',
        description: 'Practical ways to deepen your relationship with yourself.',
        orderIndex: 3,
      },
      {
        id: 'g3-m4',
        title: 'Bringing Wholeness to Partnership',
        description: 'How a strong self creates the conditions for deep connection.',
        orderIndex: 4,
      },
    ],
  },
  {
    id: 'g4',
    title: 'Healthy Boundaries',
    description: 'Learn to set and maintain boundaries with clarity and kindness.',
    category: 'Boundaries',
    estimatedTime: '4 weeks',
    modules: [
      {
        id: 'g4-m1',
        title: 'What Boundaries Are',
        description: 'Understanding boundaries as protection, not walls.',
        orderIndex: 1,
      },
      {
        id: 'g4-m2',
        title: 'Types of Boundaries',
        description: 'Emotional, physical, time, mental, and sexual boundaries.',
        orderIndex: 2,
      },
      {
        id: 'g4-m3',
        title: 'Setting Boundaries',
        description: 'How to communicate boundaries with clarity and kindness.',
        orderIndex: 3,
      },
      {
        id: 'g4-m4',
        title: 'Boundaries in Partnership',
        description: 'How to honor your boundaries and your partner\'s.',
        orderIndex: 4,
      },
    ],
  },
  {
    id: 'g5',
    title: 'Conflict as Connection',
    description: 'Transform disagreements into opportunities for deeper understanding.',
    category: 'Conflict & Repair',
    estimatedTime: '5 weeks',
    modules: [
      {
        id: 'g5-m1',
        title: 'Why Conflict Matters',
        description: 'Understanding that conflict resolution, not avoidance, builds intimacy.',
        orderIndex: 1,
      },
      {
        id: 'g5-m2',
        title: 'The Repair Conversation',
        description: 'The 5-step framework for resolving disagreements productively.',
        orderIndex: 2,
      },
      {
        id: 'g5-m3',
        title: 'Healing Language',
        description: 'Words that heal vs words that harm during conflict.',
        orderIndex: 3,
      },
      {
        id: 'g5-m4',
        title: 'Advanced Conflict Skills',
        description: 'Techniques for managing emotions and finding mutual understanding.',
        orderIndex: 4,
      },
    ],
  },
];

export const paidGrowthResources: GrowthResource[] = [
  {
    id: 'pg1',
    title: 'Advanced Partnership Dynamics',
    description: 'Deepen your understanding of how to show up as your best self in partnership.',
    category: 'Partnership',
    estimatedTime: '6 weeks',
  },
  {
    id: 'pg2',
    title: 'Navigating Intimacy & Vulnerability',
    description: 'Create deeper emotional and physical intimacy through authentic connection.',
    category: 'Intimacy',
    estimatedTime: '5 weeks',
  },
  {
    id: 'pg3',
    title: 'Building a Shared Vision',
    description: 'Align on values, goals, and create a partnership that grows stronger over time.',
    category: 'Vision',
    estimatedTime: '4 weeks',
  },
  {
    id: 'pg4',
    title: 'Love Languages & Connection',
    description: 'Understand and speak your partner\'s unique language of love.',
    category: 'Connection',
    estimatedTime: '3 weeks',
  },
  {
    id: 'pg5',
    title: 'Managing Life Transitions Together',
    description: 'Build resilience as a team through change, challenges, and growth.',
    category: 'Resilience',
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

export const calculateAssessmentResult = (
  answers: AssessmentAnswer[],
  questionBank: AssessmentQuestion[] = assessmentQuestions
) => {
  const alignmentThreshold = 85;
  const totalScore = answers.reduce((sum, a) => sum + a.score, 0);
  const maxPossible = answers.length * 10;
  const percentage = Math.round((totalScore / maxPossible) * 100);
  const integrityFlags: string[] = [];
  if (percentage < alignmentThreshold) {
    integrityFlags.push('Strengthening these areas will improve relationship stability and connection quality.');
  }

  const styleScores = buildEmptyStyleScores();

  // Calculate category scores
  const categoryScores: Record<string, number> = {};
  const categoryCounts: Record<string, number> = {};

  answers.forEach((a) => {
    if (isAssessmentCoreStyle(a.style)) {
      styleScores[a.style] += a.score;
    }

    const question = questionBank.find((q) => q.id === a.questionId);
    if (question) {
      categoryScores[question.category] = (categoryScores[question.category] || 0) + a.score;
      categoryCounts[question.category] = (categoryCounts[question.category] || 0) + 1;
    }
  });

  // Normalize category scores
  Object.keys(categoryScores).forEach(cat => {
    categoryScores[cat] = Math.round((categoryScores[cat] / (categoryCounts[cat] * 10)) * 100);
  });

  const rankedStyles = [...ASSESSMENT_CORE_STYLES].sort((a, b) => {
    const scoreDiff = styleScores[b] - styleScores[a];
    if (scoreDiff !== 0) return scoreDiff;
    return ASSESSMENT_CORE_STYLES.indexOf(a) - ASSESSMENT_CORE_STYLES.indexOf(b);
  });
  const primaryStyle = styleScores[rankedStyles[0]] > 0 ? rankedStyles[0] : undefined;
  const secondaryStyle = styleScores[rankedStyles[1]] > 0 ? rankedStyles[1] : undefined;

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
    passed: percentage >= alignmentThreshold,
    categoryScores,
    integrityFlags,
    growthAreas,
    styleScores,
    primaryStyle,
    secondaryStyle,
  };
};

