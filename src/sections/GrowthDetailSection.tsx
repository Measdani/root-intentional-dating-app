import React, { useState, useEffect } from 'react';
import { useApp } from '@/store/AppContext';
import { growthResources } from '@/data/assessment';
import { ArrowLeft, BookOpen, CheckCircle, Clock } from 'lucide-react';
import type { BlogArticle } from '@/types';
import ModuleBlogModal from '@/components/ModuleBlogModal';

interface ModuleContent {
  title: string;
  keyPoints: string[];
  exercise: string[];
}

const GrowthDetailSection: React.FC = () => {
  const { setCurrentView } = useApp();
  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [blogs, setBlogs] = useState<BlogArticle[]>([]);
  const [selectedBlog, setSelectedBlog] = useState<BlogArticle | null>(null);

  // Load blogs from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('community-blogs');
    if (saved) {
      setBlogs(JSON.parse(saved));
    }
  }, []);

  // Detailed module content
  const moduleContent: Record<string, ModuleContent> = {
    'g1-m1': {
      title: 'Understanding Your Emotions',
      keyPoints: [
        'Emotions are not character flaws—they\'re data. Every feeling carries information about your values, boundaries, and needs.',
        'The goal isn\'t to eliminate emotions but to understand and choose your response to them.',
        'Many people were taught to suppress or deny emotions. In healthy relationships, you need to develop the capacity to feel, name, and communicate.',
        'The emotional regulation spectrum ranges from complete suppression to complete expression. Healthy regulation lives in the middle.',
        'Emotions serve a purpose: fear protects you, anger signals boundaries, sadness honors loss, joy celebrates meaning.',
      ],
      exercise: [
        'Emotion Inventory: Over the next 3 days, write down each emotion you experience. Don\'t judge it—just name it specifically.',
        'Look for patterns: What situations trigger what emotions? What do these emotions have in common?',
        'Write a reflection: What would it feel like to accept rather than fight these emotions?',
      ],
    },
    'g1-m2': {
      title: 'The RAIN Technique',
      keyPoints: [
        'R - Recognize: Notice the emotion without judgment. Name it specifically (not just "bad" but "disappointed," "hurt," "frustrated").',
        'A - Allow: Create space for the emotion instead of fighting it. Say to yourself: "This is what I\'m feeling right now, and that\'s okay."',
        'I - Investigate: With curiosity, explore where you feel it in your body. What triggered it? What need might be underneath?',
        'N - Nurture: Offer yourself compassion. Touch your chest, take deep breaths, or speak kindly to yourself.',
        'This technique takes about 5-10 minutes and can be used anytime you feel overwhelmed.',
      ],
      exercise: [
        'Practice RAIN: Choose a recent situation where you felt triggered. Walk through each step slowly.',
        'Timing: How long did the intensity last? Notice if it shifted after you completed the process.',
        'Journaling: Write about what shifted when you allowed the emotion instead of fighting it.',
      ],
    },
    'g1-m3': {
      title: 'Grounding Techniques',
      keyPoints: [
        'The 5-4-3-2-1 technique: Name 5 things you see, 4 you can touch, 3 you hear, 2 you smell, 1 you taste.',
        'This anchors you to the present moment and interrupts the anxiety cycle.',
        'The 90-Second Rule: Neuroscience shows pure emotional chemistry lasts about 90 seconds. When triggered, pause and breathe.',
        'Box Breathing: Inhale for 4 counts, hold for 4, exhale for 4, hold for 4. Repeat 5-10 times.',
        'Physical grounding: Put your feet firmly on the ground, feel the temperature of the air, touch something cold.',
      ],
      exercise: [
        'Try the 5-4-3-2-1 technique when you\'re calm. Notice how it feels.',
        'Next time you feel anxious, use it. Time yourself—how long until you feel grounded?',
        'Combine techniques: Use box breathing + 5-4-3-2-1 together. What works best for you?',
      ],
    },
    'g1-m4': {
      title: 'Emotions in Relationships',
      keyPoints: [
        'When your partner says something that triggers you, pause before responding. That gap is where your power lies.',
        'Share your process: "I\'m feeling triggered right now, and I need 15 minutes to process before we talk about this."',
        'Repair quickly: If you lose regulation and react poorly, take responsibility and repair immediately.',
        'Validate your partner\'s emotions even when they\'re directed at you: "I can see this really hurts you, and your feelings matter."',
        'Remember: You\'re not responsible for managing your partner\'s emotions, but your regulation influences the conversation\'s quality.',
      ],
      exercise: [
        'Identify your top 3 relationship triggers. What happens to your body when they occur?',
        'Practice the pause: Next time triggered, take 3 deep breaths before responding.',
        'Have a conversation: Tell your partner about your regulation practice. Ask them how they experience your emotions.',
      ],
    },
    'g2-m1': {
      title: 'What Accountability Really Is',
      keyPoints: [
        'Accountability is NOT shame spiraling or self-punishment. It\'s not assuming you\'re a bad person.',
        'Accountability is: "I did this. It had this impact on you. I didn\'t intend harm, but intent doesn\'t erase impact."',
        'The three components: See your impact, own your part, commit to change.',
        'Without accountability, patterns repeat. With it, relationships deepen.',
        'Accountability requires humility—the willingness to be wrong and grow from it.',
      ],
      exercise: [
        'Reflect: Identify one way your behavior has impacted someone you care about.',
        'Practice the statement: "I did X. You experienced Y. I understand now why that hurt."',
        'Write it down: What would you need to do differently going forward?',
      ],
    },
    'g2-m2': {
      title: 'The Accountability Cycle',
      keyPoints: [
        'Step 1 - Awareness: Recognize you\'ve caused harm. Listen without defending.',
        'Step 2 - Understanding: Ask yourself why. What were you avoiding? What didn\'t you know?',
        'Step 3 - Genuine Apology: "I was wrong. You didn\'t deserve that. I understand why you\'re hurt."',
        'Step 4 - Repair & Commitment: Ask "What do you need from me?" and follow through on changes.',
        'Trust is rebuilt through consistent behavior over time, not words.',
      ],
      exercise: [
        'Choose one past conflict. Walk through each step of the cycle.',
        'Write your accountability statement: All 4 components, in your own words.',
        'Ask someone you trust: "Does this feel authentic? What am I missing?"',
      ],
    },
    'g2-m3': {
      title: 'The Genuine Apology',
      keyPoints: [
        'Avoid: "I\'m sorry you felt offended" (implies they\'re oversensitive)',
        'Avoid: "I\'m sorry, but..." (the "but" cancels the apology)',
        'Avoid: "I\'m sorry I hurt you, here\'s why..." (shifts focus to your circumstances)',
        'Good: "I was wrong. Your experience matters. I take responsibility."',
        'Good: "I understand why you\'re upset. Here\'s what I\'m doing differently."',
      ],
      exercise: [
        'Think of something you apologized for insincerely. Rewrite the apology.',
        'Practice saying it out loud. How does it feel different?',
        'Pay attention this week: Notice good apologies vs poor ones in your life.',
      ],
    },
    'g2-m4': {
      title: 'Following Through',
      keyPoints: [
        'Actions speak louder than words. Consistency over time rebuilds trust.',
        'Circle back: "I said I\'d do X and I didn\'t. That matters. Here\'s my new plan."',
        'If you see a pattern: "I notice I do this thing repeatedly. I\'m working on it. I don\'t expect you to be okay with it, but I want you to know I see it."',
        'Build a "repair culture" where both of you can say "I got this wrong" without shame.',
        'The goal isn\'t perfection—it\'s genuine effort and consistent improvement.',
      ],
      exercise: [
        'Identify one commitment you\'ve made that you didn\'t follow through on.',
        'Have the conversation: "I didn\'t follow through on X. Here\'s what got in the way, and here\'s my new plan."',
        'Track your commitment: Check in weekly—are you following through?',
      ],
    },
    'g3-m1': {
      title: 'The Wholeness Framework',
      keyPoints: [
        'Wholeness is not independence (rejecting others) or codependence (needing others to complete you).',
        'Wholeness is interdependence: being complete in yourself while choosing deep connection.',
        'Many use relationships to fill internal voids: loneliness, lack of purpose, low self-worth.',
        'The paradox: Partners are MORE attracted to you when you\'re not desperate for them to complete you.',
        'A strong sense of self is not selfish—it\'s the foundation for healthy partnership.',
      ],
      exercise: [
        'Assess: On a scale of 1-10, how complete do you feel without a partner?',
        'Journal: What internal voids are you hoping a partner will fill? What work does that require from you?',
        'Plan: What would it take to feel more complete on your own?',
      ],
    },
    'g3-m2': {
      title: 'The Three Pillars',
      keyPoints: [
        'Pillar 1 - Purpose: What brings you alive? What do you contribute? What legacy do you want?',
        'Pillar 2 - Connection: Beyond romance, who are your friends? Your community? Relationships thrive with a support network.',
        'Pillar 3 - Practice: What habits nourish you? Exercise, creativity, spirituality, learning? These build your resilience.',
        'These three pillars are interdependent. Strong purpose fuels practice. Community supports both.',
        'When one pillar is weak, the others feel pressure. Build all three.',
      ],
      exercise: [
        'Rate each pillar 1-10. Which is strongest? Which needs work?',
        'Purpose: Write your answer to "What makes my life meaningful?"',
        'Connection: List 5 non-romantic relationships that matter to you. How often do you invest in them?',
        'Practice: Identify 3 habits that make you feel like yourself. Schedule them this week.',
      ],
    },
    'g3-m3': {
      title: 'Building Your Self',
      keyPoints: [
        'Spend intentional time alone—not scrolling, but being with yourself.',
        'Identify 3 non-negotiable practices that make you feel like yourself.',
        'Invest in relationships outside romance. Friendships create a healthy container for romantic love.',
        'Have goals and dreams that exist independently of partnership.',
        'The question: "What do I want my life to look like?"—answer it for yourself, not your future partner.',
      ],
      exercise: [
        'Solo time: Schedule 2 hours this week with just yourself. No phone, no distractions.',
        'Write: What did you do? What thoughts came up? What did you learn about yourself?',
        'Friends: Reach out to one person you\'ve neglected. Make plans.',
        'Goals: List 5 things you want to accomplish in the next year, independent of relationship status.',
      ],
    },
    'g3-m4': {
      title: 'Bringing Wholeness to Partnership',
      keyPoints: [
        'When you have a strong sense of self, you can be vulnerable without losing yourself.',
        'You can have different opinions without the relationship feeling threatened.',
        'Healthy conflict emerges when both people have a strong self.',
        'Your partner feels the relief when they don\'t have to be your entire world.',
        'The strongest partnerships are between two whole people who choose each other.',
      ],
      exercise: [
        'In your next conversation with your partner, share one of your goals or dreams that exists independently.',
        'Disagree on something intentionally—notice if it feels threatening or enriching.',
        'Ask your partner: "What do you notice about me when I\'m connected to my own purpose?"',
      ],
    },
    'g4-m1': {
      title: 'What Boundaries Are',
      keyPoints: [
        'Boundaries are not walls. They\'re the limits that allow you to be safe, respected, and authentic.',
        'Boundaries are about what YOU will and won\'t do, not about controlling others.',
        '"I don\'t allow disrespect" is a boundary. "You can\'t talk to your ex" is a control attempt.',
        'Healthy boundaries are specific, communicated clearly, and enforced consistently.',
        'When you cross your own boundaries, you lose respect for yourself.',
      ],
      exercise: [
        'List 5 times recently when you felt your boundary was crossed. What happened?',
        'For each: What was your boundary? Did you communicate it? What was the outcome?',
        'Reflect: Which boundaries are hardest for you to maintain?',
      ],
    },
    'g4-m2': {
      title: 'Types of Boundaries',
      keyPoints: [
        'Emotional: What feelings are yours to manage? "I care about you, but I\'m not responsible for managing your emotions."',
        'Physical: What touch do you consent to? What personal space do you need?',
        'Time: How much availability do you have? "I need 2 nights a week for my own projects."',
        'Mental: What opinions are open to debate vs what\'s non-negotiable?',
        'Sexual: What activities are you comfortable with? Clear consent always.',
      ],
      exercise: [
        'Emotional boundaries: What\'s one feeling you often absorb from others? How can you create distance?',
        'Physical: What touch do you dislike? Can you practice saying no?',
        'Time: What\'s your ideal balance between togetherness and independence?',
        'Mental: What\'s a core value you won\'t compromise on?',
      ],
    },
    'g4-m3': {
      title: 'Setting Boundaries',
      keyPoints: [
        'Be clear: "I need us to check in before making plans" is clearer than "I like to know what\'s happening."',
        'Be kind: "I value our connection and I need some independence. Here\'s what that looks like..."',
        'Be specific: "I need 24 hours notice" not "Don\'t be random."',
        'Follow through: If someone crosses a boundary, address it promptly.',
        'If it continues, enforce consequences. Respect comes from consistency.',
      ],
      exercise: [
        'Pick one boundary you want to set. Write it out specifically.',
        'Practice saying it kindly and clearly.',
        'Set it this week. Notice what happens.',
        'If it\'s crossed, address it calmly and immediately.',
      ],
    },
    'g4-m4': {
      title: 'Boundaries in Partnership',
      keyPoints: [
        'Discuss boundaries early and explicitly. Share what matters to you.',
        'Boundaries evolve. Regular check-ins: "Are these still working?"',
        'When your partner has a boundary that feels like rejection, pause. Their boundary is not about you.',
        'Respecting boundaries is how you show love.',
        'The goal is mutual respect, not control. Both partners should feel safe and autonomous.',
      ],
      exercise: [
        'Have the boundary conversation: "Here\'s what I need to feel respected and safe..."',
        'Listen: Ask your partner what boundaries matter to them.',
        'Check-in weekly: "How are we doing with boundaries?"',
        'Practice: When your partner sets a boundary, respect it without defensiveness.',
      ],
    },
    'g5-m1': {
      title: 'Why Conflict Matters',
      keyPoints: [
        'Couples who never fight often have low emotional intimacy. They\'re avoiding, not connecting.',
        'Conflict itself isn\'t the problem—how you handle it is.',
        'Conflict reveals what matters. When you disagree, you learn your partner\'s values.',
        'The couples who stay together aren\'t those who avoid conflict—they\'re those who repair after it.',
        'Unresolved conflict corrodes intimacy. Resolved conflict deepens it.',
      ],
      exercise: [
        'Reflect: What conflict patterns did you grow up with? Avoidance? Intensity? Silence?',
        'Journal: How do those patterns show up in your relationships now?',
        'Commit: I want to approach conflict as a chance to connect, not a threat.',
      ],
    },
    'g5-m2': {
      title: 'The Repair Conversation',
      keyPoints: [
        'Step 1 - Initiate gently: "I want to talk about what happened. When is a good time?" Harsh start-ups predict bad outcomes.',
        'Step 2 - Share your experience: "When you did X, I felt Y because it triggered Z." Use "I" statements.',
        'Step 3 - Listen to understand: "What was happening for you? What did you mean?" Hear them, even if you disagree.',
        'Step 4 - Find the underlying need: Usually it\'s not about the surface issue.',
        'Step 5 - Repair: "Here\'s what I understand. Here\'s what I\'ll do differently. How can we both feel heard?"',
      ],
      exercise: [
        'Choose a recent conflict. Map it: What was said? What did each person feel underneath?',
        'Practice step 1: Write how you\'d initiate gently.',
        'Practice step 3: What would you want to understand about your partner\'s perspective?',
        'Next conflict: Use all 5 steps. Take notes on what shifted.',
      ],
    },
    'g5-m3': {
      title: 'Healing Language',
      keyPoints: [
        'Healing: "Help me understand..." "I didn\'t realize..." "That makes sense..." "I was wrong..." "Can we try this instead?"',
        'Harming: "You always..." "You never..." "Obviously..." "That\'s stupid..." "Your fault..." "Whatever..."',
        'During conflict, assume good intent: "I know you weren\'t trying to hurt me, but here\'s the impact..."',
        'After conflict, circle back: "I\'ve been thinking about what you said, and I get it now."',
        'One word makes the difference: Replace "but" with "and." "I hear you AND I have a different perspective."',
      ],
      exercise: [
        'Listen: In conversations this week, notice when language is healing vs harming.',
        'Reframe: Take one harming phrase you use and rewrite it as healing.',
        'Practice: Use healing language in your next conflict.',
        'Reflect: How does your partner respond differently?',
      ],
    },
    'g5-m4': {
      title: 'Advanced Conflict Skills',
      keyPoints: [
        'Take a break if needed: "I\'m getting flooded. I need 30 minutes, then I want to keep talking."',
        'Address one thing at a time. Don\'t bring up the entire history.',
        'Ask for what you need, not what they\'re doing wrong. "I need reassurance" vs "You made me feel abandoned."',
        'Practice the phrase: "You might be right about that." This opens possibility.',
        'End conflicts with clarity: "Here\'s what we decided. Here\'s what we\'re both committing to."',
      ],
      exercise: [
        'Identify your flooding signs: What happens physically? What\'s your limit?',
        'Practice: Use the pause technique. Set a timer for 30 minutes.',
        'Choose one technique: "You might be right" OR one thing at a time OR clear endings.',
        'Use it in your next conflict. Notice what shifts.',
      ],
    },
  };

  const resource = selectedResourceId ? growthResources.find(r => r.id === selectedResourceId) : null;
  const content = selectedModuleId ? moduleContent[selectedModuleId] : null;

  return (
    <div className="min-h-screen bg-[#0F140F] text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#111611]/95 backdrop-blur border-b border-[#1A211A] px-4 sm:px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (selectedModuleId) {
                  setSelectedModuleId(null);
                } else if (selectedResourceId) {
                  setSelectedResourceId(null);
                } else {
                  setCurrentView('growth-mode');
                }
              }}
              className="p-2 hover:bg-[#1A211A] rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold">Growth Mastery</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {!selectedResourceId ? (
          // Resource List
          <div className="grid gap-6">
            <h2 className="text-3xl font-bold mb-4">Choose a Growth Path</h2>
            {growthResources.map((resource) => (
              <div
                key={resource.id}
                onClick={() => setSelectedResourceId(resource.id)}
                className="bg-[#111611] border border-[#1A211A] rounded-lg p-6 cursor-pointer hover:border-[#D9FF3D] transition group"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2 group-hover:text-[#D9FF3D] transition">
                      {resource.title}
                    </h3>
                    <p className="text-gray-400 mb-4">{resource.description}</p>
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className="text-xs bg-[#D9FF3D]/10 text-[#D9FF3D] px-3 py-1 rounded-full flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {resource.estimatedTime}
                      </span>
                      <span className="text-xs text-gray-400">
                        {resource.modules?.length} modules
                      </span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <div className="w-12 h-12 bg-[#D9FF3D]/10 rounded-full flex items-center justify-center">
                      <BookOpen className="w-6 h-6 text-[#D9FF3D]" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : !selectedModuleId ? (
          // Module List for Selected Resource
          <div>
            <div className="mb-8">
              <h2 className="text-3xl font-bold mb-2">{resource?.title}</h2>
              <p className="text-gray-400 text-lg mb-4">{resource?.description}</p>
              <p className="text-sm text-gray-500 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {resource?.estimatedTime} • {resource?.modules?.length} modules
              </p>
            </div>

            <div className="grid gap-4">
              {resource?.modules?.map((mod, idx) => (
                <div
                  key={mod.id}
                  onClick={() => setSelectedModuleId(mod.id)}
                  className="bg-[#111611] border border-[#1A211A] rounded-lg p-6 cursor-pointer hover:border-[#D9FF3D] transition group"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#D9FF3D]/10 flex items-center justify-center font-bold text-[#D9FF3D]">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold mb-2 group-hover:text-[#D9FF3D] transition">
                        {mod.title}
                      </h3>
                      <p className="text-gray-400">{mod.description}</p>
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      <div className="text-[#D9FF3D] group-hover:translate-x-1 transition">→</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          // Module Detail with Content and Exercise
          <div className="space-y-8">
            <div>
              <h2 className="text-4xl font-bold mb-4">{content?.title}</h2>
            </div>

            {/* Key Points */}
            <div className="bg-[#111611] border border-[#D9FF3D]/20 rounded-lg p-8">
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <BookOpen className="w-6 h-6 text-[#D9FF3D]" />
                Key Concepts
              </h3>
              <div className="space-y-4">
                {content?.keyPoints.map((point, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div className="flex-shrink-0 w-2 h-2 rounded-full bg-[#D9FF3D] mt-2"></div>
                    <p className="text-gray-300 leading-relaxed">{point}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Exercise */}
            <div className="bg-[#111611] border border-[#1A211A] rounded-lg p-8">
              <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-amber-500" />
                This Week's Practice
              </h3>
              <div className="space-y-4">
                {content?.exercise.map((ex, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div className="flex-shrink-0 font-bold text-[#D9FF3D]">{idx + 1}.</div>
                    <p className="text-gray-300 leading-relaxed">{ex}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Advanced Resources */}
            <div className="bg-gradient-to-r from-[#D9FF3D]/20 to-transparent border border-[#D9FF3D]/30 rounded-lg p-8">
              <h3 className="text-2xl font-bold mb-3 text-[#D9FF3D]">Take Your Growth Further</h3>
              <p className="text-gray-300 mb-6">
                Ready to deepen your practice? Our premium resources provide advanced techniques, personalized coaching, and accountability partnerships.
              </p>
              <button
                onClick={() => setCurrentView('paid-growth-mode')}
                className="py-3 px-6 bg-[#D9FF3D] text-[#0B0F0C] rounded-lg font-bold hover:scale-[1.02] transition-transform"
              >
                Explore Advanced Resources →
              </button>
            </div>

            {/* Module Resources */}
            {(() => {
              const currentModule = resource?.modules?.find(m => m.id === selectedModuleId);
              const moduleBlogIds = currentModule?.blogIds || [];
              const moduleBogs = moduleBlogIds
                .map(blogId => blogs.find(b => b.id === blogId))
                .filter(Boolean) as BlogArticle[];

              if (moduleBogs.length > 0) {
                return (
                  <div className="bg-[#111611] border border-[#D9FF3D]/20 rounded-lg p-8">
                    <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
                      <BookOpen className="w-6 h-6 text-[#D9FF3D]" />
                      Module Resources
                    </h3>
                    <div className="space-y-3">
                      {moduleBogs.map((blog) => (
                        <button
                          key={blog.id}
                          onClick={() => setSelectedBlog(blog)}
                          className="w-full text-left bg-[#0B0F0C] border border-[#1A211A] rounded-lg p-4 hover:border-[#D9FF3D] transition group"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <h4 className="font-bold text-white mb-1 group-hover:text-[#D9FF3D] transition">
                                📄 {blog.title}
                              </h4>
                              <p className="text-sm text-gray-400">{blog.excerpt}</p>
                              {blog.readTime && (
                                <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {blog.readTime} read
                                </p>
                              )}
                            </div>
                            <span className="text-[#D9FF3D] opacity-0 group-hover:opacity-100 transition">→</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              }
            })()}

            {/* Navigation to Next Module */}
            {resource?.modules && selectedModuleId && (
              <div className="flex gap-4 pt-8">
                {(() => {
                  const currentIdx = resource.modules?.findIndex((m) => m.id === selectedModuleId);
                  const hasPrev = currentIdx !== undefined && currentIdx > 0;
                  const hasNext = currentIdx !== undefined && currentIdx < (resource.modules?.length ?? 0) - 1;

                  return (
                    <>
                      {hasPrev && (
                        <button
                          onClick={() => {
                            const prevModule = resource.modules?.[currentIdx - 1];
                            if (prevModule) setSelectedModuleId(prevModule.id);
                          }}
                          className="flex-1 py-3 px-4 bg-[#1A211A] text-white rounded-lg hover:bg-[#252C25] transition"
                        >
                          ← Previous Module
                        </button>
                      )}
                      {hasNext && (
                        <button
                          onClick={() => {
                            const nextModule = resource.modules?.[currentIdx + 1];
                            if (nextModule) setSelectedModuleId(nextModule.id);
                          }}
                          className="flex-1 py-3 px-4 bg-[#D9FF3D] text-[#0B0F0C] rounded-lg hover:bg-white transition font-bold"
                        >
                          Next Module →
                        </button>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Module Blog Modal */}
      <ModuleBlogModal
        blog={selectedBlog}
        isOpen={!!selectedBlog}
        onClose={() => setSelectedBlog(null)}
        onBack={() => setSelectedBlog(null)}
      />
    </div>
  );
};

export default GrowthDetailSection;
