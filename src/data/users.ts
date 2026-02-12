import type { User } from '@/types';

export const sampleUsers: User[] = [
  {
    id: 'u1',
    name: 'Maya',
    age: 31,
    city: 'Portland, OR',
    partnershipIntent: 'marriage',
    familyAlignment: {
      hasChildren: false,
      wantsChildren: 'wants',
      openToPartnerWithParent: 'open-inexperienced',
    },
    values: ['Honesty', 'Growth', 'Family', 'Calm', 'Loyalty'],
    growthFocus: 'Deepening emotional intimacy',
    relationshipVision: 'A partnership built on radical honesty, shared growth, and adventurous partnership.',
    communicationStyle: 'Direct and reflective. Comfortable with vulnerability. Values processing emotions together.',
    bio: 'Therapist who believes in the power of vulnerability. Looking for someone who values inner work as much as outer adventure.',
    alignmentScore: 94,
    photoUrl: 'https://i.pravatar.cc/300?u=maya&img=1',
  },
  {
    id: 'u2',
    name: 'James',
    age: 34,
    city: 'Denver, CO',
    partnershipIntent: 'life-partnership',
    familyAlignment: {
      hasChildren: true,
      wantsChildren: 'open',
      openToPartnerWithParent: 'actively-wants',
    },
    values: ['Integrity', 'Kindness', 'Adventure', 'Stability', 'Presence'],
    growthFocus: 'Patience in conflict',
    relationshipVision: 'Building a stable, growth-centered partnership rooted in faith, presence, and family.',
    communicationStyle: 'Patient and thoughtful. Needs space before conflict resolution. Listens deeply.',
    bio: 'Single dad and software engineer. I have learned that love is a practice, not a feeling. Seeking a partner for the long journey.',
    alignmentScore: 91,
    photoUrl: 'https://i.pravatar.cc/300?u=james&img=2',
  },
  {
    id: 'u3',
    name: 'Sofia',
    age: 29,
    city: 'Austin, TX',
    partnershipIntent: 'long-term',
    familyAlignment: {
      hasChildren: false,
      wantsChildren: 'open',
      openToPartnerWithParent: 'comfortable',
    },
    values: ['Curiosity', 'Authenticity', 'Joy', 'Depth', 'Respect'],
    growthFocus: 'Receiving love',
    relationshipVision: 'Two whole people choosing each other daily, with curiosity, joy, and authentic connection.',
    communicationStyle: 'Curious and conversational. Prefers depth over small talk. Processes thoughtfully.',
    bio: 'Writer and meditation practitioner. I believe the best relationships are two whole people choosing each other daily.',
    alignmentScore: 88,
    photoUrl: 'https://i.pravatar.cc/300?u=sofia&img=3',
  },
  {
    id: 'u4',
    name: 'David',
    age: 37,
    city: 'Seattle, WA',
    partnershipIntent: 'marriage',
    familyAlignment: {
      hasChildren: false,
      wantsChildren: 'wants',
      openToPartnerWithParent: 'comfortable',
    },
    values: ['Commitment', 'Growth', 'Service', 'Faith', 'Trust'],
    growthFocus: 'Vulnerability with strength',
    relationshipVision: 'A marriage rooted in faith, service, and intentional growth—building a legacy together.',
    communicationStyle: 'Clear and direct with strong listening skills. Committed to understanding different perspectives.',
    bio: 'Nonprofit director who has done the work to understand my patterns. Ready to build something intentional and lasting.',
    alignmentScore: 96,
    photoUrl: 'https://i.pravatar.cc/300?u=david&img=4',
  },
  {
    id: 'u5',
    name: 'Rachel',
    age: 33,
    city: 'Minneapolis, MN',
    partnershipIntent: 'life-partnership',
    familyAlignment: {
      hasChildren: true,
      wantsChildren: 'does-not-want',
      openToPartnerWithParent: 'actively-wants',
    },
    values: ['Honesty', 'Humor', 'Resilience', 'Compassion', 'Clarity'],
    growthFocus: 'Balancing independence and intimacy',
    relationshipVision: 'A strong, resilient partnership that honors both my role as a mother and our connection as partners.',
    communicationStyle: 'Direct and honest with warmth. Values efficiency. Uses humor to navigate tension.',
    bio: 'Doctor and mother of one. My child is my priority, and I am looking for a partner who understands that and has space for us both.',
    alignmentScore: 89,
    photoUrl: 'https://i.pravatar.cc/300?u=rachel&img=5',
  },
  {
    id: 'u6',
    name: 'Marcus',
    age: 30,
    city: 'Chicago, IL',
    partnershipIntent: 'long-term',
    familyAlignment: {
      hasChildren: false,
      wantsChildren: 'unsure',
      openToPartnerWithParent: 'open-inexperienced',
    },
    values: ['Learning', 'Creativity', 'Loyalty', 'Balance', 'Depth'],
    growthFocus: 'Communicating needs directly',
    relationshipVision: 'A thoughtfully designed partnership built on honest conversation, creativity, and mutual growth.',
    communicationStyle: 'Thoughtful and intentional. Enjoys discussing feelings and relationship dynamics. Collaborative problem-solver.',
    bio: 'Architect who believes good design applies to relationships too. Looking for someone to build a life with, one honest conversation at a time.',
    alignmentScore: 85,
    photoUrl: 'https://i.pravatar.cc/300?u=marcus&img=6',
  },
];

export const currentUser: User = {
  id: 'current',
  name: 'You',
  age: 32,
  city: 'Your City',
  partnershipIntent: 'marriage',
  familyAlignment: {
    hasChildren: false,
    wantsChildren: 'wants',
    openToPartnerWithParent: 'comfortable',
  },
  values: ['Growth', 'Honesty', 'Family', 'Kindness', 'Presence'],
  growthFocus: 'Building emotional safety',
};

export const calculateAlignmentScore = (user1: User, user2: User): number => {
  let score = 70; // Base score
  
  // Values alignment (up to 15 points)
  const sharedValues = user1.values.filter(v => user2.values.includes(v));
  score += Math.min(sharedValues.length * 3, 15);
  
  // Family intent alignment (up to 10 points)
  if (user1.familyAlignment.wantsChildren === user2.familyAlignment.wantsChildren) {
    score += 5;
  }
  if (user1.familyAlignment.openToPartnerWithParent === user2.familyAlignment.openToPartnerWithParent ||
      user1.familyAlignment.openToPartnerWithParent === 'comfortable' ||
      user2.familyAlignment.openToPartnerWithParent === 'comfortable') {
    score += 5;
  }
  
  // Partnership intent alignment (up to 5 points)
  if (user1.partnershipIntent === user2.partnershipIntent) {
    score += 5;
  } else if (
    (user1.partnershipIntent === 'marriage' && user2.partnershipIntent === 'life-partnership') ||
    (user1.partnershipIntent === 'life-partnership' && user2.partnershipIntent === 'marriage')
  ) {
    score += 3;
  }
  
  return Math.min(Math.round(score), 99);
};

// Add alignment scores to sample users based on current user
sampleUsers.forEach(user => {
  user.alignmentScore = calculateAlignmentScore(currentUser, user);
});

// Sort by alignment score
sampleUsers.sort((a, b) => (b.alignmentScore || 0) - (a.alignmentScore || 0));
