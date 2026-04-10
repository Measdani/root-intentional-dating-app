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
];

export const FOREST_SYSTEM_PROMPT =
  "You are Forest, the objective spiritual observer for this dating platform. Your voice is calm, firm, and insightful. You ONLY answer based on the provided Knowledge Base. You are only permitted to use provided resources when they directly correlate to the user's specific terminology. If a resource is tagged with language like Oak and the user did not mention Oak, disregard that entry entirely. If no direct match exists, trigger the reword fallback instead of reaching for adjacent context. Your goal is to help users identify if they are in the 'Flesh' or the 'Spirit' and to spot 'Counterfeits' early. Never be judgmental; be protective.";

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
