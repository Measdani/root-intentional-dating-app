import React from 'react';
import { ArrowRight, BookOpen, HeartHandshake, RefreshCw, ShieldCheck, Sprout } from 'lucide-react';
import BrandLogo from '@/components/BrandLogo';
import { useApp } from '@/store/AppContext';

const learningAreas = [
  {
    title: 'Know Yourself',
    description: 'Understand your patterns, needs, boundaries, standards, and emotional responses.',
    icon: Sprout,
  },
  {
    title: 'Learn to Date',
    description: 'Practice discernment, healthy pacing, clear communication, and intentional choices.',
    icon: BookOpen,
  },
  {
    title: 'Build a Healthy Relationship',
    description: 'Learn how trust, vulnerability, expectations, and emotional safety are built together.',
    icon: HeartHandshake,
  },
  {
    title: 'Sustain Healthy Love',
    description: 'Strengthen connection, repair disconnection, and continue growing without losing yourself.',
    icon: RefreshCw,
  },
];

const NewLandingSection: React.FC = () => {
  const { setCurrentView } = useApp();

  return (
    <main className="rh-page-background min-h-screen text-[#F6FFF2]">
      <header className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <button type="button" onClick={() => setCurrentView('landing')} aria-label="Rooted Hearts home">
          <BrandLogo imageClassName="w-[104px] sm:w-[122px]" />
        </button>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setCurrentView('user-login')}
            className="rounded-full border border-[#DDE8DD]/20 px-4 py-2 text-sm text-[#DDE8DD] transition hover:border-[#D9FF3D]/60 hover:text-[#D9FF3D]"
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setCurrentView('sign-up')}
            className="rounded-full bg-[#D9FF3D] px-4 py-2 text-sm font-semibold text-[#0B0F0C] transition hover:scale-[1.02]"
          >
            Get lifetime access
          </button>
        </div>
      </header>

      <section className="relative overflow-hidden border-y border-white/5 px-5 py-24 sm:px-8 sm:py-32">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(217,255,61,0.13),transparent_34%),radial-gradient(circle_at_12%_85%,rgba(71,113,77,0.26),transparent_35%)]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.1fr_.9fr]">
          <div>
            <p className="mb-5 font-mono text-xs uppercase tracking-[0.28em] text-[#D9FF3D]">Relationship education for real life</p>
            <h1 className="max-w-4xl font-display text-5xl leading-[0.98] sm:text-7xl lg:text-[92px]">
              Learn healthier ways to love.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-[#A9B5AA] sm:text-xl">
              Rooted Hearts helps you understand yourself, relearn healthy dating habits, and build more fulfilling relationships—at your own pace.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => setCurrentView('sign-up')}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#D9FF3D] px-6 py-3.5 font-semibold text-[#0B0F0C] transition hover:scale-[1.02]"
              >
                Start learning <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => document.getElementById('learning-areas')?.scrollIntoView({ behavior: 'smooth' })}
                className="rounded-full border border-white/15 px-6 py-3.5 font-medium text-[#E8F2E8] transition hover:border-[#D9FF3D]/50"
              >
                Explore the four areas
              </button>
            </div>
          </div>

          <div className="rounded-[32px] border border-[#D9FF3D]/20 bg-[#111611]/90 p-7 shadow-[0_30px_100px_rgba(0,0,0,.35)] sm:p-9">
            <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#D9FF3D]/10 text-[#D9FF3D]">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <p className="font-display text-3xl">Teaching, not matchmaking.</p>
            <p className="mt-4 leading-7 text-[#A9B5AA]">
              There are no dating profiles, matches, swipes, or member messages here. Rooted Hearts gives you practical guidance, reflection tools, and trusted answers for every stage of a relationship.
            </p>
            <div className="mt-7 border-t border-white/10 pt-6">
              <p className="text-sm font-semibold text-[#F6FFF2]">One payment. Lifetime access.</p>
              <p className="mt-1 text-sm text-[#7F8B80]">Learn what you need, when you need it—including future additions.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="learning-areas" className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
        <div className="max-w-2xl">
          <p className="font-mono text-xs uppercase tracking-[0.26em] text-[#D9FF3D]">Choose what you need today</p>
          <h2 className="mt-4 font-display text-4xl sm:text-6xl">Four areas. Your pace.</h2>
          <p className="mt-5 text-lg leading-8 text-[#A9B5AA]">There is no required order and no finish line. Move between topics as your life and relationships change.</p>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {learningAreas.map((area, index) => {
            const Icon = area.icon;
            return (
              <article key={area.title} className="group rounded-[28px] border border-white/10 bg-[#111611] p-7 transition hover:border-[#D9FF3D]/35 sm:p-8">
                <div className="flex items-start justify-between gap-5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1A211A] text-[#D9FF3D]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="font-mono text-xs text-[#5F6A60]">0{index + 1}</span>
                </div>
                <h3 className="mt-8 font-display text-3xl">{area.title}</h3>
                <p className="mt-3 max-w-xl leading-7 text-[#A9B5AA]">{area.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="border-y border-white/5 bg-[#111611] px-5 py-20 sm:px-8">
        <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div className="max-w-2xl">
            <p className="font-display text-3xl sm:text-5xl">Understand yourself—and the other perspective.</p>
            <p className="mt-4 leading-7 text-[#A9B5AA]">Switch between female and male perspectives at any time. The principles stay healthy and consistent while the examples help you understand different experiences.</p>
          </div>
          <div className="min-w-[240px] rounded-2xl border border-[#D9FF3D]/20 bg-[#0B0F0C] p-4">
            <p className="mb-2 text-xs uppercase tracking-[0.16em] text-[#6E776E]">Viewing perspective</p>
            <div className="rounded-xl bg-[#1A211A] px-4 py-3 font-medium text-[#D9FF3D]">Female perspective ↕</div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default NewLandingSection;
