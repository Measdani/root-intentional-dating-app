import React, { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trash2, Edit2, Plus, Save, X } from 'lucide-react';
import { useAdmin } from '@/store/AdminContext';
import type { AssessmentQuestion } from '@/types';
import { resolveAssessmentOptionStyle } from '@/services/assessmentStyleService';

const QUESTION_CATEGORIES: AssessmentQuestion['category'][] = [
  'emotional-regulation',
  'accountability',
  'autonomy',
  'boundaries',
  'conflict-repair',
  'integrity-check',
];

const createDefaultQuestion = (): AssessmentQuestion => ({
  id: `q${Date.now()}`,
  category: 'emotional-regulation',
  question: 'New assessment question',
  options: [
    { text: 'Oak answer', score: 10, style: 'oak' },
    { text: 'Willow answer', score: 9, style: 'willow' },
    { text: 'Fern answer', score: 8, style: 'fern' },
    { text: 'Gardener answer', score: 9, style: 'gardener' },
    { text: 'Wildflower answer', score: 7, style: 'wildflower' },
  ],
});

const AdminAssessmentsSection: React.FC = () => {
  const {
    assessmentQuestions,
    addAssessmentQuestion,
    updateAssessmentQuestion,
    removeAssessmentQuestion,
  } = useAdmin();

  const [passThreshold, setPassThreshold] = useState(() => {
    const saved = localStorage.getItem('rooted-assessment-pass-threshold');
    const parsed = saved ? Number(saved) : 85;
    return Number.isFinite(parsed) ? parsed : 85;
  });
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [draftQuestion, setDraftQuestion] = useState<AssessmentQuestion | null>(null);

  const questions = useMemo(() => assessmentQuestions || [], [assessmentQuestions]);

  const handleAddQuestion = () => {
    const newQuestion = createDefaultQuestion();
    addAssessmentQuestion(newQuestion);
    setEditingQuestionId(newQuestion.id);
    setDraftQuestion(newQuestion);
    toast.success('New assessment question added.');
  };

  const handleStartEdit = (question: AssessmentQuestion) => {
    setEditingQuestionId(question.id);
    setDraftQuestion(JSON.parse(JSON.stringify(question)));
  };

  const handleCancelEdit = () => {
    setEditingQuestionId(null);
    setDraftQuestion(null);
  };

  const handleSaveEdit = () => {
    if (!draftQuestion) return;
    const trimmedQuestion = draftQuestion.question.trim();
    if (!trimmedQuestion) {
      toast.error('Question text is required.');
      return;
    }

    const normalizedOptions = draftQuestion.options
      .map((option) => ({
        ...option,
        text: option.text.trim(),
        score: Number.isFinite(option.score) ? option.score : 0,
      }))
      .filter((option) => option.text.length > 0);

    if (normalizedOptions.length < 2) {
      toast.error('At least 2 non-empty options are required.');
      return;
    }

    updateAssessmentQuestion(draftQuestion.id, {
      ...draftQuestion,
      question: trimmedQuestion,
      options: normalizedOptions,
    });

    setEditingQuestionId(null);
    setDraftQuestion(null);
    toast.success('Assessment question updated.');
  };

  const handleDeleteQuestion = (questionId: string) => {
    if (!window.confirm('Delete this assessment question?')) return;
    removeAssessmentQuestion(questionId);
    if (editingQuestionId === questionId) {
      setEditingQuestionId(null);
      setDraftQuestion(null);
    }
    toast.success('Assessment question deleted.');
  };

  const updateDraftOption = (
    index: number,
    key: 'text' | 'score' | 'redFlag',
    value: string | number | boolean
  ) => {
    setDraftQuestion((previous) => {
      if (!previous) return previous;
      const nextOptions = previous.options.map((option, optionIndex) => {
        if (optionIndex !== index) return option;
        if (key === 'text') return { ...option, text: String(value) };
        if (key === 'score') {
          const nextScore = Number(value);
          return {
            ...option,
            score: nextScore,
            style: resolveAssessmentOptionStyle(nextScore, option.redFlag),
          };
        }
        const nextRedFlag = Boolean(value);
        return {
          ...option,
          redFlag: nextRedFlag,
          style: resolveAssessmentOptionStyle(option.score, nextRedFlag),
        };
      });
      return { ...previous, options: nextOptions };
    });
  };

  const handleAddOption = () => {
    setDraftQuestion((previous) => {
      if (!previous) return previous;
      return {
        ...previous,
        options: [
          ...previous.options,
          { text: '', score: 0, style: resolveAssessmentOptionStyle(0, false) },
        ],
      };
    });
  };

  const handleRemoveOption = (index: number) => {
    setDraftQuestion((previous) => {
      if (!previous) return previous;
      if (previous.options.length <= 2) {
        toast.error('A question must keep at least 2 options.');
        return previous;
      }
      return {
        ...previous,
        options: previous.options.filter((_, optionIndex) => optionIndex !== index),
      };
    });
  };

  const handleSaveThreshold = () => {
    localStorage.setItem('rooted-assessment-pass-threshold', String(passThreshold));
    toast.success(`Pass threshold updated to ${passThreshold}%.`);
  };

  return (
    <div className="min-h-screen bg-[#0B0F0C] p-4 md:p-8">
      <Tabs defaultValue="questions" className="space-y-6">
        <TabsList className="bg-[#111611] border-[#1A211A] p-1">
          <TabsTrigger value="questions">Questions</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
        </TabsList>

        <TabsContent value="questions" className="space-y-4">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-display font-bold text-[#F6FFF2]">
              Assessment Questions ({questions.length})
            </h3>
            <Button onClick={handleAddQuestion} className="bg-[#D9FF3D] text-[#0B0F0C]">
              <Plus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </div>

          {questions.length === 0 ? (
            <Card className="bg-[#111611] border-[#1A211A] p-6 text-sm text-[#A9B5AA]">
              No assessment questions found. Add one to get started.
            </Card>
          ) : (
            <div className="space-y-4">
              {questions.map((question, idx) => {
                const isEditing = editingQuestionId === question.id && draftQuestion?.id === question.id;
                const renderedQuestion = isEditing ? draftQuestion : question;

                return (
                  <Card key={question.id} className="bg-[#111611] border-[#1A211A] p-6">
                    <div className="flex justify-between items-start mb-4 gap-3">
                      {!isEditing ? (
                        <div>
                          <p className="text-[#F6FFF2] font-medium">
                            {idx + 1}. {question.question}
                          </p>
                          <p className="text-xs text-[#A9B5AA] mt-1">
                            {question.category.replace('-', ' ')}
                          </p>
                        </div>
                      ) : (
                        <div className="w-full space-y-3">
                          <textarea
                            value={renderedQuestion?.question || ''}
                            onChange={(event) =>
                              setDraftQuestion((previous) =>
                                previous ? { ...previous, question: event.target.value } : previous
                              )
                            }
                            rows={2}
                            className="w-full px-3 py-2 bg-[#0B0F0C] border border-[#1A211A] rounded-lg text-[#F6FFF2] resize-none"
                          />
                          <select
                            value={renderedQuestion?.category || 'emotional-regulation'}
                            onChange={(event) =>
                              setDraftQuestion((previous) =>
                                previous
                                  ? {
                                      ...previous,
                                      category: event.target.value as AssessmentQuestion['category'],
                                    }
                                  : previous
                              )
                            }
                            className="w-full px-3 py-2 bg-[#0B0F0C] border border-[#1A211A] rounded-lg text-[#F6FFF2]"
                          >
                            {QUESTION_CATEGORIES.map((category) => (
                              <option key={category} value={category}>
                                {category.replace('-', ' ')}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div className="flex gap-2">
                        {!isEditing ? (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-[#D9FF3D]"
                              onClick={() => handleStartEdit(question)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-400"
                              onClick={() => handleDeleteQuestion(question.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button size="sm" className="bg-[#D9FF3D] text-[#0B0F0C]" onClick={handleSaveEdit}>
                              <Save className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-[#A9B5AA]" onClick={handleCancelEdit}>
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      {(renderedQuestion?.options || []).map((option, optionIndex) => (
                        <div key={optionIndex} className="p-2 bg-[#0B0F0C] rounded border border-[#1A211A]">
                          {!isEditing ? (
                            <div className="flex items-center gap-3">
                              <div className="flex-1">
                                <p className="text-sm text-[#F6FFF2]">{option.text}</p>
                              </div>
                              <span className="text-xs text-[#A9B5AA]">
                                {option.score}/10 {option.style || resolveAssessmentOptionStyle(option.score, option.redFlag)}
                              </span>
                            </div>
                          ) : (
                            <div className="grid md:grid-cols-[1fr_80px_100px_40px] gap-2 items-center">
                              <input
                                type="text"
                                value={option.text}
                                onChange={(event) =>
                                  updateDraftOption(optionIndex, 'text', event.target.value)
                                }
                                className="px-3 py-2 bg-[#111611] border border-[#1A211A] rounded text-[#F6FFF2]"
                              />
                              <input
                                type="number"
                                min={0}
                                max={10}
                                value={option.score}
                                onChange={(event) =>
                                  updateDraftOption(optionIndex, 'score', Number(event.target.value))
                                }
                                className="px-3 py-2 bg-[#111611] border border-[#1A211A] rounded text-[#F6FFF2]"
                              />
                              <label className="flex items-center gap-2 text-xs text-[#A9B5AA]">
                                <input
                                  type="checkbox"
                                  checked={Boolean(option.redFlag)}
                                  onChange={(event) =>
                                    updateDraftOption(optionIndex, 'redFlag', event.target.checked)
                                  }
                                  className="accent-[#D9FF3D]"
                                />
                                Red flag
                              </label>
                              <button
                                onClick={() => handleRemoveOption(optionIndex)}
                                className="text-red-400 hover:text-red-300"
                                title="Remove option"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {isEditing && (
                      <Button
                        variant="ghost"
                        className="mt-3 text-[#D9FF3D]"
                        onClick={handleAddOption}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add option
                      </Button>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="settings">
          <Card className="bg-[#111611] border-[#1A211A] p-6">
            <h3 className="text-lg font-display font-bold text-[#F6FFF2] mb-6">Scoring Configuration</h3>
            <label className="block text-sm text-[#F6FFF2] mb-3">Pass Threshold: {passThreshold}%</label>
            <input
              type="range"
              min="50"
              max="100"
              value={passThreshold}
              onChange={(event) => setPassThreshold(parseInt(event.target.value, 10))}
              className="w-full accent-[#D9FF3D]"
            />
            <p className="text-xs text-[#A9B5AA] mt-3">
              Users need {passThreshold}% to pass the assessment.
            </p>
            <Button
              onClick={handleSaveThreshold}
              className="w-full mt-6 bg-[#D9FF3D] text-[#0B0F0C]"
            >
              Save Settings
            </Button>
          </Card>
        </TabsContent>

        <TabsContent value="stats">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-[#111611] border-[#1A211A] p-4">
              <p className="text-xs text-[#A9B5AA]">Total Questions</p>
              <p className="text-2xl font-bold text-[#F6FFF2]">{questions.length}</p>
            </Card>
            <Card className="bg-[#111611] border-[#1A211A] p-4">
              <p className="text-xs text-[#A9B5AA]">Red Flag Options</p>
              <p className="text-2xl font-bold text-[#D9FF3D]">
                {questions.reduce(
                  (count, question) => count + question.options.filter((option) => option.redFlag).length,
                  0
                )}
              </p>
            </Card>
            <Card className="bg-[#111611] border-[#1A211A] p-4">
              <p className="text-xs text-[#A9B5AA]">Avg Options / Q</p>
              <p className="text-2xl font-bold text-[#F6FFF2]">
                {questions.length > 0
                  ? (questions.reduce((sum, question) => sum + question.options.length, 0) / questions.length).toFixed(1)
                  : '0.0'}
              </p>
            </Card>
            <Card className="bg-[#111611] border-[#1A211A] p-4">
              <p className="text-xs text-[#A9B5AA]">Pass Threshold</p>
              <p className="text-2xl font-bold text-[#F6FFF2]">{passThreshold}%</p>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminAssessmentsSection;
