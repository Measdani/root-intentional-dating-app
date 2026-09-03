import type { ApprovedQuestion, LearningAreaId, LearningLesson } from '@/types/learning';

export const learningAreaMeta: Record<LearningAreaId, { title: string; description: string }> = {
  'know-yourself': {
    title: 'Know Yourself',
    description: 'Understand your patterns, needs, boundaries, standards, and emotional responses.',
  },
  'learn-to-date': {
    title: 'Learn to Date',
    description: 'Practice discernment, healthy pacing, clear communication, and intentional choices.',
  },
  'build-relationship': {
    title: 'Build a Healthy Relationship',
    description: 'Learn how trust, vulnerability, expectations, and emotional safety are built together.',
  },
  'sustain-love': {
    title: 'Sustain Healthy Love',
    description: 'Strengthen connection, repair disconnection, and keep growing without losing yourself.',
  },
};

export const learningLessons: LearningLesson[] = [
  {
    id: 'patterns-before-partners', areaId: 'know-yourself', order: 1, estimatedMinutes: 8,
    title: 'Recognizing the patterns you repeat',
    summary: 'Notice what feels familiar before deciding that it is healthy.',
    sharedFoundation: 'A repeated pattern is not a character flaw. It is information. Healthy change begins when you can name what you repeatedly tolerate, chase, avoid, or try to repair for someone else.',
    perspective: {
      female: 'Pay attention to moments when being understanding turns into carrying the emotional work for two people. Compassion should not require abandoning your own needs.',
      male: 'Pay attention to moments when independence becomes emotional distance. Needing time is healthy when you communicate it and return to the conversation.',
    },
    reflectionPrompt: 'What behavior have you repeatedly explained away even though it left you feeling unsafe, unseen, or uncertain?',
    actionStep: 'Write one pattern you want to interrupt and one different choice you can make the next time it appears.',
  },
  {
    id: 'boundaries-without-guilt', areaId: 'know-yourself', order: 2, estimatedMinutes: 10,
    title: 'Boundaries without guilt',
    summary: 'Use boundaries to explain your participation—not to control someone else.',
    sharedFoundation: 'A boundary names what you need and what you will do if that need is not respected. It does not demand obedience. Healthy boundaries are clear, proportionate, and followed by consistent action.',
    perspective: {
      female: 'You do not have to overexplain a reasonable boundary to make it valid. Clarity is enough; repeated persuasion can pull you back into negotiation over your own wellbeing.',
      male: 'A boundary can be direct without becoming cold or punitive. Explain the need, state the action, and leave room for the other person to make an informed choice.',
    },
    reflectionPrompt: 'Where do you say yes to avoid disappointing someone and then feel resentment afterward?',
    actionStep: 'Practice: “I am not comfortable with that. If it continues, I will step away from the situation.”',
  },
  {
    id: 'healthy-pacing', areaId: 'learn-to-date', order: 1, estimatedMinutes: 9,
    title: 'Healthy pacing when chemistry is strong',
    summary: 'Let consistency—not intensity—reveal the quality of a connection.',
    sharedFoundation: 'Chemistry tells you that you feel drawn to someone. Time shows whether their behavior is stable, compatible, and trustworthy. Healthy pacing protects your ability to observe before becoming deeply invested.',
    perspective: {
      female: 'Avoid filling unanswered questions with potential. Let the person demonstrate availability, effort, and emotional consistency over time.',
      male: 'Avoid making promises that your present level of knowledge cannot support. Interest can be sincere without rushing emotional or practical commitment.',
    },
    reflectionPrompt: 'When you feel a strong connection, what do you tend to assume before it has been demonstrated?',
    actionStep: 'Choose one part of the connection that needs more observation before your next major step.',
  },
  {
    id: 'read-actions-and-words', areaId: 'learn-to-date', order: 2, estimatedMinutes: 7,
    title: 'Reading actions and words together',
    summary: 'Look for agreement between what someone says, chooses, and repeats.',
    sharedFoundation: 'Words communicate intention. Repeated behavior reveals capacity and priorities. Healthy discernment considers both instead of treating either one as the complete truth.',
    perspective: {
      female: 'Do not turn inconsistency into a project you must solve. Ask directly, observe the response, and let repeated behavior inform your decision.',
      male: 'Clear intention needs matching follow-through. If your capacity changes, communicate that change instead of leaving the other person to interpret silence.',
    },
    reflectionPrompt: 'Where have someone’s words and repeated behavior told you different stories?',
    actionStep: 'Write what has been consistently demonstrated without adding excuses, predictions, or imagined potential.',
  },
  {
    id: 'define-the-relationship', areaId: 'build-relationship', order: 1, estimatedMinutes: 11,
    title: 'Defining the relationship together',
    summary: 'Replace private assumptions with shared expectations.',
    sharedFoundation: 'Commitment becomes emotionally safer when both people understand what they are agreeing to. Discuss exclusivity, communication, time, boundaries, fidelity, and the direction of the relationship plainly.',
    perspective: {
      female: 'Express what commitment means to you without shrinking the standard to preserve the connection. Agreement matters more than simply receiving a label.',
      male: 'Initiating or participating in a definition conversation is part of relational responsibility. Ambiguity should not be used to receive commitment without offering clarity.',
    },
    reflectionPrompt: 'Which relationship expectation do you assume should be understood without being discussed?',
    actionStep: 'Prepare one open question that invites a real agreement instead of a yes-or-no reassurance.',
  },
  {
    id: 'conflict-without-threat', areaId: 'build-relationship', order: 2, estimatedMinutes: 12,
    title: 'Conflict without threatening the connection',
    summary: 'Address the problem without making emotional safety the price of disagreement.',
    sharedFoundation: 'Healthy conflict protects dignity. Neither person should use abandonment, contempt, intimidation, silence, or humiliation to gain control. Pauses should include an agreed time to return.',
    perspective: {
      female: 'Name the need directly instead of testing whether your partner will discover it. Directness gives the relationship a fair opportunity to respond.',
      male: 'Taking space is not the same as disappearing. State that you need a pause, explain when you will return, and keep that promise.',
    },
    reflectionPrompt: 'What do you do when disagreement makes you fear rejection, loss of control, or being misunderstood?',
    actionStep: 'Use: “I want to solve this with you. I need a short pause, and I will return at ___.”',
  },
  {
    id: 'repair-after-disconnection', areaId: 'sustain-love', order: 1, estimatedMinutes: 10,
    title: 'Repairing after disconnection',
    summary: 'Move beyond ending the argument and restore understanding.',
    sharedFoundation: 'Repair includes acknowledging impact, taking responsibility, understanding the unmet need, and agreeing on a different action. An apology without changed behavior cannot carry repair alone.',
    perspective: {
      female: 'Make room for repair without taking responsibility for producing all of it. Both people should be able to name their contribution and their next action.',
      male: 'Repair is not an admission that every accusation is correct. It is the willingness to understand impact, own your part, and help rebuild safety.',
    },
    reflectionPrompt: 'After conflict ends, what helps you genuinely feel connected again?',
    actionStep: 'Complete: “My part was ___. I understand that it affected you by ___. Next time I will ___.”',
  },
  {
    id: 'grow-without-losing-yourself', areaId: 'sustain-love', order: 2, estimatedMinutes: 9,
    title: 'Growing together without losing yourself',
    summary: 'Build a shared life while continuing to care for each individual life.',
    sharedFoundation: 'Healthy interdependence allows closeness and individuality to exist together. Partners can share responsibility, intimacy, and purpose without requiring either person to abandon friendships, interests, rest, or personal growth.',
    perspective: {
      female: 'Notice when supporting the relationship quietly becomes managing everyone’s needs before your own. Your wellbeing belongs inside the shared plan.',
      male: 'Notice when providing or solving becomes the only way you participate emotionally. Your inner experience and need for care also belong in the relationship.',
    },
    reflectionPrompt: 'Which part of yourself becomes hardest to maintain when you are deeply invested in a relationship?',
    actionStep: 'Choose one personal practice and one shared practice that deserve protected time this month.',
  },
];

export const approvedQuestions: ApprovedQuestion[] = [
  {
    id: 'boundary-or-wall', areaId: 'know-yourself', perspective: 'shared',
    question: 'How do I know whether I am setting a boundary or building a wall?',
    answer: 'A boundary allows connection under conditions that protect your wellbeing. A wall prevents vulnerability altogether. Ask whether you have clearly communicated the need, allowed the other person to choose, and selected a proportionate action rather than using distance to punish or avoid.',
  },
  {
    id: 'strong-chemistry-pacing', areaId: 'learn-to-date', perspective: 'shared',
    question: 'What does healthy pacing look like when the connection feels strong?',
    answer: 'Enjoy the connection while allowing time for patterns to become visible. Keep your routines, avoid premature promises, discuss expectations directly, and let reliability across ordinary moments carry more weight than early intensity.',
  },
  {
    id: 'repair-shutdown', areaId: 'build-relationship', perspective: 'shared',
    question: 'How can two people repair a conversation after shutting down?',
    answer: 'First restore enough calm to speak respectfully. Then agree on a return time, name what caused the shutdown without blame, acknowledge each person’s impact, and choose one different action for the next difficult conversation.',
  },
];
