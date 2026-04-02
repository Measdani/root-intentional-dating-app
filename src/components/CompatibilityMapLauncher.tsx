import React, { useEffect, useMemo, useState } from 'react';
import { Users, X } from 'lucide-react';
import { useApp } from '@/store/AppContext';
import { cn } from '@/lib/utils';
import { ASSESSMENT_CORE_STYLES, ASSESSMENT_STYLE_META } from '@/services/assessmentStyleService';
import type { AssessmentCoreStyle } from '@/types';

type CompatibilityInsight = {
  howYouConnect: string;
  rootedRule: string;
};

type CompatibilityMapVariant = 'intentional' | 'alignment';

type CompatibilityMapLauncherProps = {
  variant?: CompatibilityMapVariant;
  buttonClassName?: string;
};

const STYLE_PAIR_INSIGHTS: Record<AssessmentCoreStyle, Record<AssessmentCoreStyle, CompatibilityInsight>> = {
  oak: {
    oak: {
      howYouConnect:
        'Two Oaks value honesty and direct communication. Both may want to address issues immediately, which can lead to powerful conversations but also stubborn stand-offs.',
      rootedRule:
        'Take turns speaking and focus on solving the issue rather than proving who is right.',
    },
    willow: {
      howYouConnect:
        'The Oak speaks directly while the Willow prioritizes emotional harmony. The Oak may push for clarity while the Willow tries to soften the conversation.',
      rootedRule:
        'The Oak slows the conversation slightly, and the Willow shares their needs clearly instead of avoiding tension.',
    },
    fern: {
      howYouConnect:
        'The Oak addresses issues quickly while the Fern prefers time to process emotions before responding.',
      rootedRule:
        'Give the Fern space to reflect before the Oak begins the conversation.',
    },
    gardener: {
      howYouConnect:
        'The Oak brings honesty and courage while the Gardener focuses on collaboration and growth.',
      rootedRule:
        'Let the Gardener guide the conversation toward solutions while the Oak keeps communication clear and direct.',
    },
    wildflower: {
      howYouConnect:
        'The Oak brings stability while the Wildflower brings optimism and emotional warmth.',
      rootedRule:
        'Balance serious conversations with moments of appreciation and shared joy.',
    },
  },
  willow: {
    oak: {
      howYouConnect:
        'The Willow focuses on emotional harmony while the Oak values direct communication.',
      rootedRule:
        'The Oak softens the delivery while the Willow communicates needs clearly instead of avoiding the issue.',
    },
    willow: {
      howYouConnect:
        'Two Willows value empathy and harmony. Difficult topics may sometimes be avoided to maintain peace.',
      rootedRule:
        'Create regular check-in conversations where both partners can speak honestly.',
    },
    fern: {
      howYouConnect:
        'Both partners are emotionally aware and thoughtful. However, discussions may be delayed because neither wants to create tension.',
      rootedRule:
        'Gently bring up concerns early before they grow silently.',
    },
    gardener: {
      howYouConnect:
        'The Willow provides emotional understanding while the Gardener focuses on growth and collaboration.',
      rootedRule:
        'Balance empathy with action by turning understanding into shared solutions.',
    },
    wildflower: {
      howYouConnect:
        'The Willow brings emotional depth while the Wildflower brings playfulness and optimism.',
      rootedRule:
        'Maintain emotional connection while still addressing important conversations honestly.',
    },
  },
  fern: {
    oak: {
      howYouConnect:
        'The Fern may need space while the Oak prefers immediate discussion.',
      rootedRule:
        'The Fern communicates when they will return to the conversation, and the Oak respects the reflection period.',
    },
    willow: {
      howYouConnect:
        'Both partners are emotionally aware but may hesitate to bring up conflict.',
      rootedRule:
        'Create gentle, intentional moments to talk through concerns openly.',
    },
    fern: {
      howYouConnect:
        'Both partners process emotions internally and may need time before discussing conflict.',
      rootedRule:
        'Agree to revisit important conversations after reflection instead of letting them fade away.',
    },
    gardener: {
      howYouConnect:
        'The Fern reflects deeply while the Gardener seeks collaborative solutions.',
      rootedRule:
        'Allow reflection time first, then let the Gardener guide the conversation toward understanding.',
    },
    wildflower: {
      howYouConnect:
        'The Fern brings introspection while the Wildflower brings curiosity and lightness.',
      rootedRule:
        'Respect quiet reflection while still nurturing shared experiences together.',
    },
  },
  gardener: {
    oak: {
      howYouConnect:
        'The Gardener encourages growth while the Oak brings honesty and clarity.',
      rootedRule:
        'Combine honesty with curiosity to focus conversations on growth instead of blame.',
    },
    willow: {
      howYouConnect:
        'The Gardener works toward solutions while the Willow ensures emotional understanding.',
      rootedRule:
        'Balance empathy with action to turn understanding into meaningful change.',
    },
    fern: {
      howYouConnect:
        'The Gardener seeks discussion while the Fern prefers reflection first.',
      rootedRule:
        'Allow reflection time before returning together to work through the issue.',
    },
    gardener: {
      howYouConnect:
        'Both partners believe relationships grow through effort and communication.',
      rootedRule:
        'Remember to enjoy the relationship, not just improve it.',
    },
    wildflower: {
      howYouConnect:
        'The Gardener builds stability while the Wildflower keeps the relationship vibrant.',
      rootedRule:
        'Let the Gardener nurture the foundation while the Wildflower keeps curiosity alive.',
    },
  },
  wildflower: {
    oak: {
      howYouConnect:
        'The Wildflower brings joy while the Oak provides structure and stability.',
      rootedRule:
        'Balance seriousness with playfulness so the relationship stays both strong and joyful.',
    },
    willow: {
      howYouConnect:
        'The Wildflower adds energy while the Willow adds emotional understanding.',
      rootedRule:
        'Let curiosity and empathy work together to keep communication open.',
    },
    fern: {
      howYouConnect:
        'The Wildflower encourages connection while the Fern values reflection.',
      rootedRule:
        'Balance adventure with moments of quiet connection.',
    },
    gardener: {
      howYouConnect:
        'The Wildflower brings excitement while the Gardener builds lasting foundations.',
      rootedRule:
        'Allow growth and fun to coexist so the relationship remains both stable and vibrant.',
    },
    wildflower: {
      howYouConnect:
        'Two Wildflowers bring excitement, adventure, and emotional warmth.',
      rootedRule:
        'Create shared routines that help the relationship stay grounded.',
    },
  },
};

const getDefaultPartnerStyle = (yourStyle: AssessmentCoreStyle): AssessmentCoreStyle =>
  ASSESSMENT_CORE_STYLES.find((style) => style !== yourStyle) ?? yourStyle;

const VARIANT_STYLES: Record<
  CompatibilityMapVariant,
  {
    button: string;
    focus: string;
    rule: string;
  }
> = {
  intentional: {
    button: 'border-[#D9FF3D]/40 text-[#D9FF3D] hover:bg-[#D9FF3D]/10',
    focus: 'focus:border-[#D9FF3D]',
    rule: 'text-[#D9FF3D]',
  },
  alignment: {
    button: 'border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10',
    focus: 'focus:border-emerald-400',
    rule: 'text-emerald-300',
  },
};

const CompatibilityMapLauncher: React.FC<CompatibilityMapLauncherProps> = ({
  variant = 'intentional',
  buttonClassName,
}) => {
  const { currentUser, assessmentResult } = useApp();
  const theme = VARIANT_STYLES[variant];
  const defaultYourStyle = currentUser.primaryStyle ?? assessmentResult?.primaryStyle ?? 'oak';
  const defaultPartnerStyle =
    currentUser.secondaryStyle ??
    assessmentResult?.secondaryStyle ??
    getDefaultPartnerStyle(defaultYourStyle);
  const [showCompatibilityMapModal, setShowCompatibilityMapModal] = useState(false);
  const [compatibilityYourStyle, setCompatibilityYourStyle] =
    useState<AssessmentCoreStyle>(defaultYourStyle);
  const [compatibilityPartnerStyle, setCompatibilityPartnerStyle] =
    useState<AssessmentCoreStyle>(defaultPartnerStyle);
  const selectedCompatibilityInsight = useMemo(
    () => STYLE_PAIR_INSIGHTS[compatibilityYourStyle][compatibilityPartnerStyle],
    [compatibilityYourStyle, compatibilityPartnerStyle]
  );

  useEffect(() => {
    setCompatibilityYourStyle(defaultYourStyle);
    setCompatibilityPartnerStyle(defaultPartnerStyle);
  }, [defaultPartnerStyle, defaultYourStyle, currentUser.id]);

  return (
    <>
      <button
        onClick={() => setShowCompatibilityMapModal(true)}
        className={cn(
          'inline-flex items-center gap-2 rounded-lg border px-4 py-2 transition',
          theme.button,
          buttonClassName
        )}
      >
        <Users className="h-4 w-4" />
        Compatibility Map
      </button>

      {showCompatibilityMapModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-[#0B0F0C]/80 backdrop-blur-sm"
            onClick={() => setShowCompatibilityMapModal(false)}
          />
          <div className="relative w-full max-w-3xl rounded-2xl border border-[#1A211A] bg-[#111611] p-5 md:p-6">
            <button
              onClick={() => setShowCompatibilityMapModal(false)}
              className="absolute right-3 top-3 rounded-full bg-[#1A211A] p-2 text-[#A9B5AA] hover:text-[#F6FFF2]"
              aria-label="Close compatibility map"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="font-display text-2xl text-[#F6FFF2]">Compatibility Map</h3>
            <p className="mt-2 text-sm text-[#A9B5AA]">
              Select your style and a prospective partner&apos;s style to view one focused compatibility insight.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-wide text-[#A9B5AA]">
                  Your Style
                </label>
                <select
                  value={compatibilityYourStyle}
                  onChange={(e) => setCompatibilityYourStyle(e.target.value as AssessmentCoreStyle)}
                  className={cn(
                    'w-full rounded-lg border border-[#1A211A] bg-[#0B0F0C] px-3 py-2 text-sm text-[#F6FFF2] focus:outline-none',
                    theme.focus
                  )}
                >
                  {ASSESSMENT_CORE_STYLES.map((style) => {
                    const meta = ASSESSMENT_STYLE_META[style];
                    return (
                      <option key={`compatibility-your-${style}`} value={style}>
                        {meta.label}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-wide text-[#A9B5AA]">
                  Prospective Partner Style
                </label>
                <select
                  value={compatibilityPartnerStyle}
                  onChange={(e) => setCompatibilityPartnerStyle(e.target.value as AssessmentCoreStyle)}
                  className={cn(
                    'w-full rounded-lg border border-[#1A211A] bg-[#0B0F0C] px-3 py-2 text-sm text-[#F6FFF2] focus:outline-none',
                    theme.focus
                  )}
                >
                  {ASSESSMENT_CORE_STYLES.map((style) => {
                    const meta = ASSESSMENT_STYLE_META[style];
                    return (
                      <option key={`compatibility-partner-${style}`} value={style}>
                        {meta.label}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-[#1A211A] bg-[#0B0F0C] p-4">
              <p className="text-xs uppercase tracking-wide text-[#A9B5AA]">Compatibility Insight</p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[#A9B5AA]">
                <span>
                  {ASSESSMENT_STYLE_META[compatibilityYourStyle].emoji} {ASSESSMENT_STYLE_META[compatibilityYourStyle].label}
                </span>
                <span>+</span>
                <span>
                  {ASSESSMENT_STYLE_META[compatibilityPartnerStyle].emoji} {ASSESSMENT_STYLE_META[compatibilityPartnerStyle].label}
                </span>
              </div>

              <div className="mt-4">
                <p className="text-xs uppercase tracking-wide text-[#A9B5AA]">How You Connect</p>
                <p className="mt-1.5 text-sm text-[#F6FFF2]">{selectedCompatibilityInsight.howYouConnect}</p>
              </div>

              <div className="mt-4">
                <p className="text-xs uppercase tracking-wide text-[#A9B5AA]">Rooted Rule</p>
                <p className={cn('mt-1.5 text-sm', theme.rule)}>{selectedCompatibilityInsight.rootedRule}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CompatibilityMapLauncher;
