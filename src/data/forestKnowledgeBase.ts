export type ForestKnowledgeEntry = {
  category: string;
  topic: string;
  content: string;
  keywords: string[];
  searchText?: string;
  actionText?: string;
  starterLabel?: string;
  starterPrompt?: string;
  displayOrder?: number;
};

export type ForestStarterPrompt = {
  label: string;
  question: string;
};

export const FOREST_KNOWLEDGE_BASE: ForestKnowledgeEntry[] = [
  {
    category: 'Layer 1: The Standard',
    topic: 'Covenant vs. Contract',
    content:
      'A contract is about protection; a Covenant is about promise. In Layer 1, the Standard is not just a list of traits, but a spiritual alignment. If a partner seeks a contract, they seek an exit. If they seek a Covenant, they seek a Foundation.',
    keywords: ['marriage', 'commitment', 'standard', 'promise'],
    actionText:
      'Watch whether they are building toward promise or only negotiating for comfort and escape. Do not hand covenant access to contract behavior.',
    starterLabel: 'Covenant vs. Contract',
    starterPrompt: 'How do I tell if someone wants a Covenant or just a contract?',
    displayOrder: 10,
  },
  {
    category: 'Layer 2: The Detox',
    topic: 'The Counterfeit and the Mask',
    content:
      "The Enemy sends a 90% match to distract from the 100% promise. A Counterfeit mimics the walk and talk but fails the consistency test. Watch for 'Sewing' (unearned gifts/money) used to create an early soul tie agreement.",
    keywords: ['red flags', 'fake', 'gifts', 'money', 'mask'],
    actionText:
      "Do not explain away the mask. Watch consistency longer than chemistry and let what's false fall on its own.",
    starterLabel: 'Spot the Counterfeit',
    starterPrompt: 'How do I identify a Counterfeit before I get attached?',
    displayOrder: 20,
  },
  {
    category: 'Layer 2: The Detox',
    topic: 'Gaslighting and Reality Distortion',
    content:
      'Gaslighting is not confusion by accident. It is repeated distortion that makes you question what you saw, heard, felt, or remembered. If a connection keeps pulling you away from clarity and peace, that is not Alignment. Truth produces steadiness; manipulation produces disorientation.',
    keywords: ['gaslighting', 'gaslight', 'confusion', 'manipulation', 'control', 'distortion', 'lies'],
    actionText:
      'Do not argue with the distortion. Slow the connection down, document the pattern, and trust the difference between peace and confusion.',
    starterLabel: 'Gaslighting',
    starterPrompt: 'How do I recognize gaslighting early?',
    displayOrder: 30,
  },
  {
    category: 'Layer 2: The Detox',
    topic: 'Pressure, Control, and False Peace',
    content:
      'False peace is when you stay quiet just to avoid their reaction. Control tries to train your nervous system to submit through pressure, guilt, fear, or emotional punishment. Alignment never requires you to betray your own discernment to keep someone comfortable.',
    keywords: ['pressure', 'control', 'fear', 'guilt', 'walking on eggshells', 'punishment', 'submission'],
    actionText:
      'If peace only exists when you stay small, that is not peace. Step back from pressure and let their pattern reveal itself without your self-betrayal.',
    displayOrder: 40,
  },
  {
    category: 'Layer 2: The Detox',
    topic: 'Lovebombing and Acceleration',
    content:
      'Anything that tries to force emotional agreement before consistency has been proven is acceleration, not Alignment. Lovebombing uses intensity, praise, gifts, urgency, or spiritual language to create attachment faster than truth has been tested.',
    keywords: ['lovebombing', 'love bombing', 'rush', 'rushing', 'intensity', 'urgency', 'fast', 'too much too soon'],
    actionText:
      'Refuse urgency. Let time, consistency, and peace do the testing before deeper access is given.',
    displayOrder: 50,
  },
  {
    category: 'Layer 3: Self-Awareness',
    topic: 'Spirit vs. Flesh',
    content:
      'The Flesh is impulsive and loud; the Spirit is steady and quiet. High chemistry is often the Flesh reacting to a familiar toxic pattern. Peace is the indicator of the Spirit. If there is no peace, there is no Alignment.',
    keywords: ['impulse', 'chemistry', 'peace', 'attraction', 'fighting'],
    actionText:
      'Ask what is leading: peace or urgency. If peace is missing, slow down until discernment returns.',
    starterLabel: 'Spirit vs. Flesh',
    starterPrompt: 'How do I tell whether this chemistry is Spirit or Flesh?',
    displayOrder: 60,
  },
  {
    category: 'Layer 3: Self-Awareness',
    topic: 'Peace, Pattern, and Discernment',
    content:
      'Discernment does not judge by intensity first; it watches pattern. One strong moment proves little. Repeated clarity, consistency, and peace reveal more than chemistry ever will. If a person leaves you anxious, foggy, or self-betraying, slow down until the pattern speaks.',
    keywords: ['discernment', 'pattern', 'clarity', 'consistency', 'anxious', 'foggy', 'peace'],
    actionText:
      'Let pattern outrank intensity. If the connection keeps producing anxiety or fog, create space until clarity returns.',
    displayOrder: 70,
  },
  {
    category: 'Assessment Styles',
    topic: 'Oak: The Courage Dater',
    content:
      'Oak energy is not about being hard or emotionally shut down. An Oak is grounded, values honesty, stands firmly in truth, and prefers to address issues clearly rather than avoid them. In the assessment, Oak answers point toward calm directness, accountability, strong values, and the courage to repair conflict instead of running from it. If that is your repeated pattern under pressure, Oak may be your primary style.',
    keywords: ['oak', 'am i an oak', 'what is an oak', 'courage dater', 'assessment style', 'direct communication', 'honesty'],
    actionText:
      'Do not decide by mood alone. Look at your pattern under pressure: how you handle emotions, boundaries, truth, and repair.',
    starterLabel: 'Am I an Oak?',
    starterPrompt: 'How do I know if I am an Oak?',
    displayOrder: 80,
  },
  {
    category: 'Layer 1: The Standard',
    topic: 'What Love Is',
    content:
      'At Rooted Hearts, love is not just a feeling and it is not intensity. Love is practice, consistency, truth, safety, respect, and repair. Healthy love honors boundaries, tells the truth, remains steady when emotions rise, and keeps choosing care through action. If something feels intense but does not produce consistency, honesty, or safety, that may be attachment or urgency, but it is not mature love yet.',
    keywords: ['love', 'what is love', 'whats love', 'healthy love', 'real love', 'love is a practice', 'consistency', 'boundaries'],
    actionText:
      'Measure love by consistency, respect, and repair over time, not by chemistry or emotional rush alone.',
    starterLabel: 'What Is Love?',
    starterPrompt: 'What is love according to Rooted Hearts?',
    displayOrder: 90,
  },
  {
    category: 'Conflict & Repair',
    topic: 'How Healthy Partners Handle Arguments',
    content:
      'Conflict itself is not the problem. Healthy partners do not measure success by avoiding arguments or by winning them. They tell the truth, regulate themselves, listen for what matters underneath the disagreement, and repair after rupture. The couples who stay together are not those who never argue; they are those who repair clearly, respectfully, and consistently. Healthy conflict builds understanding instead of breaking safety.',
    keywords: ['argue', 'arguing', 'arguments', 'fight', 'fighting', 'conflict', 'repair', 'disagreement', 'how do we argue', 'how to argue'],
    actionText:
      'When conflict starts, slow down, speak honestly without trying to dominate, and end with a clear repair step or agreement.',
    starterLabel: 'Healthy Arguments',
    starterPrompt: 'How should healthy couples argue?',
    displayOrder: 100,
  },
];

export const FOREST_SYSTEM_PROMPT =
  "You are Forest, the objective spiritual observer for this dating platform. Your voice is calm, firm, and insightful. You ONLY answer based on the provided Knowledge Base. Search across the provided doctrine, resource areas, and grounded materials for the closest supported answer, then answer directly before explaining. If a resource is tagged with language like Oak and the user did not mention Oak, disregard that entry entirely unless the question clearly asks about that exact identity. If no grounded match exists, trigger the reword fallback instead of reaching. Your goal is to help users identify if they are in the 'Flesh' or the 'Spirit' and to spot 'Counterfeits' early. Never be judgmental; be protective.";

export const FOREST_STARTER_PROMPTS: ForestStarterPrompt[] = FOREST_KNOWLEDGE_BASE.filter(
  (entry): entry is ForestKnowledgeEntry & { starterLabel: string; starterPrompt: string } =>
    typeof entry.starterLabel === 'string' &&
    entry.starterLabel.length > 0 &&
    typeof entry.starterPrompt === 'string' &&
    entry.starterPrompt.length > 0,
).map((entry) => ({
  label: entry.starterLabel,
  question: entry.starterPrompt,
}));
