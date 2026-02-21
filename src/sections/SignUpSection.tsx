import React, { useState } from 'react';
import { useApp } from '@/store/AppContext';
import { userService } from '@/services/userService';
import { toast } from 'sonner';
import {
  AlertCircle,
  Loader2,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import type { User } from '@/types';

const VALUES_BY_CATEGORY = {
  'Character & Integrity': ['Honesty', 'Loyalty', 'Accountability', 'Integrity'],
  'Emotional & Relational Depth': ['Compassion', 'Kindness', 'Presence', 'Depth'],
  'Stability & Security': ['Stability', 'Resilience', 'Calm', 'Trust'],
  'Growth & Self-Awareness': ['Growth', 'Authenticity', 'Clarity'],
  'Lifestyle & Energy': ['Family', 'Adventure', 'Creativity', 'Humor'],
  'Spiritual Foundation': ['Faith'],
};

const PRESET_VALUES = Object.values(VALUES_BY_CATEGORY).flat();

const STEP_LABELS = [
  'Account',
  'Profile',
  'Preferences',
  'Values',
  'Policies',
  'Membership',
];

const SignUpSection: React.FC = () => {
  const { setCurrentView } = useApp();

  // Step tracking
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
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
  const [gender, setGender] = useState<'male' | 'female' | ''>('');

  // Step 3 - Preferences
  const [partnershipIntent, setPartnershipIntent] = useState<
    'marriage' | 'long-term' | 'life-partnership' | ''
  >('');
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

  // Step 4 - Values & Vision
  const [selectedValues, setSelectedValues] = useState<string[]>([]);
  const [growthFocus, setGrowthFocus] = useState('');
  const [bio, setBio] = useState('');

  // Step 5 - Policies
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [acceptedGuidelines, setAcceptedGuidelines] = useState(false);

  // Step 6 - Payment
  const [selectedTier, setSelectedTier] = useState<
    'monthly' | 'quarterly' | 'annual' | null
  >(null);

  const validateStep = (stepNum: number): Record<string, string> => {
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
        if (!city.trim()) errs.city = 'City is required';
        if (!gender) errs.gender = 'Please select gender';
        break;
      case 3:
        if (!partnershipIntent) errs.partnershipIntent = 'Please select intent';
        if (hasChildren === null)
          errs.hasChildren = 'Please answer this question';
        if (!wantsChildren) errs.wantsChildren = 'Please make a selection';
        if (!openToPartnerWithParent)
          errs.openToPartnerWithParent = 'Please make a selection';
        break;
      case 4:
        if (selectedValues.length < 3)
          errs.values = 'Select at least 3 values';
        if (!growthFocus.trim()) errs.growthFocus = 'Growth focus is required';
        break;
      case 5:
        if (!acceptedTerms) errs.terms = 'You must accept Terms of Service';
        if (!acceptedPrivacy) errs.privacy = 'You must accept Privacy Policy';
        if (!acceptedGuidelines)
          errs.guidelines = 'You must accept Community Guidelines';
        break;
    }
    return errs;
  };

  const goNext = () => {
    const validationErrors = validateStep(step);
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

  const handleCompleteSignUp = async (
    tier: 'monthly' | 'quarterly' | 'annual' | null
  ) => {
    setIsLoading(true);

    try {
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

      // Build the new User object
      const newUser: User = {
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        email,
        name: name.trim(),
        age: parseInt(age),
        city: city.trim(),
        gender: gender as 'male' | 'female',
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
        growthFocus: growthFocus.trim(),
        bio: bio.trim() || undefined,
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
      };

      // Save to Supabase
      const { error: supabaseError } = await userService.createUser(newUser);
      if (supabaseError) {
        console.warn('User saved to Supabase with warning:', supabaseError);
        // Continue anyway - localStorage will work as fallback
      }

      // Persist to localStorage
      localStorage.setItem('currentUser', JSON.stringify(newUser));

      // Trigger AppContext to pick up the new user
      window.dispatchEvent(new CustomEvent('user-login', { detail: newUser }));

      // Notify admin context of new user
      window.dispatchEvent(new CustomEvent('new-user', { detail: newUser }));

      // Brief delay to let state settle
      await new Promise((resolve) => setTimeout(resolve, 100));

      toast.success(`Welcome, ${newUser.name}! Let's start with assessment.`);

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
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-display font-bold text-[#F6FFF2]">
            {step === 1 && 'Create Your Account'}
            {step === 2 && 'Tell Us About Yourself'}
            {step === 3 && 'Your Relationship Vision'}
            {step === 4 && 'Your Values & Growth'}
            {step === 5 && 'Community Policies'}
            {step === 6 && 'Choose Your Membership'}
          </h1>
          <p className="text-sm text-[#A9B5AA]">Step {step} of 6</p>
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
        {Object.keys(errors).length > 0 && (
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
                City
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Portland, OR"
                className="w-full px-4 py-2 bg-[#0B0F0C] border border-[#1A211A] rounded-lg text-[#F6FFF2] placeholder-[#A9B5AA] focus:border-[#D9FF3D] focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-[#F6FFF2] block mb-3">
                Gender
              </label>
              <div className="grid grid-cols-2 gap-3">
                {(['male', 'female'] as const).map((g) => (
                  <button
                    key={g}
                    onClick={() => setGender(g)}
                    className={`py-3 rounded-xl border capitalize font-medium transition-all ${
                      gender === g
                        ? 'border-[#D9FF3D] bg-[#D9FF3D]/10 text-[#D9FF3D]'
                        : 'border-[#1A211A] text-[#A9B5AA] hover:border-[#D9FF3D]/50'
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 3 - Preferences */}
        {step === 3 && (
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

        {/* Step 4 - Values & Vision */}
        {step === 4 && (
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
                onChange={(e) => setGrowthFocus(e.target.value)}
                placeholder="e.g. Building emotional resilience"
                className="w-full px-4 py-2 bg-[#0B0F0C] border border-[#1A211A] rounded-lg text-[#F6FFF2] placeholder-[#A9B5AA] focus:border-[#D9FF3D] focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-[#F6FFF2] block mb-2">
                About You (Optional)
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us a bit about yourself..."
                rows={4}
                className="w-full px-4 py-2 bg-[#0B0F0C] border border-[#1A211A] rounded-lg text-[#F6FFF2] placeholder-[#A9B5AA] focus:border-[#D9FF3D] focus:outline-none transition-colors resize-none"
              />
              <p className="text-xs text-[#A9B5AA] mt-1">
                {bio.length} / 500
              </p>
            </div>
          </div>
        )}

        {/* Step 5 - Policies */}
        {step === 5 && (
          <div className="space-y-4">
            <div className="space-y-3">
              {[
                {
                  id: 'terms',
                  label: 'I agree to the Terms of Service',
                  checked: acceptedTerms,
                  setChecked: setAcceptedTerms,
                },
                {
                  id: 'privacy',
                  label: 'I agree to the Privacy Policy',
                  checked: acceptedPrivacy,
                  setChecked: setAcceptedPrivacy,
                },
                {
                  id: 'guidelines',
                  label: 'I agree to the Community Guidelines',
                  checked: acceptedGuidelines,
                  setChecked: setAcceptedGuidelines,
                },
              ].map((policy) => (
                <label
                  key={policy.id}
                  className="flex items-start gap-3 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={policy.checked}
                    onChange={(e) => policy.setChecked(e.target.checked)}
                    className="mt-1 w-4 h-4 rounded border-[#1A211A] bg-[#0B0F0C]"
                  />
                  <span className="text-sm text-[#A9B5AA]">{policy.label}</span>
                </label>
              ))}
            </div>

            <div className="mt-4 p-4 bg-[#0B0F0C] rounded-lg border border-[#1A211A] text-sm text-[#A9B5AA] space-y-2">
              <p>
                Membership fees are non-refundable based on match placement or
                assessment outcome.
              </p>
              <p>
                You may cancel your membership at any time. Access continues
                through the end of your current billing period.
              </p>
            </div>
          </div>
        )}

        {/* Step 6 - Payment */}
        {step === 6 && (
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
              onClick={() => handleCompleteSignUp(selectedTier)}
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
              onClick={() => handleCompleteSignUp(null)}
              disabled={isLoading}
              className="w-full py-3 text-sm text-[#A9B5AA] border border-[#1A211A] rounded-full hover:border-[#D9FF3D] hover:text-[#D9FF3D] transition-colors disabled:opacity-50"
            >
              Skip for testing (simulate active membership)
            </button>
          </div>
        )}

        {/* Navigation Buttons */}
        {step < 6 && (
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
