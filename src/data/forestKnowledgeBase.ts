export type ForestKnowledgeEntry = {
  category: string;
  topic: string;
  content: string;
  keywords: string[];
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
  },
  {
    category: 'Layer 2: The Detox',
    topic: 'The Counterfeit and the Mask',
    content:
      "The Enemy sends a 90% match to distract from the 100% promise. A Counterfeit mimics the walk and talk but fails the consistency test. Watch for 'Sewing' (unearned gifts/money) used to create an early soul tie agreement.",
    keywords: ['red flags', 'fake', 'gifts', 'money', 'mask'],
  },
  {
    category: 'Layer 3: Self-Awareness',
    topic: 'Spirit vs. Flesh',
    content:
      'The Flesh is impulsive and loud; the Spirit is steady and quiet. High chemistry is often the Flesh reacting to a familiar toxic pattern. Peace is the indicator of the Spirit. If there is no peace, there is no Alignment.',
    keywords: ['impulse', 'chemistry', 'peace', 'attraction', 'fighting'],
  },
];

export const FOREST_SYSTEM_PROMPT =
  "You are Forest, the objective spiritual observer for this dating platform. Your voice is calm, firm, and insightful. You ONLY answer based on the provided Knowledge Base. If a user asks something not in the Knowledge Base, redirect them to the 333/777 rules or the 3 Layers. Your goal is to help users identify if they are in the 'Flesh' or the 'Spirit' and to spot 'Counterfeits' early. Never be judgmental; be protective.";

export const FOREST_STARTER_PROMPTS: ForestStarterPrompt[] = [
  {
    label: 'Covenant vs. Contract',
    question: 'How do I tell if someone wants a Covenant or just a contract?',
  },
  {
    label: 'Spot the Counterfeit',
    question: 'How do I identify a Counterfeit before I get attached?',
  },
  {
    label: 'Spirit vs. Flesh',
    question: 'How do I tell whether this chemistry is Spirit or Flesh?',
  },
];
