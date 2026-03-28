import React, { useState, useEffect } from 'react';
import { useApp } from '@/store/AppContext';
import AuthPoolTabs from '@/components/AuthPoolTabs';
import { communityIdToPoolId, persistUserPoolMembership, useCommunity } from '@/modules';
import { authService, signOutSupabaseSession } from '@/services/authService';
import { userService } from '@/services/userService';
import { pendingSignupService } from '@/services/pendingSignupService';
import { moderateProfileQuality } from '@/services/profileQualityService';
import {
  PROFILE_BIO_MIN_CHAR_COUNT,
  PROFILE_BIO_MIN_WORD_COUNT,
  PROFILE_GROWTH_FOCUS_MIN_CHAR_COUNT,
  validateGrowthFocusText,
  validateRequiredProfileBio,
} from '@/lib/profileTextValidation';
import { preloadUsPlaceIndex, validateUsCityState } from '@/lib/usLocationValidation';
import { toast } from 'sonner';
import {
  AlertCircle,
  Loader2,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import type { User, UserGenderIdentity, UserIdentityExpression } from '@/types';

const VALUES_BY_CATEGORY = {
  'Character & Integrity': ['Honesty', 'Loyalty', 'Accountability', 'Integrity'],
  'Emotional & Relational Depth': ['Compassion', 'Kindness', 'Presence', 'Depth'],
  'Stability & Security': ['Stability', 'Resilience', 'Calm', 'Trust'],
  'Growth & Self-Awareness': ['Growth', 'Authenticity', 'Clarity'],
  'Lifestyle & Energy': ['Family', 'Adventure', 'Creativity', 'Humor'],
  'Spiritual Foundation': ['Faith'],
};

const STEP_LABELS = [
  'Account',
  'Profile',
  'Photo',
  'Preferences',
  'Values',
  'Policies',
  'Membership',
];

const ROOTED_GENDER_OPTIONS: { value: UserGenderIdentity; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
];

const LGBTQ_GENDER_IDENTITY_OPTIONS: { value: UserGenderIdentity; label: string }[] = [
  { value: 'male', label: 'Man' },
  { value: 'female', label: 'Woman' },
  { value: 'non-binary', label: 'Non-binary' },
  { value: 'trans-man', label: 'Trans Man' },
  { value: 'trans-woman', label: 'Trans Woman' },
  { value: 'self-describe', label: 'Prefer to self-describe' },
  { value: 'prefer-not-to-say', label: 'Prefer not to say' },
];

const IDENTITY_EXPRESSION_OPTIONS: { value: UserIdentityExpression; label: string }[] = [
  { value: 'femme', label: 'Femme' },
  { value: 'masc', label: 'Masc' },
  { value: 'androgynous', label: 'Androgynous' },
  { value: 'stud', label: 'Stud' },
  { value: 'soft-masc', label: 'Soft masc' },
  { value: 'gender-fluid', label: 'Gender-fluid' },
  { value: 'self-describe', label: 'Prefer to self-describe' },
  { value: 'prefer-not-to-say', label: 'Prefer not to say' },
];

const OPEN_TO_DATING_OPTIONS: { value: UserGenderIdentity; label: string }[] = [
  { value: 'male', label: 'Man' },
  { value: 'female', label: 'Woman' },
  { value: 'non-binary', label: 'Non-binary' },
  { value: 'trans-man', label: 'Trans Man' },
  { value: 'trans-woman', label: 'Trans Woman' },
  { value: 'self-describe', label: 'Prefer to self-describe' },
  { value: 'prefer-not-to-say', label: 'Prefer not to say' },
];

type PolicySection = {
  heading: string;
  content: string;
  link?: { label: string; url: string };
};

type PolicyDefinition = {
  title: string;
  sections: PolicySection[];
};

const SignUpSection: React.FC = () => {
  const { setCurrentView } = useApp();
  const { activeCommunity, activeCommunityId } = useCommunity();
  const isLgbtqCommunity = activeCommunity.matchingMode === 'inclusive';

  // Step tracking
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Step 1 - Account
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Step 2 - Basic Profile
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [city, setCity] = useState('');
  const [gender, setGender] = useState<UserGenderIdentity | ''>('');
  const [genderIdentityCustom, setGenderIdentityCustom] = useState('');
  const [identityExpression, setIdentityExpression] = useState<UserIdentityExpression | ''>('');
  const [identityExpressionCustom, setIdentityExpressionCustom] = useState('');

  // Step 3 - Photos (up to 3)
  const [photos, setPhotos] = useState<string[]>(['', '', '']); // Array of 3 photo URLs (base64)

  // Step 4 - Preferences
  const [partnershipIntent, setPartnershipIntent] = useState<
    'marriage' | 'long-term' | 'life-partnership' | ''
  >('');
  const [openToDating, setOpenToDating] = useState<UserGenderIdentity[]>([]);
  const [openToDatingCustom, setOpenToDatingCustom] = useState('');
  const [hasChildren, setHasChildren] = useState<boolean | null>(null);
  const [wantsChildren, setWantsChildren] = useState<
    'wants' | 'open' | 'does-not-want' | 'unsure' | ''
  >('');
  const [openToPartnerWithParent, setOpenToPartnerWithParent] = useState<
    | 'actively-wants'
    | 'comfortable'
    | 'open-inexperienced'
    | 'prefers-child-free'
    | ''
  >('');

  // Step 5 - Values & Vision
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [growthFocus, setGrowthFocus] = useState('');
  const [bio, setBio] = useState('');
  const [communityBoundaries, setCommunityBoundaries] = useState('');

  // Step 6 - Policies
  const [acceptedPolicies, setAcceptedPolicies] = useState<Record<string, boolean>>({});
  const [viewingPolicy, setViewingPolicy] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState(-1);

  // Reset expanded section when viewing a different policy
  useEffect(() => {
    setExpandedSection(-1);
  }, [viewingPolicy]);

  // Clear errors when entering step 3 (photos)
  useEffect(() => {
    if (step === 3) {
      setErrors({});
    }
  }, [step]);

  useEffect(() => {
    if (gender !== 'self-describe') {
      setGenderIdentityCustom('');
    }
  }, [gender]);

  useEffect(() => {
    if (identityExpression !== 'self-describe') {
      setIdentityExpressionCustom('');
    }
  }, [identityExpression]);

  useEffect(() => {
    if (!openToDating.includes('self-describe')) {
      setOpenToDatingCustom('');
    }
  }, [openToDating]);

  useEffect(() => {
    if (step === 2) {
      preloadUsPlaceIndex();
    }
  }, [step]);

  useEffect(() => {
    if (isLgbtqCommunity) return;

    setOpenToDating([]);
    setOpenToDatingCustom('');
    setIdentityExpression('');
    setIdentityExpressionCustom('');
    setCommunityBoundaries('');
    if (gender !== '' && gender !== 'male' && gender !== 'female') {
      setGender('');
      setGenderIdentityCustom('');
    }
  }, [isLgbtqCommunity, gender]);

  const POLICIES: Record<string, PolicyDefinition> = {
    platformStructure: {
      title: 'Platform Structure & Placement',
      sections: [
        { heading: 'Payment Before Assessment', content: 'Rooted Hearts is not simply a dating site.\n\nIt is an ecosystem designed to prepare you for love, support you in love, and strengthen you between experiences.\n\nYour membership is not a payment for access to profiles alone. It supports:\n\n• The emotional readiness assessment\n• The Intentional Path and The Alignment Path\n• Curated environments based on alignment\n• Safety systems and background protections\n• Relationship development resources\n• Platform design built around intention, not volume\n\nWe are not built to be another swipe-based marketplace.\n\nWe are built to create emotionally stable, intentional partnerships.\n\nYou must select a membership plan and complete payment before taking the assessment. This ensures commitment to the process and helps us maintain a serious, intentional community. Membership is non-refundable once the billing period has commenced.' },
        {
          heading: 'Assessment Determines Placement',
          content: 'Why Do We Have an Assessment?\n\nRooted Hearts is built on the belief that alignment requires readiness. Strong, lasting partnerships are not built on attraction alone — they require emotional regulation, accountability, boundary awareness, and the ability to repair conflict. The assessment helps us maintain a community of individuals who are committed to intentional connection rather than casual disruption.\n\nThis is not about judgment. It is about protecting emotional safety and long-term compatibility.\n\nWhy Is the Assessment Required?\n\nThe assessment cannot be bypassed. Every member completes it to ensure:\n• Fair and equal placement standards\n• A consistent emotional baseline across the community\n• Protection for members seeking serious partnership\n\nIf the assessment were optional, the integrity of the platform would be compromised. Requiring it ensures that everyone participates under the same expectations.\n\nWhy Does It Determine Your Dating Pool?\n\nBased on your responses, you may be placed in:\n\nThe Intentional Path – A structured environment for strengthening foundational relationship skills while still connecting with others on a similar growth journey.\n\nThe Alignment Path – Full access to the broader dating pool for members who demonstrate readiness for deeper partnership engagement.\n\nPlacement is not a label. It is a developmental pathway.\n\nThis structure protects members from emotional misalignment and reduces avoidable harm within connections.\n\nWhy Is This Necessary?\n\nMany dating platforms prioritize volume over alignment. Rooted Hearts prioritizes intentionality.\n\nBy structuring placement through assessment, we:\n• Reduce emotional instability within connections\n• Encourage accountability and self-awareness\n• Create safer environments for meaningful partnership\n• Prevent avoidable patterns of resentment and misalignment\n\nOur goal is not to exclude — it is to prepare.\n\nWant to Understand Our Philosophy More Deeply?\n\nExplore the research and reasoning behind our structure on our blog where we explain our Relationship Readiness Philosophy, why emotional stability matters in dating, the difference between attraction and alignment, and how The Intentional Path supports long-term success.',
          link: { label: 'Visit Our Philosophy Blog →', url: '/blog' }
        },
        { heading: 'Our Two Connection Paths', content: 'At Rooted Hearts, we are not just matching profiles.\n\nWe are building an ecosystem designed to help you win in love.\n\nThat means meeting people who are aligned not only in attraction — but in emotional readiness, life stage, and relational capacity.\n\nFor that reason, we operate with two intentional connection paths:\n\n🌿 The Intentional Path\n\nThe Intentional Path is designed for individuals who are:\n• Strengthening emotional regulation\n• Building accountability and communication skills\n• Navigating life transitions\n• Working through past relationship patterns\n• Developing foundational relationship stability\n\nThis is not a waiting room.\n\nIt is a structured growth environment where development is supported and respected.\n\nMembers here connect with others who are also committed to becoming healthier, more self-aware partners.\n\nGrowth & Graduation\n\nAfter six months on The Intentional Path, members may retake the assessment.\n\nBy actively using the resource section and improving in areas that need development, you may graduate into The Alignment Path.\n\nThe Intentional Path is not permanent placement. It is a pathway.\n\nWe believe growth is possible when effort is applied intentionally.\n\n🔷 The Alignment Path\n\nThe Alignment Path is designed for individuals who demonstrate:\n• Emotional stability\n• Consistent accountability\n• Healthy conflict repair\n• Clear boundaries\n• Partnership readiness\n\nThis environment offers broader matchmaking access for those prepared to build a stable, long-term partnership.\n\nThe Alignment Path is about connecting with others who are ready to operate from maturity rather than reaction.\n\nWhy We Separate These Paths\n\nWe want you to feel the value in the people you communicate with.\n\nWhen individuals are at very different emotional stages, it can lead to:\n• Misalignment\n• Resentment\n• Emotional fatigue\n• Avoidable harm\n\nBy creating The Intentional Path and The Alignment Path, we:\n• Protect emotional integrity\n• Encourage readiness\n• Reduce unnecessary conflict\n• Increase the likelihood of long-term relationship success\n\nThis structure is not about ranking.\n\nIt is about honoring where you are — and providing a pathway forward.\n\nBoth paths are intentional.\nBoth are valuable.\nBoth are designed to support your journey toward healthy love.' },
        { heading: 'No Refunds Based on Placement', content: 'Rooted Hearts is intentionally structured.\n\nAssessment placement is not an afterthought — it is the foundation of how this platform operates.\n\nYour assessment determines which connection path best aligns with your current relational readiness. That structure is what protects the integrity of the community and helps ensure members are meeting others at a compatible stage.\n\nBecause placement is determined immediately upon completion of the assessment, refunds cannot be processed based on environment assignment.\n\nThis policy exists to maintain seriousness, fairness, and alignment. It ensures that individuals joining the platform understand and respect the intentional structure we have built.\n\nWe are not here to punish or exclude.\n\nWe are here to align.\n\nYour membership grants access to:\n\n• The structured assessment\n• A protected connection path\n• Path-based resources\n• Messaging and communication tools\n• A community built around intentional partnership\n\nIf you choose to cancel your membership, you may do so at any time. Cancellation will stop future billing, and access will remain active through the end of your current billing period.\n\nPlease understand that this platform was created with significant research, intention, and dedication. Our goal is not to waste your time or take your money — it is to create an ecosystem that genuinely supports healthy love.\n\nBy joining, you acknowledge and accept this structure.' },
        { heading: 'Assumptions & Platform Realities', content: 'Rooted Hearts is an intentional relationship ecosystem, not a guarantee of romantic outcome.\n\nBy joining, you acknowledge and agree to the following:\n\n1. No Guaranteed Matches\n\nWe do not guarantee:\n\n• Romantic success\n• Compatibility with specific individuals\n• Engagement levels from other members\n• Long-term relationship outcomes\n\nWe provide structure, tools, and alignment — not guarantees.\n\n2. Assessment Placement Is Structural, Not Personal\n\nAssessment results reflect readiness indicators, not worth, value, or character.\n\nPlacement into The Intentional Path or The Alignment Path is based on platform standards and does not imply superiority or deficiency.\n\n3. Personal Responsibility Still Applies\n\nWhile Rooted Hearts provides structure and safety tools:\n\n• You are responsible for your personal decisions\n• You are responsible for meeting safety precautions\n• You are responsible for how you communicate\n• You are responsible for your emotional participation\n\nThe platform does not replace personal discernment.\n\n4. Growth Requires Effort\n\nAccess to resources does not automatically create growth.\n\nThe Intentional Path is an opportunity — not a passive experience. Advancement requires intentional effort and reassessment.\n\n5. Platform Focus & Eligibility\n\nRooted Hearts is designed exclusively for adult men and women seeking opposite-sex partnerships. Rooted Hearts is currently available to residents of the United States. By continuing, you confirm you meet this eligibility requirement.\n\nAccounts misrepresenting eligibility may be removed.\n\n6. Community Integrity\n\nMembers who repeatedly violate community standards may:\n\n• Receive warnings\n• Be placed into a structured review period\n• Be removed from the platform\n\nMembership fees are not refundable due to policy violations.' },
      ]
    },
    membershipBilling: {
      title: 'Membership & Billing Terms',
      sections: [
        { heading: 'Cancellation Policy', content: 'Memberships may be canceled at any time.\n\nCancellation will:\n\n• Stop future billing\n• Remain active through the end of the current billing period\n• Access will continue until the end of the paid term\n• No partial refunds or prorated credits will be issued for unused time\n\nBy continuing, you acknowledge that cancellations take effect at the end of the billing cycle and do not result in immediate termination or refund.\n\nIf you choose to cancel, your account remains private and can be reactivated if you choose to return.' },
        { heading: 'Membership Renewal', content: 'Your membership automatically renews at the end of your billing period unless you cancel. Billing occurs on the anniversary of your original purchase date. You will receive a reminder 7 days before renewal.' },
        { heading: 'Billing Terms', content: 'By selecting a membership plan and completing payment, you authorize Rooted Hearts to charge your chosen payment method. Billing cycles are monthly, quarterly, or annual based on your selected tier. Your billing will occur on the anniversary of your original purchase date. You can view and update your billing information in your account settings at any time.' },
      ]
    },
    safetyVerification: {
      title: 'Safety & Verification Policy',
      sections: [
        { heading: 'Safety Policies', content: 'Rooted Hearts prioritizes member safety above all else. We conduct background checks (possibility of verification request) and maintain strict community standards. Reports of misconduct are reviewed and acted upon within 24-48 hours. We have a zero-tolerance policy for harassment, threats, or abusive behavior.' },
        { heading: 'Background Check Requirements', content: 'You may choose to complete a background verification through our third-party provider to enhance trust and community safety.\n\nBackground verification is optional but strongly encouraged — particularly for members seeking to build deeper connections within The Alignment Path.\n\nBackground checks may include:\n\n• Identity verification\n• Screening of publicly available criminal records\n• Sex offender registry searches\n• National and county database searches\n\nVerification results remain confidential. Only verification status (not detailed results) may be displayed on your profile.\n\nRooted Hearts reserves the right to review background information if voluntarily submitted and may restrict access if safety concerns arise.' },
        { heading: 'Meeting Safety Guidelines', content: 'Rooted Hearts is an intentional dating ecosystem — and while we structure alignment carefully, meeting someone new always carries personal responsibility.\n\nYour safety matters. If you decide to meet someone in person:\n\n• Meet in a public location\n• Arrange your own transportation\n• Inform a trusted friend or family member of your plans\n\nIf you do not have someone to share plans with:\n\n• Email yourself the date details\n• Leave yourself a voicemail with the time and location\n• Create a documented record of your meeting plans\n\nMaintaining a safety trail is a simple but powerful precaution. Rooted Hearts provides structure, screening options, and safeguards — but your awareness and discernment are equally important. Safety is a shared responsibility.' },
        { heading: 'Report Mechanism', content: 'If you experience inappropriate behavior, you can report members directly through the app. Our safety team reviews all reports and takes action as needed. Include specific details and screenshots when reporting. Reports are investigated confidentially and seriously. We take every report seriously and respond promptly.' },
        { heading: 'Moderation & Enforcement', content: 'Our moderation team monitors for violations 24/7. First violations may result in warnings. Repeated violations result in temporary suspension. Serious violations (harassment, abuse, illegal activity) result in permanent removal. Appeals can be submitted within 30 days of removal.' },
      ]
    },
    communityStandards: {
      title: 'Community Standards',
      sections: [
        { heading: 'Respectful Interaction', content: 'All members agree to treat others with respect and dignity. Harassment, discrimination, or abusive behavior will result in account suspension or removal. This includes offensive language, threats, unwanted sexual content, or targeting based on protected characteristics. We maintain a safe space for all members.' },
        { heading: 'Honest Representation', content: 'Profiles must be honest and authentic. Catfishing, fake information, or misleading photos violate community guidelines and result in removal. Use a recent photo that clearly shows your face. Do not impersonate others or create fake identities. Deception undermines community trust.' },
        { heading: 'Appropriate Content', content: 'Explicit sexual content, hate speech, violence, or illegal activity is strictly prohibited. Photos must be appropriate and show your face clearly. Do not share contact information before private messaging. Do not use the platform for commercial purposes or self-promotion.' },
        { heading: 'Conversation Standards', content: 'Engage in genuine, respectful conversations focused on building real connection. Do not spam members with generic messages. Avoid overly sexual conversations in initial interactions. Respect boundaries and read cues if someone is not interested in continuing dialogue.' },
        { heading: 'Profile Requirements', content: 'You must be at least 25 years old to create an account. Your profile information must be truthful and accurate. Duplicate accounts are not permitted. Accounts found to violate these terms will be suspended or permanently removed.' },
      ]
    },
    privacyData: {
      title: 'Privacy & Data Policy',
      sections: [
        { heading: 'Data Protection & Security', content: 'Your personal information is encrypted using industry-standard TLS security. We never sell your data to third parties. Your profile information, messages, and communications are protected with encryption. Data is stored on secure servers with regular security audits.' },
        { heading: 'Information We Collect', content: 'We collect profile information (name, age, city, photos), preference data, assessment responses, and communication history. We also collect technical data like IP address, device type, and usage patterns for service improvement. You control what information is visible to other members.' },
        { heading: 'Third-Party Services', content: 'We use third-party payment processors (Stripe) to handle billing securely. We do not share personal information with marketing partners. We use analytics services to understand user behavior and improve the platform. All third parties are bound by confidentiality agreements.' },
        { heading: 'Data Retention', content: 'Account data is retained for 12 months after account deletion for fraud prevention. You can request data deletion at any time. Communications are archived and accessible only to the parties involved. We comply with GDPR and other data protection regulations.' },
      ]
    }
  };

  const PLATFORM_CONFIRMATION = {
    heading: 'Platform Acknowledgment',
    content: activeCommunity.signupPlatformConfirmation,
  };

  // Step 6 - Payment
  const [selectedTier, setSelectedTier] = useState<
    'monthly' | 'quarterly' | 'annual' | null
  >(null);

  const validateStep = async (stepNum: number): Promise<Record<string, string>> => {
    const errs: Record<string, string> = {};
    switch (stepNum) {
      case 1:
        if (!email || !/\S+@\S+\.\S+/.test(email))
          errs.email = 'Valid email required';
        if (!password || password.length < 8)
          errs.password = 'Minimum 8 characters';
        if (password !== confirmPassword)
          errs.confirmPassword = 'Passwords do not match';
        break;
      case 2:
        if (!name.trim()) errs.name = 'Name is required';
        const ageNum = parseInt(age);
        if (!age || isNaN(ageNum) || ageNum < 25 || ageNum > 80)
          errs.age = 'Age must be between 25 and 80';
        const locationValidation = await validateUsCityState(city);
        if (!locationValidation.isValid) {
          errs.city = locationValidation.error;
        }
        if (!gender) {
          errs.gender = isLgbtqCommunity
            ? 'Please select a gender identity'
            : 'Please select gender';
        }
        if (gender === 'self-describe' && !genderIdentityCustom.trim()) {
          errs.genderIdentityCustom = 'Please self-describe your gender identity';
        }
        break;
      case 3:
        if (!photos[0]) errs.photo = 'Please upload at least one photo';
        break;
      case 4:
        if (!partnershipIntent) errs.partnershipIntent = 'Please select intent';
        if (isLgbtqCommunity && openToDating.length === 0) {
          errs.openToDating = 'Select at least one option for who you are open to dating';
        }
        if (
          isLgbtqCommunity &&
          openToDating.includes('self-describe') &&
          !openToDatingCustom.trim()
        ) {
          errs.openToDatingCustom = 'Please self-describe who you are open to dating';
        }
        if (
          isLgbtqCommunity &&
          identityExpression === 'self-describe' &&
          !identityExpressionCustom.trim()
        ) {
          errs.identityExpressionCustom = 'Please self-describe your identity expression';
        }
        if (hasChildren === null)
          errs.hasChildren = 'Please answer this question';
        if (!wantsChildren) errs.wantsChildren = 'Please make a selection';
        if (!openToPartnerWithParent)
          errs.openToPartnerWithParent = 'Please make a selection';
        break;
      case 5:
        if (selectedValues.length < 3)
          errs.values = 'Select at least 3 values';
        const growthFocusValidation = validateGrowthFocusText(growthFocus);
        if (!growthFocusValidation.isValid && growthFocusValidation.error) {
          errs.growthFocus = growthFocusValidation.error;
        }
        const bioValidation = validateRequiredProfileBio(bio);
        if (!bioValidation.isValid && bioValidation.error) {
          errs.bio = bioValidation.error;
        }
        break;
      case 6:
        const requiredPolicyKeys = [...Object.keys(POLICIES), 'platformConfirmation'];
        const allAccepted = requiredPolicyKeys.every((key) => acceptedPolicies[key] === true);
        if (!allAccepted) errs.policies = 'You must accept all policies to continue';
        break;
    }
    return errs;
  };

  const goNext = async () => {
    const validationErrors = await validateStep(step);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    setStep((prev) => (prev + 1) as typeof step);
  };

  const goBack = () => {
    setErrors({});
    setStep((prev) => (prev - 1) as typeof step);
  };

  const clearStepFiveErrors = () => {
    if (
      !errors.values &&
      !errors.growthFocus &&
      !errors.bio &&
      !errors.profileReview &&
      !errors.profileSuggestions
    ) return;
    setErrors((prev) => {
      const next = { ...prev };
      delete next.values;
      delete next.growthFocus;
      delete next.bio;
      delete next.profileReview;
      delete next.profileSuggestions;
      return next;
    });
  };

  const isDuplicateEmailError = (message: string | null | undefined) => {
    const normalized = (message || '').toLowerCase();
    return (
      normalized.includes('duplicate key value violates unique constraint') ||
      normalized.includes('users_email_key') ||
      normalized.includes('already exists') ||
      normalized.includes('already registered') ||
      normalized.includes('user_already_exists')
    );
  };

  const showDuplicateEmailError = () => {
    const message =
      'This email is already in use. If an account was blocked, it cannot be recreated with the same email.';
    setErrors({ submit: message });
    toast.error('Email already in use. Please use a different email.');
  };

  const stripInlinePhotoPayloads = (photoUrl?: string) => {
    if (!photoUrl) return photoUrl;
    const kept = photoUrl
      .split('|')
      .map((url) => url.trim())
      .filter((url) => url.length > 0 && !url.startsWith('data:'))
      .join('|');
    return kept || undefined;
  };

  const persistCurrentUserSession = (user: User): User => {
    try {
      localStorage.setItem('currentUser', JSON.stringify(user));
      return user;
    } catch (error) {
      console.warn('Primary currentUser save failed, retrying with trimmed payload:', error);
    }

    const lightweightUser: User = {
      ...user,
      photoUrl: stripInlinePhotoPayloads(user.photoUrl),
    };

    const cacheKeysToPurge = [
      'assessmentLog',
      'community-blogs',
      'growth-resources',
      'paid-growth-resources',
      'intentional-path-resources',
      'alignment-path-resources',
      'rooted-admin-data',
      'rooted-admin-users',
      'rooted-admin-reports',
      'rooted-admin-support-messages',
    ];
    cacheKeysToPurge.forEach((key) => localStorage.removeItem(key));

    localStorage.setItem('currentUser', JSON.stringify(lightweightUser));
    return lightweightUser;
  };

  const handleCompleteSignUp = async (
    tier: 'monthly' | 'quarterly' | 'annual' | null
  ) => {
    setIsLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      // Calculate billingPeriodEnd based on tier
      const now = Date.now();
      const billingPeriodEnd = tier
        ? now +
          (tier === 'monthly'
            ? 30 * 24 * 60 * 60 * 1000
            : tier === 'quarterly'
              ? 90 * 24 * 60 * 60 * 1000
              : 365 * 24 * 60 * 60 * 1000)
        : now + 30 * 24 * 60 * 60 * 1000; // Skip = simulate monthly
      const newUserId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const locationValidation = await validateUsCityState(city);
      if (!locationValidation.isValid) {
        setStep(2);
        setErrors({ city: locationValidation.error });
        toast.error(locationValidation.error);
        return;
      }
      const trimmedGrowthFocus = growthFocus.trim();
      const trimmedBio = bio.trim();
      const normalizedCommunityBoundaries =
        isLgbtqCommunity && communityBoundaries.trim()
          ? communityBoundaries.trim()
          : undefined;
      const profileStepErrors = await validateStep(5);
      if (Object.keys(profileStepErrors).length > 0) {
        setStep(5);
        setErrors(profileStepErrors);
        return;
      }

      const profileModeration = await moderateProfileQuality({
        appUserId: newUserId,
        appUserEmail: normalizedEmail,
        bio: trimmedBio,
        promptsJson: {
          relationship_intent: partnershipIntent,
          growth_focus: trimmedGrowthFocus,
          values: selectedValues,
          wants_children: wantsChildren,
          open_to_partner_with_parent: openToPartnerWithParent,
          community_boundaries: normalizedCommunityBoundaries,
        },
        userMode: 'alignment',
      });

      if (!profileModeration.approved) {
        const nextErrors: Record<string, string> = {
          profileReview:
            profileModeration.userFeedback ||
            'Your profile needs a few updates before it can go live.',
        };
        if (profileModeration.improvementNotes.length > 0) {
          nextErrors.profileSuggestions = profileModeration.improvementNotes
            .slice(0, 2)
            .join(' ');
        }
        setStep(5);
        setErrors(nextErrors);
        return;
      }

      clearStepFiveErrors();

      const { data: signUpData, error: signUpError } = await authService.signUpWithPassword(
        normalizedEmail,
        password
      );

      if (signUpError) {
        if (isDuplicateEmailError(signUpError.message)) {
          showDuplicateEmailError();
          return;
        }

        console.warn('Supabase auth sign up failed:', signUpError.message);
        setErrors({ submit: signUpError.message || 'Account creation failed. Please try again.' });
        toast.error(signUpError.message || 'Account creation failed. Please try again.');
        return;
      }

      const authUser = signUpData.user;
      if (!authUser || (Array.isArray(authUser.identities) && authUser.identities.length === 0)) {
        showDuplicateEmailError();
        return;
      }

      // Build the new User object
      const newUser: User = {
        id: authUser.id,
        email: normalizedEmail,
        name: name.trim(),
        age: parseInt(age),
        city: locationValidation.canonicalCityState,
        gender: gender as UserGenderIdentity,
        genderIdentity: gender as UserGenderIdentity,
        genderIdentityCustom: gender === 'self-describe' ? genderIdentityCustom.trim() : undefined,
        openToDating: isLgbtqCommunity ? openToDating : undefined,
        openToDatingCustom:
          isLgbtqCommunity && openToDating.includes('self-describe')
            ? openToDatingCustom.trim()
            : undefined,
        identityExpression: isLgbtqCommunity ? identityExpression || undefined : undefined,
        identityExpressionCustom:
          isLgbtqCommunity && identityExpression === 'self-describe'
            ? identityExpressionCustom.trim()
            : undefined,
        identityExpressionVisibility:
          isLgbtqCommunity && identityExpression && identityExpression !== 'prefer-not-to-say'
            ? 'after-mutual-interest'
            : undefined,
        photoUrl: photos.filter(p => p).join('|'), // Store all photos separated by |
        partnershipIntent: partnershipIntent as
          | 'marriage'
          | 'long-term'
          | 'life-partnership',
        familyAlignment: {
          hasChildren: hasChildren as boolean,
          wantsChildren: wantsChildren as
            | 'wants'
            | 'open'
            | 'does-not-want'
            | 'unsure',
          openToPartnerWithParent: openToPartnerWithParent as
            | 'actively-wants'
            | 'comfortable'
            | 'open-inexperienced'
            | 'prefers-child-free',
        },
        values: selectedValues,
        growthFocus: trimmedGrowthFocus,
        bio: trimmedBio,
        communityBoundaries: normalizedCommunityBoundaries,
        assessmentPassed: false,
        membershipTier: tier ?? 'monthly',
        membershipStatus: 'active',
        billingPeriodEnd,
        cancelAtPeriodEnd: false,
        consentTimestamp: now,
        consentVersion: 'v1.0',
        userStatus: 'active',
        backgroundCheckVerified: false,
        backgroundCheckStatus: 'pending',
        poolId: communityIdToPoolId(activeCommunityId),
        mode: 'active',
      };

      const pendingSignup = pendingSignupService.save(newUser);

      if (!signUpData.session) {
        if (pendingSignup.photoPayloadStripped) {
          console.warn('Pending signup draft was saved without inline photo payloads.');
        }
        if (!pendingSignup.stored) {
          console.warn('Pending signup draft could not be persisted locally.');
        }
        toast.success('Account created. Check your email to confirm it, then sign in to finish setup.');
        setCurrentView('user-login');
        return;
      }

      // Save to Supabase after a confirmed session exists.
      const { error: supabaseError } = await userService.createUser(newUser);
      if (supabaseError) {
        if (isDuplicateEmailError(supabaseError)) {
          pendingSignupService.clear(normalizedEmail);
          await signOutSupabaseSession();
          showDuplicateEmailError();
          return;
        }

        await signOutSupabaseSession();
        console.warn('Supabase user create failed:', supabaseError);
        setErrors({ submit: 'Account creation failed. Please try again.' });
        toast.error('Account creation failed. Please try again.');
        return;
      }

      pendingSignupService.clear(normalizedEmail);
      window.dispatchEvent(new CustomEvent('new-user', { detail: newUser }));

      // Persist to localStorage (with quota-safe fallback)
      const sessionUser = persistCurrentUserSession(newUser);
      persistUserPoolMembership(sessionUser, sessionUser.poolId ?? communityIdToPoolId(activeCommunityId));

      // Trigger AppContext to pick up the new user
      window.dispatchEvent(new CustomEvent('user-login', { detail: sessionUser }));

      // Brief delay to let state settle
      await new Promise((resolve) => setTimeout(resolve, 100));

      toast.success(`Welcome, ${sessionUser.name}! Let's start with assessment.`);

      // Route to assessment - cannot skip
      setCurrentView('assessment');
    } catch (error) {
      console.error('Failed to create account:', error);
      toast.error('Failed to create account. Please try again.');
      setErrors({ submit: 'Account creation failed' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F0C] flex items-center justify-center px-4 py-12">
      <div className="absolute inset-0 grain-overlay" />

      <div className="relative w-full max-w-lg bg-[#111611] rounded-[28px] border border-[#1A211A] shadow-2xl p-8 space-y-6">
        {/* Header */}
        <AuthPoolTabs
          locked
          lockedMessage="Pool selection is locked during signup. Close enrollment to switch spaces."
        />

        <div className="text-center space-y-1">
          <h1 className="text-2xl font-display font-bold text-[#F6FFF2]">
            {step === 1 && 'Create Your Account'}
            {step === 2 && 'Tell Us About Yourself'}
            {step === 3 && 'Upload Your Photo'}
            {step === 4 && 'Your Relationship Vision'}
            {step === 5 && 'Your Values & Growth'}
            {step === 6 && 'Community Policies'}
            {step === 7 && 'Choose Your Membership'}
          </h1>
          <p className="text-sm text-[#A9B5AA]">Step {step} of 7</p>
        </div>

        {/* Progress Bar */}
        <div className="flex gap-1.5">
          {STEP_LABELS.map((label, idx) => (
            <div key={idx} className="flex-1 flex flex-col gap-1">
              <div
                className={`h-1 rounded-full transition-all duration-300 ${
                  idx < step
                    ? 'bg-[#D9FF3D]'
                    : idx === step - 1
                      ? 'bg-[#D9FF3D]/60'
                      : 'bg-[#1A211A]'
                }`}
              />
              <span
                className={`text-[10px] font-mono text-center hidden sm:block ${
                  idx === step - 1 ? 'text-[#D9FF3D]' : 'text-[#A9B5AA]'
                }`}
              >
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Error Summary */}
        {Object.keys(errors).length > 0 && step !== 3 && (
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 space-y-2">
            {Object.entries(errors).map(([key, msg]) => (
              <div key={key} className="flex gap-2 text-sm text-red-200">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{msg}</span>
              </div>
            ))}
          </div>
        )}

        {/* Step 1 - Account */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-[#F6FFF2] block mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full px-4 py-2 bg-[#0B0F0C] border border-[#1A211A] rounded-lg text-[#F6FFF2] placeholder-[#A9B5AA] focus:border-[#D9FF3D] focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[#F6FFF2] block mb-2">
                Password (8+ characters)
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2 bg-[#0B0F0C] border border-[#1A211A] rounded-lg text-[#F6FFF2] placeholder-[#A9B5AA] focus:border-[#D9FF3D] focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[#F6FFF2] block mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2 bg-[#0B0F0C] border border-[#1A211A] rounded-lg text-[#F6FFF2] placeholder-[#A9B5AA] focus:border-[#D9FF3D] focus:outline-none transition-colors"
              />
            </div>
          </div>
        )}

        {/* Step 2 - Basic Profile */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-[#F6FFF2] block mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="w-full px-4 py-2 bg-[#0B0F0C] border border-[#1A211A] rounded-lg text-[#F6FFF2] placeholder-[#A9B5AA] focus:border-[#D9FF3D] focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[#F6FFF2] block mb-2">
                Age (25-80)
              </label>
              <input
                type="number"
                min="25"
                max="80"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="30"
                className="w-full px-4 py-2 bg-[#0B0F0C] border border-[#1A211A] rounded-lg text-[#F6FFF2] placeholder-[#A9B5AA] focus:border-[#D9FF3D] focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[#F6FFF2] block mb-2">
                City and State
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Atlanta, GA or Atlanta, Georgia"
                className="w-full px-4 py-2 bg-[#0B0F0C] border border-[#1A211A] rounded-lg text-[#F6FFF2] placeholder-[#A9B5AA] focus:border-[#D9FF3D] focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[#F6FFF2] block mb-2">
                {isLgbtqCommunity ? 'Gender Identity' : 'Gender'}
              </label>
              <p className="text-xs italic text-[#A9B5AA] mb-3">
                {activeCommunity.signupGenderGuidance}
              </p>
              <div className={`grid gap-3 ${isLgbtqCommunity ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-2'}`}>
                {(isLgbtqCommunity ? LGBTQ_GENDER_IDENTITY_OPTIONS : ROOTED_GENDER_OPTIONS).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setGender(option.value)}
                    className={`py-3 rounded-xl border font-medium transition-all ${
                      gender === option.value
                        ? 'border-[#D9FF3D] bg-[#D9FF3D]/10 text-[#D9FF3D]'
                        : 'border-[#1A211A] text-[#A9B5AA] hover:border-[#D9FF3D]/50'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {gender === 'self-describe' && (
                <input
                  type="text"
                  value={genderIdentityCustom}
                  onChange={(e) => setGenderIdentityCustom(e.target.value)}
                  placeholder="Share your gender identity"
                  className="mt-3 w-full px-4 py-2 bg-[#0B0F0C] border border-[#1A211A] rounded-lg text-[#F6FFF2] placeholder-[#A9B5AA] focus:border-[#D9FF3D] focus:outline-none transition-colors"
                />
              )}
            </div>

          </div>
        )}

        {/* Step 3 - Photos */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium text-[#F6FFF2] block mb-2">
                Profile Photos
              </label>
              <p className="text-xs italic text-[#A9B5AA] mb-4">
                At least 1 photo required. You can add up to 3 photos.
              </p>

              <div className="grid grid-cols-3 gap-3">
                {photos.map((photoUrl, idx) => (
                  <div key={idx} className="flex flex-col gap-2">
                    {photoUrl && (
                      <div className="relative w-full aspect-square rounded-xl overflow-hidden border border-[#D9FF3D]">
                        <img
                          src={photoUrl}
                          alt={`Photo ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          onClick={() => {
                            const newPhotos = [...photos];
                            newPhotos[idx] = '';
                            setPhotos(newPhotos);
                          }}
                          className="absolute top-1 right-1 bg-red-500/80 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/gif"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 5 * 1024 * 1024) {
                            setErrors({ ...errors, photo: 'File size must be under 5MB' });
                            return;
                          }
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            const newPhotos = [...photos];
                            newPhotos[idx] = reader.result as string;
                            setPhotos(newPhotos);
                            setErrors({ ...errors, photo: '' });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="hidden"
                      id={`photo-input-${idx}`}
                    />
                    <label
                      htmlFor={`photo-input-${idx}`}
                      className={`px-3 py-2 rounded-lg border-2 cursor-pointer transition-colors text-center font-medium text-xs ${
                        photoUrl
                          ? 'border-[#D9FF3D] bg-[#D9FF3D]/10 text-[#D9FF3D] hover:bg-[#D9FF3D]/20'
                          : idx === 0
                            ? 'border-[#D9FF3D] bg-[#D9FF3D]/10 text-[#D9FF3D] hover:bg-[#D9FF3D]/20'
                            : 'border-[#1A211A] text-[#A9B5AA] hover:border-[#D9FF3D]/50'
                      }`}
                    >
                      {photoUrl ? '✓' : idx === 0 ? '+ Required' : '+ Optional'}
                    </label>
                  </div>
                ))}
              </div>

              {errors.photo && (
                <p className="text-sm text-red-400 flex items-center gap-2 mt-3">
                  <AlertCircle size={16} />
                  {errors.photo}
                </p>
              )}

              <p className="text-xs text-[#A9B5AA] mt-3">
                PNG, JPG, or GIF up to 5MB each
              </p>
            </div>
          </div>
        )}

        {/* Step 4 - Preferences */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium text-[#F6FFF2] block mb-3">
                Partnership Intent
              </label>
              <div className="space-y-2">
                {[
                  { value: 'marriage', label: 'Marriage' },
                  { value: 'long-term', label: 'Long-term committed partnership' },
                  { value: 'life-partnership', label: 'Life partnership without legal marriage' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() =>
                      setPartnershipIntent(
                        opt.value as 'marriage' | 'long-term' | 'life-partnership'
                      )
                    }
                    className={`w-full py-2 px-3 rounded-lg border text-sm text-left transition-all ${
                      partnershipIntent === opt.value
                        ? 'border-[#D9FF3D] bg-[#D9FF3D]/10 text-[#D9FF3D]'
                        : 'border-[#1A211A] text-[#A9B5AA] hover:border-[#D9FF3D]/50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {isLgbtqCommunity && (
              <div>
                <label className="text-sm font-medium text-[#F6FFF2] block mb-2">
                  Who are you open to dating?
                </label>
                <p className="text-xs italic text-[#A9B5AA] mb-3">
                  Select all that apply.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {OPEN_TO_DATING_OPTIONS.map((option) => {
                    const isSelected = openToDating.includes(option.value);
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setOpenToDating((previous) => (
                            previous.includes(option.value)
                              ? previous.filter((value) => value !== option.value)
                              : [...previous, option.value]
                          ));
                        }}
                        className={`py-3 rounded-xl border font-medium transition-all ${
                          isSelected
                            ? 'border-[#D9FF3D] bg-[#D9FF3D]/10 text-[#D9FF3D]'
                            : 'border-[#1A211A] text-[#A9B5AA] hover:border-[#D9FF3D]/50'
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
                {openToDating.includes('self-describe') && (
                  <input
                    type="text"
                    value={openToDatingCustom}
                    onChange={(e) => setOpenToDatingCustom(e.target.value)}
                    placeholder="Share who you're open to dating"
                    className="mt-3 w-full px-4 py-2 bg-[#0B0F0C] border border-[#1A211A] rounded-lg text-[#F6FFF2] placeholder-[#A9B5AA] focus:border-[#D9FF3D] focus:outline-none transition-colors"
                  />
                )}
              </div>
            )}

            {isLgbtqCommunity && (
              <div>
                <label className="text-sm font-medium text-[#F6FFF2] block mb-2">
                  Identity expression (optional)
                </label>
                <p className="text-xs italic text-[#A9B5AA] mb-2">
                  If you'd like, share how you present. You'll control when this becomes visible - like photos.
                </p>
                <p className="text-xs text-[#A9B5AA] mb-3">
                  Default visibility: after mutual interest.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {IDENTITY_EXPRESSION_OPTIONS.map((option) => {
                    const isSelected = identityExpression === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setIdentityExpression(isSelected ? '' : option.value)}
                        className={`py-3 rounded-xl border font-medium transition-all ${
                          isSelected
                            ? 'border-[#D9FF3D] bg-[#D9FF3D]/10 text-[#D9FF3D]'
                            : 'border-[#1A211A] text-[#A9B5AA] hover:border-[#D9FF3D]/50'
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
                {identityExpression === 'self-describe' && (
                  <input
                    type="text"
                    value={identityExpressionCustom}
                    onChange={(e) => setIdentityExpressionCustom(e.target.value)}
                    placeholder="Share your identity expression"
                    className="mt-3 w-full px-4 py-2 bg-[#0B0F0C] border border-[#1A211A] rounded-lg text-[#F6FFF2] placeholder-[#A9B5AA] focus:border-[#D9FF3D] focus:outline-none transition-colors"
                  />
                )}
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-[#F6FFF2] block mb-3">
                Do you have children?
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: true, label: 'Yes' },
                  { value: false, label: 'No' },
                ].map((opt) => (
                  <button
                    key={String(opt.value)}
                    onClick={() => setHasChildren(opt.value)}
                    className={`py-2 rounded-lg border font-medium transition-all ${
                      hasChildren === opt.value
                        ? 'border-[#D9FF3D] bg-[#D9FF3D]/10 text-[#D9FF3D]'
                        : 'border-[#1A211A] text-[#A9B5AA] hover:border-[#D9FF3D]/50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-[#F6FFF2] block mb-3">
                Do you want children?
              </label>
              <div className="space-y-2">
                {[
                  { value: 'wants', label: 'Definitely want' },
                  { value: 'open', label: 'Open if aligned with the right partner' },
                  { value: 'does-not-want', label: 'Do not want' },
                  { value: 'unsure', label: 'Still deciding' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() =>
                      setWantsChildren(
                        opt.value as
                          | 'wants'
                          | 'open'
                          | 'does-not-want'
                          | 'unsure'
                      )
                    }
                    className={`w-full py-2 px-3 rounded-lg border text-sm text-left transition-all ${
                      wantsChildren === opt.value
                        ? 'border-[#D9FF3D] bg-[#D9FF3D]/10 text-[#D9FF3D]'
                        : 'border-[#1A211A] text-[#A9B5AA] hover:border-[#D9FF3D]/50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-[#F6FFF2] block mb-3">
                Open to partner with children?
              </label>
              <div className="space-y-2">
                {[
                  { value: 'actively-wants', label: 'Yes, absolutely' },
                  { value: 'comfortable', label: 'Yes, depending on the situation' },
                  { value: 'open-inexperienced', label: 'Prefer not' },
                  { value: 'prefers-child-free', label: 'No' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() =>
                      setOpenToPartnerWithParent(
                        opt.value as
                          | 'actively-wants'
                          | 'comfortable'
                          | 'open-inexperienced'
                          | 'prefers-child-free'
                      )
                    }
                    className={`w-full py-2 px-3 rounded-lg border text-sm text-left transition-all ${
                      openToPartnerWithParent === opt.value
                        ? 'border-[#D9FF3D] bg-[#D9FF3D]/10 text-[#D9FF3D]'
                        : 'border-[#1A211A] text-[#A9B5AA] hover:border-[#D9FF3D]/50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 5 - Values & Vision */}
        {step === 5 && (
          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium text-[#F6FFF2] block mb-3">
                Your Core Values ({selectedValues.length} / 7)
              </label>
              <div className="space-y-4">
                {Object.entries(VALUES_BY_CATEGORY).map(([category, values]) => (
                  <div key={category}>
                    <h4 className="text-xs font-mono text-[#A9B5AA] mb-2 uppercase tracking-wide">
                      {category}
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      {values.map((value) => (
                        <button
                          key={value}
                          onClick={() => {
                            if (selectedValues.includes(value)) {
                              setSelectedValues(
                                selectedValues.filter((v) => v !== value)
                              );
                            } else if (selectedValues.length < 7) {
                              setSelectedValues([...selectedValues, value]);
                            }
                            clearStepFiveErrors();
                          }}
                          className={`py-2 px-3 rounded-lg border text-xs text-center transition-all ${
                            selectedValues.includes(value)
                              ? 'border-[#D9FF3D] bg-[#D9FF3D]/10 text-[#D9FF3D]'
                              : 'border-[#1A211A] text-[#A9B5AA] hover:border-[#D9FF3D]/50'
                          }`}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-[#F6FFF2] block mb-2">
                Growth Focus
              </label>
              <input
                type="text"
                value={growthFocus}
                onChange={(e) => {
                  setGrowthFocus(e.target.value);
                  clearStepFiveErrors();
                }}
                placeholder="e.g. Building emotional resilience"
                minLength={PROFILE_GROWTH_FOCUS_MIN_CHAR_COUNT}
                className={`w-full px-4 py-2 bg-[#0B0F0C] border rounded-lg text-[#F6FFF2] placeholder-[#A9B5AA] focus:border-[#D9FF3D] focus:outline-none transition-colors ${
                  errors.growthFocus ? 'border-red-500/50' : 'border-[#1A211A]'
                }`}
              />
              <p className="text-xs text-[#A9B5AA] mt-1">
                Use a short real phrase, not random letters.
              </p>
              {errors.growthFocus && (
                <p className="text-xs text-red-300 mt-2">{errors.growthFocus}</p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-[#F6FFF2] block mb-2">
                About You
              </label>
              <textarea
                value={bio}
                onChange={(e) => {
                  setBio(e.target.value);
                  clearStepFiveErrors();
                }}
                placeholder="Share a few real details about who you are and what kind of relationship you're looking for."
                rows={4}
                minLength={PROFILE_BIO_MIN_CHAR_COUNT}
                maxLength={500}
                className={`w-full px-4 py-2 bg-[#0B0F0C] border rounded-lg text-[#F6FFF2] placeholder-[#A9B5AA] focus:border-[#D9FF3D] focus:outline-none transition-colors resize-none ${
                  errors.bio ? 'border-red-500/50' : 'border-[#1A211A]'
                }`}
              />
              <p className="text-xs text-[#A9B5AA] mt-1">
                Required. Use real words and aim for at least {PROFILE_BIO_MIN_WORD_COUNT} words.
              </p>
              {errors.bio && (
                <p className="text-xs text-red-300 mt-2">{errors.bio}</p>
              )}
              <p className="text-xs text-[#A9B5AA] mt-1">
                {bio.length} / 500
              </p>
            </div>

            {isLgbtqCommunity && (
              <div>
                <label className="text-sm font-medium text-[#F6FFF2] block mb-2">
                  Community boundaries (optional)
                </label>
                <p className="text-xs italic text-[#A9B5AA] mb-2">
                  Share anything that helps you feel safe and respected in connection.
                </p>
                <textarea
                  value={communityBoundaries}
                  onChange={(e) => {
                    setCommunityBoundaries(e.target.value);
                    clearStepFiveErrors();
                  }}
                  placeholder={'e.g., "No fetishizing," "Respect pronouns," "Serious dating only," "No secrecy."'}
                  rows={3}
                  className="w-full px-4 py-2 bg-[#0B0F0C] border border-[#1A211A] rounded-lg text-[#F6FFF2] placeholder-[#A9B5AA] focus:border-[#D9FF3D] focus:outline-none transition-colors resize-none"
                />
              </div>
            )}
          </div>
        )}

        {/* Step 6 - Policies */}
        {step === 6 && !viewingPolicy && (
          <div className="space-y-4">
            <label className="text-sm font-medium text-[#F6FFF2] block mb-3">
              Review & Accept Policies
            </label>
            <div className="space-y-3">
              {Object.entries(POLICIES).map(([key, policy]: any) => (
                <div key={key} className="flex items-start gap-3 p-4 border border-[#1A211A] rounded-lg hover:border-[#D9FF3D]/50 transition-all">
                  <input
                    type="checkbox"
                    checked={acceptedPolicies[key] || false}
                    onChange={(e) => {
                      setAcceptedPolicies(prev => ({
                        ...prev,
                        [key]: e.target.checked
                      }));
                    }}
                    className="mt-1 w-4 h-4 rounded border-[#1A211A] bg-[#0B0F0C]"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-[#F6FFF2]">{policy.title}</span>
                    <p className="text-xs text-[#A9B5AA] mt-1">{policy.sections?.length || 0} sections to review</p>
                  </div>
                  <button
                    onClick={() => setViewingPolicy(key)}
                    className="text-xs text-[#D9FF3D] hover:underline whitespace-nowrap ml-2"
                  >
                    View Details
                  </button>
                </div>
              ))}
            </div>

            {/* Platform Confirmation */}
            <div className="mt-6 p-4 border border-[#1A211A] rounded-lg bg-[#111611]">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptedPolicies['platformConfirmation'] || false}
                  onChange={(e) => {
                    setAcceptedPolicies(prev => ({
                      ...prev,
                      platformConfirmation: e.target.checked
                    }));
                  }}
                  className="mt-1 w-4 h-4 rounded border-[#1A211A] bg-[#0B0F0C]"
                />
                <span className="text-sm text-[#A9B5AA]">{PLATFORM_CONFIRMATION.content}</span>
              </label>
            </div>

            <p className="text-xs text-[#A9B5AA] mt-4">
              Click "View Details" on each policy to explore the full terms before accepting.
            </p>
          </div>
        )}

        {/* Policy Detail View */}
        {step === 6 && viewingPolicy && (() => {
          const policy = (POLICIES as Record<string, any>)[viewingPolicy];

          if (!policy?.title) return null;

          return (
            <div className="space-y-4 max-h-[600px] overflow-y-auto" id="policy-detail">
              <button
                onClick={() => setViewingPolicy(null)}
                className="text-sm text-[#A9B5AA] hover:text-[#D9FF3D] mb-4"
              >
                ← Back to policies
              </button>
              <h3 className="text-lg font-display text-[#F6FFF2]">
                {policy.title}
              </h3>

              {/* Sections */}
              <div className="space-y-2">
                {policy.sections && policy.sections.map((section: any, idx: number) => (
                  <div key={idx} className="border border-[#1A211A] rounded-lg overflow-hidden">
                    <button
                      onClick={() => setExpandedSection(expandedSection === idx ? -1 : idx)}
                      className="w-full text-left p-3 hover:bg-[#111611] transition-colors flex items-center justify-between"
                    >
                      <span className="text-sm font-medium text-[#F6FFF2]">{section.heading}</span>
                      <span className="text-[#A9B5AA]">{expandedSection === idx ? '−' : '+'}</span>
                    </button>
                    {expandedSection === idx && (
                      <div className="p-3 border-t border-[#1A211A] bg-[#0B0F0C]">
                        <div className="text-xs text-[#A9B5AA] leading-relaxed whitespace-pre-wrap mb-3">
                          {section.content}
                        </div>
                        {section.link && (
                          <a
                            href={section.link.url}
                            className="text-xs text-[#D9FF3D] hover:underline inline-block"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {section.link.label}
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-[#1A211A] space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptedPolicies[viewingPolicy] || false}
                    onChange={(e) => {
                      setAcceptedPolicies(prev => ({
                        ...prev,
                        [viewingPolicy]: e.target.checked
                      }));
                    }}
                    className="mt-1 w-4 h-4 rounded border-[#1A211A] bg-[#0B0F0C]"
                  />
                  <span className="text-sm text-[#A9B5AA]">I agree to this policy</span>
                </label>
                <button
                  onClick={() => setViewingPolicy(null)}
                  className="w-full btn-primary"
                >
                  Done
                </button>
              </div>
            </div>
          );
        })()}

        {/* Step 7 - Membership */}
        {step === 7 && (
          <div className="space-y-4">
            <div className="space-y-3">
              {[
                { id: 'monthly', name: 'Monthly', price: '$29', period: '/month' },
                { id: 'quarterly', name: 'Quarterly', price: '$69', period: '/quarter', badge: 'Save 20%' },
                { id: 'annual', name: 'Annual', price: '$199', period: '/year', badge: 'Best value' },
              ].map((tier: any) => (
                <button
                  key={tier.id}
                  onClick={() =>
                    setSelectedTier(tier.id as 'monthly' | 'quarterly' | 'annual')
                  }
                  className={`w-full p-4 rounded-lg border transition-all text-left ${
                    selectedTier === tier.id
                      ? 'border-[#D9FF3D] bg-[#D9FF3D]/10'
                      : 'border-[#1A211A] hover:border-[#D9FF3D]/50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <span className="font-medium text-[#F6FFF2]">
                      {tier.name}
                    </span>
                    {tier.badge && (
                      <span className="text-xs bg-[#D9FF3D]/20 text-[#D9FF3D] px-2 py-1 rounded">
                        {tier.badge}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-[#A9B5AA]">
                    {tier.price}
                    <span className="text-xs">{tier.period}</span>
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={() => handleCompleteSignUp(selectedTier || 'monthly')}
              disabled={isLoading}
              className="w-full mt-4 py-3 bg-[#D9FF3D] text-[#0B0F0C] rounded-full font-medium hover:scale-105 disabled:opacity-50 transition-transform flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  Complete Sign Up
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>

            <button
              onClick={() => handleCompleteSignUp('monthly')}
              disabled={isLoading}
              className="w-full py-3 text-sm text-[#D9FF3D] border border-[#D9FF3D] rounded-full hover:bg-[#D9FF3D]/10 transition-colors disabled:opacity-50 font-medium"
            >
              Skip for testing (use monthly plan)
            </button>
          </div>
        )}

        {/* Navigation Buttons */}
        {step < 7 && (
          <div className="flex gap-3 pt-2">
            {step > 1 && (
              <button
                onClick={goBack}
                className="flex-1 py-3 border border-[#1A211A] text-[#A9B5AA] rounded-full hover:border-[#D9FF3D] hover:text-[#D9FF3D] transition-colors flex items-center justify-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </button>
            )}
            <button
              onClick={goNext}
              disabled={isLoading}
              className="flex-1 py-3 bg-[#D9FF3D] text-[#0B0F0C] rounded-full font-medium hover:scale-105 disabled:opacity-50 transition-transform flex items-center justify-center gap-2"
            >
              Continue
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Sign in link */}
        {step === 1 && (
          <p className="text-center text-sm text-[#A9B5AA]">
            Already have an account?{' '}
            <button
              onClick={() => setCurrentView('user-login')}
              className="text-[#D9FF3D] hover:underline font-medium"
            >
              Sign in
            </button>
          </p>
        )}
      </div>
    </div>
  );
};

export default SignUpSection;


