import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, ArrowRight, Bookmark, BookOpen, Check, CheckCircle2, ChevronDown,
  CircleHelp, HeartHandshake, Home, LibraryBig, Menu, NotebookPen, RefreshCw,
  Search, Settings, Sprout, X,
} from 'lucide-react';
import { toast } from 'sonner';
import BrandLogo from '@/components/BrandLogo';
import { useApp } from '@/store/AppContext';
import { approvedQuestions as starterQuestions, learningAreaMeta, learningLessons as starterLessons } from '@/data/learningLibrary';
import { learningPlatformService } from '@/services/learningPlatformService';
import { journalService, type JournalEntry } from '@/services/journalService';
import { userService } from '@/services/userService';
import type { AppView } from '@/types';
import type { LearningAreaId, LearningLesson, LearningPerspective, LearningProgressRecord } from '@/types/learning';

const perspectiveStorageKey = 'rooted-hearts-viewing-perspective';

const areaIcons: Record<LearningAreaId, React.ComponentType<{ className?: string }>> = {
  'know-yourself': Sprout,
  'learn-to-date': BookOpen,
  'build-relationship': HeartHandshake,
  'sustain-love': RefreshCw,
};

const navItems: Array<{ view: AppView; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { view: 'home', label: 'My Home', icon: Home },
  { view: 'learning-library', label: 'Learn', icon: LibraryBig },
  { view: 'ask-rooted-hearts', label: 'Ask Rooted Hearts', icon: CircleHelp },
  { view: 'saved-content', label: 'Saved', icon: Bookmark },
  { view: 'journal', label: 'Journal', icon: NotebookPen },
  { view: 'learning-progress', label: 'My Progress', icon: CheckCircle2 },
];

const LearningPlatformSection: React.FC = () => {
  const { currentView, setCurrentView, currentUser } = useApp();
  const userId = currentUser?.id || 'preview';
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [perspective, setPerspective] = useState<LearningPerspective>(() => {
    try {
      const stored = localStorage.getItem(perspectiveStorageKey);
      if (stored === 'male' || stored === 'female') return stored;
    } catch { /* use account/default value */ }
    return currentUser?.lastViewingPerspective === 'male' ? 'male' : 'female';
  });
  const [progress, setProgress] = useState<LearningProgressRecord[]>([]);
  const [learningLessons, setLearningLessons] = useState<LearningLesson[]>(starterLessons);
  const [approvedQuestions, setApprovedQuestions] = useState(starterQuestions);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [selectedArea, setSelectedArea] = useState<LearningAreaId | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<LearningLesson | null>(null);
  const [librarySearch, setLibrarySearch] = useState('');
  const [questionSearch, setQuestionSearch] = useState('');
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [submittingQuestion, setSubmittingQuestion] = useState(false);
  const [journalTitle, setJournalTitle] = useState('');
  const [journalContent, setJournalContent] = useState('');
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [savingJournal, setSavingJournal] = useState(false);

  const activeView = navItems.some((item) => item.view === currentView) ? currentView : 'home';
  const completedIds = useMemo(() => new Set(progress.filter((item) => item.completed).map((item) => item.lessonId)), [progress]);
  const lastViewedLesson = useMemo(() => {
    const latest = [...progress].sort((a, b) => b.lastViewedAt.localeCompare(a.lastViewedAt))[0];
    return latest ? learningLessons.find((lesson) => lesson.id === latest.lessonId) ?? null : null;
  }, [progress, learningLessons]);

  useEffect(() => {
    let active = true;
    Promise.all([
      learningPlatformService.getPublishedLessons(starterLessons),
      learningPlatformService.getApprovedAnswers(starterQuestions),
      learningPlatformService.getProgress(userId),
      learningPlatformService.getSavedLessonIds(userId),
      journalService.getEntriesBySection('notes'),
    ]).then(([nextLessons, nextQuestions, nextProgress, nextSaved, nextEntries]) => {
      if (!active) return;
      setLearningLessons(nextLessons);
      setApprovedQuestions(nextQuestions);
      setProgress(nextProgress);
      setSavedIds(nextSaved);
      setJournalEntries(nextEntries);
    });
    return () => { active = false; };
  }, [userId]);

  const changePerspective = (value: LearningPerspective) => {
    setPerspective(value);
    try { localStorage.setItem(perspectiveStorageKey, value); } catch { /* session state still works */ }
    void userService.updateUser(userId, { lastViewingPerspective: value });
  };

  const navigate = (view: AppView) => {
    setCurrentView(view);
    setMobileNavOpen(false);
    setSelectedLesson(null);
    if (view !== 'learning-library') setSelectedArea(null);
  };

  const openLesson = async (lesson: LearningLesson) => {
    setSelectedLesson(lesson);
    setSelectedArea(lesson.areaId);
    const record = { lessonId: lesson.id, completed: completedIds.has(lesson.id), lastViewedAt: new Date().toISOString() };
    setProgress((items) => [record, ...items.filter((item) => item.lessonId !== lesson.id)]);
    await learningPlatformService.viewLesson(userId, lesson.id);
  };

  const completeLesson = async (lesson: LearningLesson) => {
    const record = { lessonId: lesson.id, completed: true, lastViewedAt: new Date().toISOString() };
    setProgress((items) => [record, ...items.filter((item) => item.lessonId !== lesson.id)]);
    await learningPlatformService.viewLesson(userId, lesson.id, true);
    toast.success('Lesson marked complete.');
  };

  const toggleSaved = async (lessonId: string) => {
    const willSave = !savedIds.includes(lessonId);
    setSavedIds((items) => willSave ? [...items, lessonId] : items.filter((id) => id !== lessonId));
    await learningPlatformService.setLessonSaved(userId, lessonId, willSave);
    toast.success(willSave ? 'Saved for later.' : 'Removed from saved lessons.');
  };

  const submitQuestion = async () => {
    const trimmed = question.trim();
    if (trimmed.length < 10) return;
    setSubmittingQuestion(true);
    try {
      await learningPlatformService.submitQuestion(userId, trimmed, perspective);
      setQuestion('');
      toast.success('Your question was submitted privately for review.');
    } finally {
      setSubmittingQuestion(false);
    }
  };

  const saveJournalEntry = async () => {
    if (!journalContent.trim()) return;
    setSavingJournal(true);
    const entry = await journalService.createEntry('notes', journalContent, journalTitle || 'Reflection');
    if (entry) {
      setJournalEntries((items) => [entry, ...items.filter((item) => item.id !== entry.id)]);
      setJournalTitle('');
      setJournalContent('');
      toast.success('Reflection saved privately.');
    }
    setSavingJournal(false);
  };

  const areaProgress = (areaId: LearningAreaId) => {
    const lessons = learningLessons.filter((lesson) => lesson.areaId === areaId);
    const completed = lessons.filter((lesson) => completedIds.has(lesson.id)).length;
    return { completed, total: lessons.length, percent: lessons.length ? Math.round((completed / lessons.length) * 100) : 0 };
  };

  const filteredLessons = useMemo(() => learningLessons.filter((lesson) => {
    const matchesArea = !selectedArea || lesson.areaId === selectedArea;
    const haystack = `${lesson.title} ${lesson.summary} ${learningAreaMeta[lesson.areaId].title}`.toLowerCase();
    return matchesArea && haystack.includes(librarySearch.trim().toLowerCase());
  }), [librarySearch, selectedArea]);

  const renderLesson = (lesson: LearningLesson) => (
    <article className="mx-auto max-w-3xl">
      <button type="button" onClick={() => setSelectedLesson(null)} className="inline-flex items-center gap-2 text-sm text-[#A9B5AA] hover:text-[#D9FF3D]"><ArrowLeft className="h-4 w-4" /> Back to lessons</button>
      <p className="mt-9 text-xs uppercase tracking-[0.18em] text-[#D9FF3D]">{learningAreaMeta[lesson.areaId].title} · {lesson.estimatedMinutes} minutes</p>
      <h1 className="mt-3 font-display text-4xl leading-tight text-[#F6FFF2] sm:text-6xl">{lesson.title}</h1>
      <p className="mt-4 text-lg leading-8 text-[#A9B5AA]">{lesson.summary}</p>
      <div className="mt-9 space-y-5">
        <section className="rounded-3xl border border-[#2A312A] bg-[#111611] p-6 sm:p-8">
          <p className="text-xs uppercase tracking-[0.16em] text-[#6E776E]">Shared foundation</p>
          <p className="mt-4 text-lg leading-8 text-[#E8F2E8]">{lesson.sharedFoundation}</p>
        </section>
        <section className="rounded-3xl border border-[#D9FF3D]/25 bg-[#D9FF3D]/5 p-6 sm:p-8">
          <p className="text-xs uppercase tracking-[0.16em] text-[#D9FF3D]">{perspective} perspective</p>
          <p className="mt-4 text-lg leading-8 text-[#E8F2E8]">{lesson.perspective[perspective]}</p>
          <button type="button" onClick={() => changePerspective(perspective === 'female' ? 'male' : 'female')} className="mt-5 text-sm font-medium text-[#D9FF3D]">View the other perspective →</button>
        </section>
        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-3xl border border-[#2A312A] bg-[#111611] p-6"><p className="text-xs uppercase tracking-[0.16em] text-[#6E776E]">Reflect</p><p className="mt-3 leading-7 text-[#DDE8DD]">{lesson.reflectionPrompt}</p></div>
          <div className="rounded-3xl border border-[#2A312A] bg-[#111611] p-6"><p className="text-xs uppercase tracking-[0.16em] text-[#6E776E]">Practice</p><p className="mt-3 leading-7 text-[#DDE8DD]">{lesson.actionStep}</p></div>
        </section>
      </div>
      <div className="mt-7 flex flex-wrap gap-3">
        <button type="button" onClick={() => completeLesson(lesson)} className="inline-flex items-center gap-2 rounded-full bg-[#D9FF3D] px-5 py-3 text-sm font-semibold text-[#0B0F0C]"><Check className="h-4 w-4" /> {completedIds.has(lesson.id) ? 'Completed' : 'Mark complete'}</button>
        <button type="button" onClick={() => toggleSaved(lesson.id)} className="inline-flex items-center gap-2 rounded-full border border-[#2A312A] px-5 py-3 text-sm text-[#A9B5AA]"><Bookmark className={`h-4 w-4 ${savedIds.includes(lesson.id) ? 'fill-[#D9FF3D] text-[#D9FF3D]' : ''}`} /> {savedIds.includes(lesson.id) ? 'Saved' : 'Save lesson'}</button>
      </div>
    </article>
  );

  const renderHome = () => (
    <div className="space-y-9">
      <section className="rounded-[30px] border border-[#2A312A] bg-[radial-gradient(circle_at_86%_18%,rgba(217,255,61,.14),transparent_32%),#111611] p-7 sm:p-9">
        <p className="text-sm text-[#A9B5AA]">Welcome back, {currentUser?.name?.split(' ')[0] || 'there'}</p>
        <h1 className="mt-2 max-w-3xl font-display text-4xl leading-tight sm:text-6xl">What would help you grow today?</h1>
        <p className="mt-4 max-w-2xl leading-7 text-[#A9B5AA]">Choose any learning area. Your place is saved, and you can change perspectives whenever you want.</p>
      </section>
      <section className="grid gap-4 md:grid-cols-2">
        {(Object.keys(learningAreaMeta) as LearningAreaId[]).map((areaId) => {
          const Icon = areaIcons[areaId];
          const stats = areaProgress(areaId);
          return <button key={areaId} type="button" onClick={() => { setSelectedArea(areaId); navigate('learning-library'); setSelectedArea(areaId); }} className="rounded-3xl border border-[#2A312A] bg-[#111611] p-6 text-left transition hover:border-[#D9FF3D]/35"><div className="flex items-start justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#D9FF3D]/10 text-[#D9FF3D]"><Icon className="h-5 w-5" /></span><span className="text-xs text-[#6E776E]">{stats.total} lessons</span></div><h2 className="mt-7 font-display text-2xl">{learningAreaMeta[areaId].title}</h2><p className="mt-2 text-sm leading-6 text-[#A9B5AA]">{learningAreaMeta[areaId].description}</p><div className="mt-5 h-1.5 rounded-full bg-[#293029]"><div className="h-full rounded-full bg-[#D9FF3D]" style={{ width: `${stats.percent}%` }} /></div><p className="mt-2 text-xs text-[#7F8B80]">{stats.completed} of {stats.total} complete</p></button>;
        })}
      </section>
      {lastViewedLesson && <button type="button" onClick={() => { setCurrentView('learning-library'); void openLesson(lastViewedLesson); }} className="w-full rounded-3xl border border-[#D9FF3D]/20 bg-[#111611] p-6 text-left"><p className="text-xs uppercase tracking-[0.16em] text-[#D9FF3D]">Continue learning</p><h2 className="mt-3 font-display text-2xl">{lastViewedLesson.title}</h2><span className="mt-4 inline-flex items-center gap-2 text-sm text-[#A9B5AA]">Open lesson <ArrowRight className="h-4 w-4 text-[#D9FF3D]" /></span></button>}
    </div>
  );

  const renderLibrary = () => selectedLesson ? renderLesson(selectedLesson) : (
    <div>
      <p className="text-xs uppercase tracking-[0.18em] text-[#D9FF3D]">Learn what you need, when you need it</p>
      <h1 className="mt-2 font-display text-4xl sm:text-6xl">The Learning Library</h1>
      <div className="mt-7 flex items-center gap-3 rounded-2xl border border-[#2A312A] bg-[#111611] px-4 py-3"><Search className="h-5 w-5 text-[#6E776E]" /><input value={librarySearch} onChange={(event) => setLibrarySearch(event.target.value)} className="w-full bg-transparent outline-none placeholder:text-[#5F6A60]" placeholder="Search lessons..." /></div>
      <div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => setSelectedArea(null)} className={`rounded-full px-4 py-2 text-xs ${!selectedArea ? 'bg-[#D9FF3D] text-[#0B0F0C]' : 'border border-[#2A312A] text-[#A9B5AA]'}`}>All areas</button>{(Object.keys(learningAreaMeta) as LearningAreaId[]).map((areaId) => <button key={areaId} type="button" onClick={() => setSelectedArea(areaId)} className={`rounded-full px-4 py-2 text-xs ${selectedArea === areaId ? 'bg-[#D9FF3D] text-[#0B0F0C]' : 'border border-[#2A312A] text-[#A9B5AA]'}`}>{learningAreaMeta[areaId].title}</button>)}</div>
      <div className="mt-8 grid gap-4 md:grid-cols-2">{filteredLessons.map((lesson) => <button key={lesson.id} type="button" onClick={() => void openLesson(lesson)} className="rounded-3xl border border-[#2A312A] bg-[#111611] p-6 text-left transition hover:border-[#D9FF3D]/35"><div className="flex items-center justify-between text-xs text-[#6E776E]"><span>{learningAreaMeta[lesson.areaId].title}</span><span>{lesson.estimatedMinutes} min</span></div><h2 className="mt-5 font-display text-2xl">{lesson.title}</h2><p className="mt-2 text-sm leading-6 text-[#A9B5AA]">{lesson.summary}</p><div className="mt-5 flex items-center gap-2 text-xs text-[#D9FF3D]">{completedIds.has(lesson.id) && <CheckCircle2 className="h-4 w-4" />}{completedIds.has(lesson.id) ? 'Completed' : 'Open lesson'}</div></button>)}</div>
    </div>
  );

  const renderAsk = () => {
    const filtered = approvedQuestions.filter((item) => `${item.question} ${item.answer}`.toLowerCase().includes(questionSearch.toLowerCase()));
    return <div><p className="text-xs uppercase tracking-[0.18em] text-[#D9FF3D]">Trusted answers. No public advice threads.</p><h1 className="mt-2 font-display text-4xl sm:text-6xl">Ask Rooted Hearts</h1><p className="mt-4 max-w-2xl leading-7 text-[#A9B5AA]">Search approved answers or privately send a question for review.</p><div className="mt-8 flex items-center gap-3 rounded-2xl border border-[#2A312A] bg-[#111611] px-4 py-3"><Search className="h-5 w-5 text-[#6E776E]" /><input value={questionSearch} onChange={(event) => setQuestionSearch(event.target.value)} className="w-full bg-transparent outline-none placeholder:text-[#5F6A60]" placeholder="Search boundaries, communication, trust..." /></div><div className="mt-6 grid gap-5 lg:grid-cols-[1fr_.75fr]"><section className="space-y-3">{filtered.map((item) => <button key={item.id} type="button" onClick={() => setSelectedQuestionId(selectedQuestionId === item.id ? null : item.id)} className="w-full rounded-2xl border border-[#2A312A] bg-[#111611] p-5 text-left"><div className="flex justify-between gap-4"><span className="leading-6">{item.question}</span><ChevronDown className={`h-4 w-4 shrink-0 text-[#D9FF3D] transition ${selectedQuestionId === item.id ? 'rotate-180' : ''}`} /></div>{selectedQuestionId === item.id && <p className="mt-4 border-t border-[#2A312A] pt-4 text-sm leading-7 text-[#A9B5AA]">{item.answer}</p>}</button>)}</section><section className="h-fit rounded-3xl border border-[#D9FF3D]/20 bg-[#111611] p-6"><h2 className="font-display text-2xl">Submit a question</h2><p className="mt-2 text-sm leading-6 text-[#A9B5AA]">Only Rooted Hearts can publish an answer. Identifying details will be removed.</p><textarea value={question} onChange={(event) => setQuestion(event.target.value)} className="mt-5 min-h-32 w-full resize-none rounded-2xl border border-[#2A312A] bg-[#0B0F0C] p-4 text-sm outline-none focus:border-[#D9FF3D]/50" placeholder="What would you like help understanding?" /><button type="button" disabled={question.trim().length < 10 || submittingQuestion} onClick={() => void submitQuestion()} className="mt-3 w-full rounded-full bg-[#D9FF3D] px-5 py-3 text-sm font-semibold text-[#0B0F0C] disabled:opacity-40">{submittingQuestion ? 'Submitting…' : 'Submit privately'}</button></section></div></div>;
  };

  const renderSaved = () => {
    const lessons = learningLessons.filter((lesson) => savedIds.includes(lesson.id));
    return <div><h1 className="font-display text-4xl sm:text-6xl">Saved lessons</h1><p className="mt-4 text-[#A9B5AA]">Keep useful guidance close without changing your learning order.</p><div className="mt-8 grid gap-4 md:grid-cols-2">{lessons.length ? lessons.map((lesson) => <button key={lesson.id} type="button" onClick={() => { setCurrentView('learning-library'); void openLesson(lesson); }} className="rounded-3xl border border-[#2A312A] bg-[#111611] p-6 text-left"><p className="text-xs text-[#D9FF3D]">{learningAreaMeta[lesson.areaId].title}</p><h2 className="mt-3 font-display text-2xl">{lesson.title}</h2><p className="mt-2 text-sm leading-6 text-[#A9B5AA]">{lesson.summary}</p></button>) : <div className="rounded-3xl border border-dashed border-[#2A312A] p-8 text-[#7F8B80]">Save any lesson and it will appear here.</div>}</div></div>;
  };

  const renderJournal = () => <div><p className="text-xs uppercase tracking-[0.18em] text-[#D9FF3D]">Private to your account</p><h1 className="mt-2 font-display text-4xl sm:text-6xl">Journal</h1><div className="mt-8 grid gap-6 lg:grid-cols-[.8fr_1.2fr]"><section className="h-fit rounded-3xl border border-[#D9FF3D]/20 bg-[#111611] p-6"><input value={journalTitle} onChange={(event) => setJournalTitle(event.target.value)} className="w-full rounded-xl border border-[#2A312A] bg-[#0B0F0C] px-4 py-3 text-sm outline-none" placeholder="Reflection title" /><textarea value={journalContent} onChange={(event) => setJournalContent(event.target.value)} className="mt-3 min-h-44 w-full resize-none rounded-xl border border-[#2A312A] bg-[#0B0F0C] p-4 text-sm outline-none focus:border-[#D9FF3D]/50" placeholder="Write what you are noticing..." /><button type="button" disabled={!journalContent.trim() || savingJournal} onClick={() => void saveJournalEntry()} className="mt-3 w-full rounded-full bg-[#D9FF3D] px-5 py-3 text-sm font-semibold text-[#0B0F0C] disabled:opacity-40">{savingJournal ? 'Saving…' : 'Save reflection'}</button></section><section className="space-y-3">{journalEntries.length ? journalEntries.map((entry) => <article key={entry.id} className="rounded-2xl border border-[#2A312A] bg-[#111611] p-5"><div className="flex justify-between gap-4"><h2 className="font-medium">{entry.title || 'Reflection'}</h2><time className="text-xs text-[#6E776E]">{new Date(entry.created_at).toLocaleDateString()}</time></div><p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#A9B5AA]">{entry.content}</p></article>) : <div className="rounded-3xl border border-dashed border-[#2A312A] p-8 text-[#7F8B80]">Your private reflections will appear here.</div>}</section></div></div>;

  const renderProgress = () => <div><h1 className="font-display text-4xl sm:text-6xl">My progress</h1><p className="mt-4 text-[#A9B5AA]">Progress helps you return—it never controls what you can open.</p><div className="mt-8 grid gap-4 md:grid-cols-2">{(Object.keys(learningAreaMeta) as LearningAreaId[]).map((areaId) => { const stats = areaProgress(areaId); return <section key={areaId} className="rounded-3xl border border-[#2A312A] bg-[#111611] p-6"><p className="font-display text-2xl">{learningAreaMeta[areaId].title}</p><p className="mt-2 text-sm text-[#7F8B80]">{stats.completed} of {stats.total} complete</p><div className="mt-5 h-2 rounded-full bg-[#293029]"><div className="h-full rounded-full bg-[#D9FF3D]" style={{ width: `${stats.percent}%` }} /></div><p className="mt-3 text-right text-sm text-[#D9FF3D]">{stats.percent}%</p></section>; })}</div></div>;

  const renderCurrent = () => {
    if (activeView === 'home') return renderHome();
    if (activeView === 'learning-library') return renderLibrary();
    if (activeView === 'ask-rooted-hearts') return renderAsk();
    if (activeView === 'saved-content') return renderSaved();
    if (activeView === 'journal') return renderJournal();
    return renderProgress();
  };

  return <div className="rh-page-background min-h-screen text-[#F6FFF2]"><header className="sticky top-0 z-40 border-b border-[#1A211A] bg-[#0B0F0C]/95 backdrop-blur"><div className="mx-auto flex max-w-[1500px] items-center justify-between px-4 py-4 sm:px-7"><div className="flex items-center gap-3"><button type="button" onClick={() => setMobileNavOpen(true)} className="rounded-xl border border-[#2A312A] p-2.5 text-[#A9B5AA] lg:hidden" aria-label="Open navigation"><Menu className="h-5 w-5" /></button><BrandLogo imageClassName="w-[96px] sm:w-[110px]" /></div><div className="flex items-center gap-2"><label className="relative"><span className="sr-only">Viewing perspective</span><select value={perspective} onChange={(event) => changePerspective(event.target.value as LearningPerspective)} className="appearance-none rounded-full border border-[#2A312A] bg-[#111611] py-2.5 pl-4 pr-10 text-xs font-medium text-[#D9FF3D] outline-none sm:text-sm"><option value="female">Female perspective</option><option value="male">Male perspective</option></select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6E776E]" /></label><button type="button" onClick={() => navigate('user-settings')} className="rounded-full border border-[#2A312A] p-2.5 text-[#A9B5AA]" aria-label="Account settings"><Settings className="h-4 w-4" /></button></div></div></header><div className="mx-auto flex max-w-[1500px]"><aside className="hidden min-h-[calc(100vh-77px)] w-64 shrink-0 border-r border-[#1A211A] px-4 py-7 lg:block"><nav className="space-y-1">{navItems.map((item) => { const Icon = item.icon; const active = item.view === activeView; return <button key={item.view} type="button" onClick={() => navigate(item.view)} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm ${active ? 'bg-[#D9FF3D] font-semibold text-[#0B0F0C]' : 'text-[#A9B5AA] hover:bg-[#111611]'}`}><Icon className="h-4 w-4" />{item.label}</button>; })}</nav></aside><main className="min-w-0 flex-1 px-4 py-8 sm:px-8 sm:py-10 lg:px-10">{renderCurrent()}</main></div>{mobileNavOpen && <div className="fixed inset-0 z-50 bg-black/70 lg:hidden" onClick={() => setMobileNavOpen(false)}><aside className="h-full w-[84%] max-w-sm bg-[#0B0F0C] p-5" onClick={(event) => event.stopPropagation()}><div className="mb-8 flex items-center justify-between"><BrandLogo imageClassName="w-[104px]" /><button type="button" onClick={() => setMobileNavOpen(false)}><X className="h-5 w-5" /></button></div><nav className="space-y-1">{navItems.map((item) => { const Icon = item.icon; return <button key={item.view} type="button" onClick={() => navigate(item.view)} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm ${item.view === activeView ? 'bg-[#D9FF3D] font-semibold text-[#0B0F0C]' : 'text-[#A9B5AA]'}`}><Icon className="h-4 w-4" />{item.label}</button>; })}</nav></aside></div>}</div>;
};

export default LearningPlatformSection;
