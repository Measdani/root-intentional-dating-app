import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, CheckCircle2, CircleHelp, Edit3, Eye, Plus, Save, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { learningAreaMeta, learningLessons as starterLessons } from '@/data/learningLibrary';
import { adminLearningService, type MemberQuestionReview } from '@/services/adminLearningService';
import type { LearningAreaId, LearningLesson } from '@/types/learning';

type EditableLesson = LearningLesson & { published: boolean };

const emptyLesson = (): EditableLesson => ({
  id: '', areaId: 'know-yourself', title: '', summary: '', estimatedMinutes: 8,
  sharedFoundation: '', perspective: { female: '', male: '' }, reflectionPrompt: '',
  actionStep: '', order: 1, published: false,
});

const AdminLearningSection: React.FC = () => {
  const [tab, setTab] = useState<'lessons' | 'questions'>('lessons');
  const [lessons, setLessons] = useState<EditableLesson[]>([]);
  const [questions, setQuestions] = useState<MemberQuestionReview[]>([]);
  const [lessonForm, setLessonForm] = useState<EditableLesson | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<MemberQuestionReview | null>(null);
  const [saving, setSaving] = useState(false);
  const [areaFilter, setAreaFilter] = useState<LearningAreaId | 'all'>('all');
  const [previewPerspective, setPreviewPerspective] = useState<'female' | 'male'>('female');

  useEffect(() => {
    void adminLearningService.getLessons(starterLessons).then(setLessons);
    void adminLearningService.getQuestions().then(setQuestions);
  }, []);

  const submittedCount = useMemo(() => questions.filter((question) => question.status === 'submitted').length, [questions]);
  const publishedCount = useMemo(() => lessons.filter((lesson) => lesson.published).length, [lessons]);
  const draftCount = lessons.length - publishedCount;
  const visibleLessons = useMemo(
    () => lessons
      .filter((lesson) => areaFilter === 'all' || lesson.areaId === areaFilter)
      .sort((a, b) => a.areaId.localeCompare(b.areaId) || a.order - b.order),
    [areaFilter, lessons],
  );

  const saveLesson = async (publish?: boolean) => {
    if (!lessonForm?.title.trim() || !lessonForm.sharedFoundation.trim()) {
      toast.error('Add a title and shared foundation before saving.');
      return;
    }
    const shouldPublish = publish ?? lessonForm.published;
    if (shouldPublish && (!lessonForm.summary.trim() || !lessonForm.perspective.female.trim() || !lessonForm.perspective.male.trim() || !lessonForm.reflectionPrompt.trim() || !lessonForm.actionStep.trim())) {
      toast.error('Complete every lesson section before publishing. You can save an incomplete lesson as a draft.');
      return;
    }
    const id = lessonForm.id || lessonForm.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const normalized = { ...lessonForm, id, title: lessonForm.title.trim(), published: shouldPublish };
    setSaving(true);
    await adminLearningService.saveLesson(normalized, normalized.published);
    setLessons((items) => [normalized, ...items.filter((item) => item.id !== id)]);
    setLessonForm(null);
    setSaving(false);
    toast.success(normalized.published ? 'Lesson saved and published.' : 'Lesson saved as a draft.');
  };

  const removeLesson = async (lesson: EditableLesson) => {
    if (!window.confirm(`Delete “${lesson.title}”?`)) return;
    await adminLearningService.deleteLesson(lesson.id);
    setLessons((items) => items.filter((item) => item.id !== lesson.id));
    toast.success('Lesson deleted.');
  };

  const saveQuestionReview = async () => {
    if (!selectedQuestion) return;
    if (selectedQuestion.publishToLibrary && (!selectedQuestion.anonymizedQuestion?.trim() || !selectedQuestion.answer?.trim() || !selectedQuestion.areaId)) {
      toast.error('Add an anonymized question, answer, and learning area before publishing.');
      return;
    }
    setSaving(true);
    await adminLearningService.reviewQuestion(selectedQuestion);
    setQuestions((items) => [selectedQuestion, ...items.filter((item) => item.id !== selectedQuestion.id)]);
    setSaving(false);
    toast.success(selectedQuestion.publishToLibrary ? 'Answer published to the member library.' : 'Question review saved privately.');
  };

  return (
    <div className="p-5 text-[#F6FFF2] sm:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-xs uppercase tracking-[0.18em] text-[#D9FF3D]">Editorial control</p><h1 className="mt-2 font-display text-4xl">Learning Content</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[#A9B5AA]">Create the lessons members see and answer submitted questions without opening public advice threads.</p></div>
        {tab === 'lessons' && <button type="button" onClick={() => setLessonForm(emptyLesson())} className="inline-flex items-center justify-center gap-2 rounded-full bg-[#D9FF3D] px-5 py-3 text-sm font-semibold text-[#0B0F0C]"><Plus className="h-4 w-4" /> New lesson</button>}
      </div>

      <div className="mt-8 flex gap-2 border-b border-[#2A312A]">
        <button type="button" onClick={() => setTab('lessons')} className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm ${tab === 'lessons' ? 'border-[#D9FF3D] text-[#D9FF3D]' : 'border-transparent text-[#7F8B80]'}`}><BookOpen className="h-4 w-4" /> Lessons</button>
        <button type="button" onClick={() => setTab('questions')} className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm ${tab === 'questions' ? 'border-[#D9FF3D] text-[#D9FF3D]' : 'border-transparent text-[#7F8B80]'}`}><CircleHelp className="h-4 w-4" /> Questions {submittedCount > 0 && <span className="rounded-full bg-[#D9FF3D] px-2 py-0.5 text-[10px] font-bold text-[#0B0F0C]">{submittedCount}</span>}</button>
      </div>

      {tab === 'lessons' ? (
        <div className="mt-6">
          <section className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-[#2A312A] bg-[#111611] p-5"><p className="text-xs uppercase tracking-[0.14em] text-[#7F8B80]">All lessons</p><p className="mt-2 font-display text-3xl">{lessons.length}</p></div>
            <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/5 p-5"><p className="text-xs uppercase tracking-[0.14em] text-emerald-300">Live for members</p><p className="mt-2 font-display text-3xl">{publishedCount}</p></div>
            <div className="rounded-2xl border border-amber-400/15 bg-amber-400/5 p-5"><p className="text-xs uppercase tracking-[0.14em] text-amber-300">Private drafts</p><p className="mt-2 font-display text-3xl">{draftCount}</p></div>
          </section>
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" onClick={() => setAreaFilter('all')} className={`rounded-full px-4 py-2 text-xs ${areaFilter === 'all' ? 'bg-[#D9FF3D] text-[#0B0F0C]' : 'border border-[#2A312A] text-[#A9B5AA]'}`}>All areas</button>
            {(Object.keys(learningAreaMeta) as LearningAreaId[]).map((areaId) => <button key={areaId} type="button" onClick={() => setAreaFilter(areaId)} className={`rounded-full px-4 py-2 text-xs ${areaFilter === areaId ? 'bg-[#D9FF3D] text-[#0B0F0C]' : 'border border-[#2A312A] text-[#A9B5AA]'}`}>{learningAreaMeta[areaId].title}</button>)}
          </div>
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {visibleLessons.map((lesson) => <article key={lesson.id} className="rounded-2xl border border-[#2A312A] bg-[#111611] p-5"><div className="flex items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><span className="text-xs text-[#D9FF3D]">{learningAreaMeta[lesson.areaId].title} · Lesson {lesson.order}</span><span className={`rounded-full px-2 py-0.5 text-[10px] ${lesson.published ? 'bg-emerald-400/10 text-emerald-300' : 'bg-amber-400/10 text-amber-300'}`}>{lesson.published ? 'Published' : 'Draft'}</span></div><h2 className="mt-3 font-display text-2xl">{lesson.title}</h2><p className="mt-2 text-sm leading-6 text-[#A9B5AA]">{lesson.summary || 'No summary added yet.'}</p></div><div className="flex gap-1"><button type="button" onClick={() => { setLessonForm(lesson); setPreviewPerspective('female'); }} className="rounded-lg p-2 text-[#A9B5AA] hover:bg-[#1A211A] hover:text-[#D9FF3D]" aria-label={`Edit ${lesson.title}`}><Edit3 className="h-4 w-4" /></button><button type="button" onClick={() => void removeLesson(lesson)} className="rounded-lg p-2 text-[#A9B5AA] hover:bg-red-500/10 hover:text-red-300" aria-label={`Delete ${lesson.title}`}><Trash2 className="h-4 w-4" /></button></div></div></article>)}
          </div>
        </div>
      ) : (
        <div className="mt-6 grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
          <section className="space-y-3">{questions.length ? questions.map((item) => <button key={item.id} type="button" onClick={() => setSelectedQuestion(item)} className={`w-full rounded-2xl border p-5 text-left ${selectedQuestion?.id === item.id ? 'border-[#D9FF3D]/50 bg-[#D9FF3D]/5' : 'border-[#2A312A] bg-[#111611]'}`}><div className="flex items-center justify-between gap-3"><span className="text-[10px] uppercase tracking-[0.14em] text-[#7F8B80]">{item.viewingPerspective} perspective</span><span className="text-xs capitalize text-[#D9FF3D]">{item.status}</span></div><p className="mt-3 text-sm leading-6">{item.question}</p></button>) : <div className="rounded-2xl border border-dashed border-[#2A312A] p-7 text-sm text-[#7F8B80]">No member questions have been submitted yet.</div>}</section>
          <section>{selectedQuestion ? <div className="rounded-3xl border border-[#2A312A] bg-[#111611] p-6"><div className="flex justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.14em] text-[#6E776E]">Original private question</p><p className="mt-3 leading-7">{selectedQuestion.question}</p></div><button type="button" onClick={() => setSelectedQuestion(null)} className="h-fit p-1 text-[#7F8B80]"><X className="h-5 w-5" /></button></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="text-sm text-[#A9B5AA]">Status<select value={selectedQuestion.status} onChange={(event) => setSelectedQuestion({ ...selectedQuestion, status: event.target.value as MemberQuestionReview['status'] })} className="mt-2 w-full rounded-xl border border-[#2A312A] bg-[#0B0F0C] px-3 py-3 text-[#F6FFF2]"><option value="submitted">Submitted</option><option value="reviewing">Reviewing</option><option value="answered">Answered</option><option value="declined">Declined</option></select></label><label className="text-sm text-[#A9B5AA]">Learning area<select value={selectedQuestion.areaId || ''} onChange={(event) => setSelectedQuestion({ ...selectedQuestion, areaId: event.target.value as LearningAreaId })} className="mt-2 w-full rounded-xl border border-[#2A312A] bg-[#0B0F0C] px-3 py-3 text-[#F6FFF2]"><option value="">Choose area</option>{(Object.keys(learningAreaMeta) as LearningAreaId[]).map((areaId) => <option key={areaId} value={areaId}>{learningAreaMeta[areaId].title}</option>)}</select></label></div><label className="mt-5 block text-sm text-[#A9B5AA]">Anonymized question<textarea value={selectedQuestion.anonymizedQuestion || ''} onChange={(event) => setSelectedQuestion({ ...selectedQuestion, anonymizedQuestion: event.target.value })} className="mt-2 min-h-24 w-full rounded-xl border border-[#2A312A] bg-[#0B0F0C] p-4 text-[#F6FFF2] outline-none focus:border-[#D9FF3D]/50" placeholder="Rewrite without names or identifying details." /></label><label className="mt-5 block text-sm text-[#A9B5AA]">Official Rooted Hearts answer<textarea value={selectedQuestion.answer || ''} onChange={(event) => setSelectedQuestion({ ...selectedQuestion, answer: event.target.value })} className="mt-2 min-h-40 w-full rounded-xl border border-[#2A312A] bg-[#0B0F0C] p-4 text-[#F6FFF2] outline-none focus:border-[#D9FF3D]/50" /></label><label className="mt-5 flex items-start gap-3 rounded-xl border border-[#D9FF3D]/15 bg-[#D9FF3D]/5 p-4 text-sm"><input type="checkbox" checked={selectedQuestion.publishToLibrary} onChange={(event) => setSelectedQuestion({ ...selectedQuestion, publishToLibrary: event.target.checked, status: event.target.checked ? 'answered' : selectedQuestion.status })} className="mt-1 accent-[#D9FF3D]" /><span><strong className="block">Publish anonymized answer</strong><span className="mt-1 block text-xs leading-5 text-[#7F8B80]">Members will see only the rewritten question and official answer—not the sender or original wording.</span></span></label><button type="button" onClick={() => void saveQuestionReview()} disabled={saving} className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#D9FF3D] px-5 py-3 text-sm font-semibold text-[#0B0F0C] disabled:opacity-50"><Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save review'}</button></div> : <div className="rounded-3xl border border-dashed border-[#2A312A] p-10 text-center text-[#7F8B80]"><CheckCircle2 className="mx-auto h-7 w-7" /><p className="mt-3 text-sm">Select a question to review it privately.</p></div>}</section>
        </div>
      )}

      {lessonForm && <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/75 p-4"><div className="mx-auto my-5 max-w-3xl rounded-3xl border border-[#2A312A] bg-[#111611] p-6 sm:p-8"><div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-[0.15em] text-[#D9FF3D]">Member lesson</p><h2 className="mt-1 font-display text-3xl">{lessonForm.id ? 'Edit lesson' : 'Create a new lesson'}</h2></div><button type="button" onClick={() => setLessonForm(null)} className="p-2 text-[#7F8B80]"><X className="h-5 w-5" /></button></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="text-sm text-[#A9B5AA]">Title<input value={lessonForm.title} onChange={(event) => setLessonForm({ ...lessonForm, title: event.target.value })} className="mt-2 w-full rounded-xl border border-[#2A312A] bg-[#0B0F0C] px-4 py-3 text-[#F6FFF2]" /></label><label className="text-sm text-[#A9B5AA]">Learning area<select value={lessonForm.areaId} onChange={(event) => setLessonForm({ ...lessonForm, areaId: event.target.value as LearningAreaId })} className="mt-2 w-full rounded-xl border border-[#2A312A] bg-[#0B0F0C] px-4 py-3 text-[#F6FFF2]">{(Object.keys(learningAreaMeta) as LearningAreaId[]).map((areaId) => <option key={areaId} value={areaId}>{learningAreaMeta[areaId].title}</option>)}</select></label><label className="text-sm text-[#A9B5AA]">Minutes<input type="number" min="1" value={lessonForm.estimatedMinutes} onChange={(event) => setLessonForm({ ...lessonForm, estimatedMinutes: Number(event.target.value) })} className="mt-2 w-full rounded-xl border border-[#2A312A] bg-[#0B0F0C] px-4 py-3 text-[#F6FFF2]" /></label><label className="text-sm text-[#A9B5AA]">Lesson order<input type="number" min="1" value={lessonForm.order} onChange={(event) => setLessonForm({ ...lessonForm, order: Number(event.target.value) })} className="mt-2 w-full rounded-xl border border-[#2A312A] bg-[#0B0F0C] px-4 py-3 text-[#F6FFF2]" /></label></div>{([['summary','Short description shown on the lesson card'],['sharedFoundation','Shared lesson foundation'],['female','Female perspective'],['male','Male perspective'],['reflectionPrompt','Reflection question'],['actionStep','Practice or action step']] as const).map(([field, label]) => <label key={field} className="mt-4 block text-sm text-[#A9B5AA]">{label}<textarea value={field === 'female' || field === 'male' ? lessonForm.perspective[field] : lessonForm[field]} onChange={(event) => field === 'female' || field === 'male' ? setLessonForm({ ...lessonForm, perspective: { ...lessonForm.perspective, [field]: event.target.value } }) : setLessonForm({ ...lessonForm, [field]: event.target.value })} className="mt-2 min-h-24 w-full rounded-xl border border-[#2A312A] bg-[#0B0F0C] p-4 text-[#F6FFF2] outline-none focus:border-[#D9FF3D]/50" /></label>)}<div className="mt-6 rounded-2xl border border-[#D9FF3D]/15 bg-[#D9FF3D]/5 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><p className="inline-flex items-center gap-2 text-sm font-semibold"><Eye className="h-4 w-4 text-[#D9FF3D]" /> Perspective preview</p><div className="flex rounded-full border border-[#2A312A] p-1"><button type="button" onClick={() => setPreviewPerspective('female')} className={`rounded-full px-3 py-1.5 text-xs ${previewPerspective === 'female' ? 'bg-[#D9FF3D] text-[#0B0F0C]' : 'text-[#A9B5AA]'}`}>Female</button><button type="button" onClick={() => setPreviewPerspective('male')} className={`rounded-full px-3 py-1.5 text-xs ${previewPerspective === 'male' ? 'bg-[#D9FF3D] text-[#0B0F0C]' : 'text-[#A9B5AA]'}`}>Male</button></div></div><p className="mt-4 text-sm leading-7 text-[#DDE8DD]">{lessonForm.perspective[previewPerspective] || `The ${previewPerspective} perspective will appear here as you write it.`}</p></div><div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" onClick={() => void saveLesson(false)} disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-full border border-[#3A443A] px-6 py-3 font-semibold text-[#DDE8DD] disabled:opacity-50"><Save className="h-4 w-4" /> Save draft</button><button type="button" onClick={() => void saveLesson(true)} disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-full bg-[#D9FF3D] px-6 py-3 font-semibold text-[#0B0F0C] disabled:opacity-50"><CheckCircle2 className="h-4 w-4" /> {saving ? 'Saving…' : 'Publish lesson'}</button></div><p className="mt-3 text-center text-xs text-[#6E776E]">Drafts stay private. Published lessons appear in the member library.</p></div></div>}
    </div>
  );
};

export default AdminLearningSection;
