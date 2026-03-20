import React, { useState } from 'react';
import { Send, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { FOREST_KNOWLEDGE_BASE, FOREST_STARTER_PROMPTS } from '@/data/forestKnowledgeBase';
import { askForest, type ForestResponse } from '@/services/forestRagService';

const ForestFloatingAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState<ForestResponse | null>(null);

  const handleAskForest = (questionOverride?: string) => {
    const nextQuestion = (questionOverride ?? question).trim();
    if (!nextQuestion) return;

    setQuestion(nextQuestion);
    setResponse(askForest(nextQuestion));
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="fixed bottom-6 right-6 z-[115] flex items-center gap-2 rounded-full border border-[#D9FF3D]/50 bg-[#0B0F0C] px-4 py-2 text-[#D9FF3D] shadow-lg shadow-black/30 hover:bg-[#121A12] transition-colors"
          aria-label="Open Forest"
          title="Open Forest"
        >
          <Sparkles className="w-4 h-4" />
          <span className="text-sm font-semibold">Forest</span>
        </button>
      </DialogTrigger>

      <DialogContent
        overlayClassName="bg-[#0B0F0C]/75 backdrop-blur-sm"
        className="max-w-3xl border border-[#D9FF3D]/30 bg-[#111611] p-0 text-[#F6FFF2]"
      >
        <DialogHeader className="border-b border-[#1A211A] px-5 py-5 pr-12">
          <div className="flex items-center gap-2 text-[#D9FF3D]">
            <Sparkles className="h-4 w-4" />
            <p className="text-xs font-semibold uppercase tracking-[0.18em]">
              Forest, Objective Spiritual Observer
            </p>
          </div>
          <DialogTitle className="font-display text-3xl text-[#F6FFF2]">Forest</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-[#A9B5AA]">
            Forest is available from this icon on every user page. He stays grounded in The
            Standard, The Detox, and Self-Awareness instead of giving generic advice.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[80vh] overflow-y-auto px-5 py-5 space-y-5">
          <div className="rounded-2xl border border-[#1A211A] bg-[#0B0F0C] p-4">
            <p className="text-xs uppercase tracking-wide text-[#A9B5AA]">Forest&apos;s Lane</p>
            <p className="mt-2 text-sm leading-relaxed text-[#F6FFF2]">
              Forest only answers from the local knowledge base. If a question falls outside of it,
              he redirects users back to the 333/777 rules and the 3 Layers instead of guessing.
            </p>
          </div>

          <div className="rounded-2xl border border-[#D9FF3D]/20 bg-[#0B0F0C] p-4">
            <p className="text-xs uppercase tracking-wide text-[#A9B5AA]">Ask Forest</p>
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              rows={4}
              placeholder="Ask about covenant, counterfeits, chemistry, peace, or whether something feels Spirit-led..."
              className="mt-3 w-full rounded-xl border border-[#1A211A] bg-[#111611] px-4 py-3 text-sm text-[#F6FFF2] placeholder:text-[#738073] focus:border-[#D9FF3D] focus:outline-none resize-none"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {FOREST_STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt.label}
                  type="button"
                  onClick={() => handleAskForest(prompt.question)}
                  className="rounded-full border border-[#2A312A] px-3 py-1.5 text-xs font-medium text-[#A9B5AA] hover:border-[#D9FF3D]/40 hover:text-[#F6FFF2] transition"
                >
                  {prompt.label}
                </button>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => handleAskForest()}
                className="inline-flex items-center gap-2 rounded-full bg-[#D9FF3D] px-4 py-2 text-sm font-semibold text-[#0B0F0C] hover:brightness-95 transition"
              >
                <Send className="h-4 w-4" />
                Ask Forest
              </button>
            </div>
          </div>

          {response ? (
            <div className="rounded-2xl border border-[#D9FF3D]/20 bg-[#0B0F0C] p-4">
              <p className="text-xs uppercase tracking-wide text-[#A9B5AA]">
                {response.redirectUsed ? 'Redirect' : 'Forest Response'}
              </p>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-[#F6FFF2]">
                {response.answer}
              </p>

              {response.matches.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs uppercase tracking-wide text-[#A9B5AA]">Grounded In</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {response.matches.map((match) => (
                      <span
                        key={`${match.category}-${match.topic}`}
                        className="rounded-full border border-[#D9FF3D]/25 px-3 py-1 text-xs font-medium text-[#D9FF3D]"
                      >
                        {match.category} - {match.topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-3">
              {FOREST_KNOWLEDGE_BASE.map((entry) => (
                <button
                  key={`${entry.category}-${entry.topic}`}
                  type="button"
                  onClick={() => handleAskForest(entry.topic)}
                  className="rounded-2xl border border-[#1A211A] bg-[#0B0F0C] p-4 text-left hover:border-[#D9FF3D]/40 transition"
                >
                  <p className="text-xs uppercase tracking-wide text-[#A9B5AA]">{entry.category}</p>
                  <h3 className="mt-2 text-lg font-semibold text-[#F6FFF2]">{entry.topic}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#A9B5AA]">{entry.content}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ForestFloatingAssistant;
