import React, { useEffect, useRef, useState } from 'react';
import { Send, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  askForest,
  getForestMatchLabel,
  type ForestResponse,
} from '@/services/forestRagService';
import { logForestUnmatchedQuery } from '@/services/forestTelemetryService';
import { FOREST_SYSTEM_PROMPT } from '@/data/forestKnowledgeBase';

const ForestFloatingAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState<ForestResponse | null>(null);
  const [isLoadingResponse, setIsLoadingResponse] = useState(false);
  const activeRequestRef = useRef(0);

  useEffect(() => {
    const handleOpenForest = () => setIsOpen(true);
    window.addEventListener('open-forest-assistant', handleOpenForest);
    return () => window.removeEventListener('open-forest-assistant', handleOpenForest);
  }, []);

  const handleAskForest = async (questionOverride?: string) => {
    const nextQuestion = (questionOverride ?? question).trim();
    if (!nextQuestion) return;

    const requestId = activeRequestRef.current + 1;
    activeRequestRef.current = requestId;
    setQuestion('');
    setResponse(null);
    setIsLoadingResponse(true);

    try {
      const nextResponse = await askForest(nextQuestion);
      if (activeRequestRef.current !== requestId) return;
      setResponse(nextResponse);

      void logForestUnmatchedQuery({
        question: nextQuestion,
        response: nextResponse,
        pageContext: `${window.location.pathname}${window.location.search}${window.location.hash}`,
      });
    } catch (error) {
      if (activeRequestRef.current !== requestId) return;
      console.warn('Forest ask failed:', error);
      setResponse({
        rawQuestion: nextQuestion,
        answer:
          'Forest hit a temporary issue while checking the knowledge base. Reword your question and try again in a moment.',
        matches: [],
        redirectUsed: true,
        systemPrompt: FOREST_SYSTEM_PROMPT,
        uncertainty: {
          confidence: 0,
          label: 'low',
          reason: 'Forest could not complete the lookup, so it returned a safe fallback.',
          directTerms: [],
          rejectedTopics: [],
        },
      });
    } finally {
      if (activeRequestRef.current === requestId) {
        setIsLoadingResponse(false);
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-full border border-[#D9FF3D]/50 bg-[#0B0F0C] px-4 py-2 text-[#D9FF3D] shadow-lg shadow-black/30 transition-colors hover:bg-[#121A12]"
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
            <p className="text-xs font-semibold uppercase tracking-[0.18em]">Objective Spiritual Observer</p>
          </div>
          <DialogTitle className="font-display text-3xl text-[#F6FFF2]">Forest</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-[#A9B5AA]">
            Forest is available from this icon on every user page. He reads from the Rooted Hearts
            doctrine, the Intentional Path, the Alignment Path, and published resource blogs so the
            guidance stays grounded in what is actually inside the app.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[80vh] overflow-y-auto px-5 py-5 space-y-5">
          <div className="rounded-2xl border border-[#D9FF3D]/20 bg-[#0B0F0C] p-4">
            <textarea
              value={question}
              onChange={(event) => {
                setQuestion(event.target.value);
                if (!isLoadingResponse && response) {
                  setResponse(null);
                }
              }}
              rows={4}
              placeholder="Ask what pattern you are seeing, what behavior means, or which resource area you want Forest to search..."
              className="mt-3 w-full rounded-xl border border-[#1A211A] bg-[#111611] px-4 py-3 text-sm text-[#F6FFF2] placeholder:text-[#738073] focus:border-[#D9FF3D] focus:outline-none resize-none"
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void handleAskForest();
                }
              }}
            />
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => void handleAskForest()}
                disabled={isLoadingResponse}
                className="inline-flex items-center gap-2 rounded-full bg-[#D9FF3D] px-4 py-2 text-sm font-semibold text-[#0B0F0C] hover:brightness-95 transition disabled:cursor-not-allowed disabled:opacity-70"
              >
                <Send className="h-4 w-4" />
                {isLoadingResponse ? 'Forest Is Reading...' : 'Ask Forest'}
              </button>
            </div>
          </div>

          {isLoadingResponse ? (
            <div className="rounded-2xl border border-[#D9FF3D]/20 bg-[#0B0F0C] p-4">
              <p className="text-xs uppercase tracking-wide text-[#A9B5AA]">Forest Response</p>
              <p className="mt-3 text-sm leading-relaxed text-[#F6FFF2]">
                Forest is reading the knowledge base and grounding your question now.
              </p>
            </div>
          ) : response ? (
            <div className="rounded-2xl border border-[#D9FF3D]/20 bg-[#0B0F0C] p-4">
              <p className="text-xs uppercase tracking-wide text-[#A9B5AA]">
                {response.redirectUsed ? 'Need More Detail' : 'Forest Response'}
              </p>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-[#F6FFF2]">
                {response.answer}
              </p>

              {response.matches.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs uppercase tracking-wide text-[#A9B5AA]">
                    {response.redirectUsed ? 'Closest Grounded Topics' : 'Grounded In'}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {response.matches.map((match) => (
                      <span
                        key={`${match.category}-${match.topic}`}
                        className="rounded-full border border-[#D9FF3D]/25 px-3 py-1 text-xs font-medium text-[#D9FF3D]"
                      >
                        {getForestMatchLabel(match)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ForestFloatingAssistant;
