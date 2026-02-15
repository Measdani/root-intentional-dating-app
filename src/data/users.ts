import type { User } from '@/types';

export const sampleUsers: User[] = [
  {
    id: 'u1',
    name: 'Maya',
    age: 31,
    city: 'Portland, OR',
    gender: 'female',
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
    membershipTier: 'monthly',
    email: 'maya@example.com',
  },
  {
    id: 'u2',
    name: 'James',
    age: 34,
    city: 'Denver, CO',
    gender: 'male',
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
    membershipTier: 'monthly',
    email: 'james@example.com',
  },
  {
    id: 'u3',
    name: 'Sofia',
    age: 29,
    city: 'Austin, TX',
    gender: 'female',
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
    membershipTier: 'quarterly',
    email: 'sofia@example.com',
  },
  {
    id: 'u4',
    name: 'David',
    age: 37,
    city: 'Seattle, WA',
    gender: 'male',
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
    membershipTier: 'quarterly',
    email: 'david@example.com',
  },
  {
    id: 'u5',
    name: 'Rachel',
    age: 33,
    city: 'Minneapolis, MN',
    gender: 'female',
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
    membershipTier: 'quarterly',
    email: 'rachel@example.com',
  },
  {
    id: 'u6',
    name: 'Marcus',
    age: 30,
    city: 'Chicago, IL',
    gender: 'male',
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
    membershipTier: 'annual',
    email: 'marcus@example.com',
  },
  {
    id: 'u7',
    name: 'Alex',
    age: 32,
    city: 'San Francisco, CA',
    gender: 'male',
    partnershipIntent: 'marriage',
    familyAlignment: {
      hasChildren: false,
      wantsChildren: 'wants',
      openToPartnerWithParent: 'comfortable',
    },
    values: ['Honesty', 'Growth', 'Kindness', 'Depth', 'Adventure'],
    growthFocus: 'Building meaningful connections',
    relationshipVision: 'A partnership rooted in mutual respect, emotional honesty, and shared growth.',
    communicationStyle: 'Open and direct. Values deep conversations. Patient listener who processes emotions thoughtfully.',
    bio: 'Software engineer with a passion for building things that matter. Looking for someone ready for real connection and growth.',
    alignmentScore: 91,
    photoUrl: 'https://i.pravatar.cc/300?u=alex&img=7',
    membershipTier: 'annual',
    email: 'alex@example.com',
    // For testing: suspended for 6 months from now
    userStatus: 'suspended',
    suspensionEndDate: Date.now() + (6 * 30 * 24 * 60 * 60 * 1000), // 6 months from now
  },
  // TEST ACCOUNTS
  {
    id: 'u_admin',
    name: 'Admin User',
    age: 35,
    city: 'Remote',
    gender: 'male',
    partnershipIntent: 'marriage',
    familyAlignment: {
      hasChildren: false,
      wantsChildren: 'wants',
      openToPartnerWithParent: 'comfortable',
    },
    values: ['Integrity', 'Growth', 'Service', 'Clarity', 'Trust'],
    growthFocus: 'Platform leadership and user support',
    relationshipVision: 'Supporting meaningful connections for others.',
    communicationStyle: 'Clear, organized, and solution-focused.',
    bio: 'Platform admin. Here to support and verify the system.',
    alignmentScore: 85,
    photoUrl: 'https://i.pravatar.cc/300?u=admin&img=8',
    membershipTier: 'annual',
    email: 'admin@therealestreset.com',
    isAdmin: true,
    userStatus: 'active',
  },
  {
    id: 'u_testmale',
    name: 'Jordan Mitchell',
    age: 28,
    city: 'Boston, MA',
    gender: 'male',
    partnershipIntent: 'marriage',
    familyAlignment: {
      hasChildren: false,
      wantsChildren: 'wants',
      openToPartnerWithParent: 'comfortable',
    },
    values: ['Authenticity', 'Growth', 'Kindness', 'Adventure', 'Commitment'],
    growthFocus: 'Emotional openness and vulnerability',
    relationshipVision: 'Building a partnership based on genuine understanding, shared values, and intentional growth together.',
    communicationStyle: 'Thoughtful and collaborative. Values open dialogue and working through challenges together.',
    bio: 'Creative professional with a passion for meaningful connections. I believe in doing the inner work to show up as my best self. Looking for someone ready to build something real.',
    alignmentScore: 88,
    photoUrl: 'https://i.pravatar.cc/300?u=jordan&img=9',
    membershipTier: 'quarterly',
    email: 'jordan.mitchell@example.com',
    userStatus: 'active',
  },
  {
    id: 'u_testfemale',
    name: 'Emma Richardson',
    age: 26,
    city: 'Los Angeles, CA',
    gender: 'female',
    partnershipIntent: 'marriage',
    familyAlignment: {
      hasChildren: false,
      wantsChildren: 'wants',
      openToPartnerWithParent: 'open-inexperienced',
    },
    values: ['Honesty', 'Growth', 'Family', 'Joy', 'Depth'],
    growthFocus: 'Healthy boundaries and secure attachment',
    relationshipVision: 'A marriage built on trust, mutual respect, and the commitment to grow together through all of life\'s seasons.',
    communicationStyle: 'Direct and warm. Values vulnerability and authentic expression. Comfortable discussing emotions and relationship needs.',
    bio: 'Marketing professional who believes relationships are worth the investment. I\'m looking for someone intentional about creating a lasting partnership rooted in honesty and shared purpose.',
    alignmentScore: 90,
    photoUrl: 'https://i.pravatar.cc/300?u=emma&img=10',
    membershipTier: 'monthly',
    email: 'emma.richardson@example.com',
    userStatus: 'active',
  },
  {
    id: 'u_growth',
    name: 'Casey Thompson',
    age: 31,
    city: 'Nashville, TN',
    gender: 'female',
    partnershipIntent: 'long-term',
    familyAlignment: {
      hasChildren: false,
      wantsChildren: 'unsure',
      openToPartnerWithParent: 'open-inexperienced',
    },
    values: ['Learning', 'Authenticity', 'Kindness', 'Balance', 'Growth'],
    growthFocus: 'Understanding relationship patterns and healing',
    relationshipVision: 'A supportive partnership with someone who values personal growth and self-awareness.',
    communicationStyle: 'Still developing healthy communication patterns. Values patience and gentle guidance.',
    bio: 'Creative individual working through personal growth. New to intentional dating and committed to doing the inner work to build healthy relationships.',
    alignmentScore: 72,
    photoUrl: 'https://i.pravatar.cc/300?u=casey&img=11',
    membershipTier: 'monthly',
    email: 'casey.thompson@example.com',
    userStatus: 'needs-growth',
  },
];

// Current user selection for testing - use user ID instead of index since array gets sorted
// Change 'u1' to 'u7' to test as Alex instead of Maya
const CURRENT_USER_ID = 'u1'; // 'u1' = Maya, 'u7' = Alex
export const currentUser: User = sampleUsers.find(u => u.id === CURRENT_USER_ID) || sampleUsers[0];

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
