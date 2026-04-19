import React, { useMemo, useState } from 'react';
import type { User, UserInteraction } from '@/types';
import {
  buildForestTempCheckReflection,
  VALUE_DEEP_DIVE_OPTIONS,
  createInitialMilestones,
  type MilestoneAction,
} from '@/services/relationshipMilestoneService';

interface RelationshipMilestonesPanelProps {
  conversation: UserInteraction;
  currentUser: User;
  otherUser: User;
  onApplyAction: (conversationId: string, action: MilestoneAction) => void;
  onOpenResources: () => void;
}

const RelationshipMilestonesPanel: React.FC<RelationshipMilestonesPanelProps> = ({
  conversation,
  currentUser,
  otherUser,
  onApplyAction,
  onOpenResources,
}) => {
  const milestones = conversation.milestones ?? createInitialMilestones();
  const [dragItem, setDragItem] = useState<string | null>(null);
  const [selectedRoundOptionId, setSelectedRoundOptionId] = useState('');
  const [oppositePromptResponse, setOppositePromptResponse] = useState('');
  const [mirrorInput, setMirrorInput] = useState('');
  const [valueSelections, setValueSelections] = useState<string[]>([]);
  const [tempCheck, setTempCheck] = useState({ feelsHeard: 7, goalsAligned: 7, readiness: 7 });
  const [finalCheck, setFinalCheck] = useState({ feelsHeard: 7, goalsAligned: 7, readiness: 7 });
  const [roleTab, setRoleTab] = useState<'cautious' | 'eager'>('cautious');
  const [cautiousForm, setCautiousForm] = useState({
    idealPace: 5,
    worries: '',
    safestEnvironment: '',
  });
  const [eagerForm, setEagerForm] = useState({
    connectionPull: '',
    fearOfWaiting: '',
    lowRiskMeeting: '',
  });
  const [bridge, setBridge] = useState({
    sweetSpot: 6,
    compromise: '',
  });
  const [dateOfferForm, setDateOfferForm] = useState({
    title: '',
    location: '',
    dateTime: '',
    durationMinutes: 60,
    safetyNotes: '',
  });

  const participants = useMemo(
    () => [conversation.fromUserId, conversation.toUserId] as const,
    [conversation.fromUserId, conversation.toUserId]
  );
  const myPicks = milestones.sharedVibe.picksByUser[currentUser.id] ?? [];
  const otherPicks = milestones.sharedVibe.picksByUser[otherUser.id] ?? [];
  const sharedItems = milestones.sharedVibe.sharedItems;
  const canUnlockTruthDare = myPicks.length >= 3 && otherPicks.length >= 3;

  const oppositePromptResponsesByUser = useMemo(() => {
    const byCurrent = milestones.truthOrDare.responses.filter((item) => item.userId === currentUser.id);
    const byOther = milestones.truthOrDare.responses.filter((item) => item.userId === otherUser.id);
    return { byCurrent, byOther };
  }, [milestones.truthOrDare.responses, currentUser.id, otherUser.id]);
  const oppositePromptProgress = useMemo(() => {
    return milestones.truthOrDare.rounds.map((round) => {
      const responses = milestones.truthOrDare.responses.filter((item) => item.roundId === round.id);
      const myResponse = responses.find((item) => item.userId === currentUser.id) ?? null;
      const otherResponse = responses.find((item) => item.userId === otherUser.id) ?? null;
      const myOption = myResponse
        ? round.options.find((option) => option.id === myResponse.optionId) ?? null
        : null;
      const otherOption = otherResponse
        ? round.options.find((option) => option.id === otherResponse.optionId) ?? null
        : null;

      return {
        round,
        myResponse,
        otherResponse,
        myOption,
        otherOption,
        isComplete: participants.every((userId) => responses.some((item) => item.userId === userId)),
      };
    });
  }, [milestones.truthOrDare.responses, milestones.truthOrDare.rounds, currentUser.id, otherUser.id, participants]);
  const myTruthDareResponseCount = oppositePromptResponsesByUser.byCurrent.length;
  const truthOrDareComplete = oppositePromptProgress.length > 0 && oppositePromptProgress.every((entry) => entry.isComplete);
  const currentOppositePrompt = oppositePromptProgress.find((entry) => !entry.isComplete) ?? null;
  const completedOppositePrompts = oppositePromptProgress.filter((entry) => entry.isComplete);
  const forcedAssignedOption = currentOppositePrompt?.otherOption
    ? currentOppositePrompt.round.options.find((option) => option.id !== currentOppositePrompt.otherOption?.id) ?? null
    : null;
  const effectiveSelectedRoundOptionId = currentOppositePrompt?.myResponse?.optionId
    ?? forcedAssignedOption?.id
    ?? (currentOppositePrompt?.round.options.some((option) => option.id === selectedRoundOptionId) ? selectedRoundOptionId : '');
  const selectedRoundOption = currentOppositePrompt?.round.options.find((option) => option.id === effectiveSelectedRoundOptionId) ?? null;
  const currentRoundNumber = currentOppositePrompt
    ? oppositePromptProgress.findIndex((entry) => entry.round.id === currentOppositePrompt.round.id) + 1
    : oppositePromptProgress.length;
  const canSubmitOppositePrompt = Boolean(
    currentOppositePrompt &&
    !currentOppositePrompt.myResponse &&
    selectedRoundOption &&
    oppositePromptResponse.trim().length >= 10
  );
  const oppositePromptPlaceholder = selectedRoundOption?.responseKind === 'ask'
    ? 'Type the question you want to ask your partner...'
    : 'Share your answer here...';

  const myTempCheck = milestones.tempCheck.answers.find((item) => item.userId === currentUser.id);
  const otherTempCheck = milestones.tempCheck.answers.find((item) => item.userId === otherUser.id);
  const myMirror = milestones.mirror.responsesByUser[currentUser.id] ?? '';
  const otherMirror = milestones.mirror.responsesByUser[otherUser.id] ?? '';
  const myValuePicks = milestones.valueDeepDive.picksByUser[currentUser.id] ?? [];
  const otherValuePicks = milestones.valueDeepDive.picksByUser[otherUser.id] ?? [];
  const myBridge = milestones.rhythmRisk.bridgeByUser[currentUser.id];
  const otherBridge = milestones.rhythmRisk.bridgeByUser[otherUser.id];
  const myFinalCheck = milestones.finalCheck.answers.find((item) => item.userId === currentUser.id);
  const otherFinalCheck = milestones.finalCheck.answers.find((item) => item.userId === otherUser.id);
  const dateOffer = milestones.dateOffer ?? {
    status: 'not-started' as const,
    responsesByUser: {},
  };
  const myDateOfferResponse = dateOffer.responsesByUser[currentUser.id] ?? 'pending';
  const otherDateOfferResponse = dateOffer.responsesByUser[otherUser.id] ?? 'pending';
  const canDraftDateOffer = !dateOffer.proposal || dateOffer.status === 'declined';

  const myRole: 'cautious' | 'eager' | undefined = milestones.rhythmRisk.cautiousUserId === currentUser.id
    ? 'cautious'
    : milestones.rhythmRisk.eagerUserId === currentUser.id
      ? 'eager'
      : undefined;

  const bridgeProgressComplete = milestones.mirror.revealed &&
    participants.every((userId) => Boolean(milestones.valueDeepDive.picksByUser[userId]?.length));
  const forestTempCheckReflection = useMemo(() => {
    if (milestones.stage !== 'temp-check') return null;
    return buildForestTempCheckReflection({
      milestones,
      currentUser: { id: currentUser.id, name: currentUser.name },
      otherUser: { id: otherUser.id, name: otherUser.name },
    });
  }, [milestones, currentUser.id, currentUser.name, otherUser.id, otherUser.name]);

  const pushAction = (action: MilestoneAction) => {
    onApplyAction(conversation.conversationId, action);
  };

  const formatDateTime = (value: string): string => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleString();
  };

  const toggleVibeCard = (item: string) => {
    pushAction({
      type: 'toggle-vibe-card',
      userId: currentUser.id,
      item,
    });
  };

  const filteredAvailableCards = milestones.sharedVibe.catalog.filter((item) => !myPicks.includes(item));

  const handleDropCard = () => {
    if (!dragItem) return;
    toggleVibeCard(dragItem);
    setDragItem(null);
  };

  const submitTruthDare = () => {
    if (!currentOppositePrompt || !selectedRoundOption || oppositePromptResponse.trim().length < 10) return;
    pushAction({
      type: 'submit-opposite-prompt',
      userId: currentUser.id,
      roundId: currentOppositePrompt.round.id,
      optionId: selectedRoundOption.id,
      response: oppositePromptResponse.trim(),
    });
    setOppositePromptResponse('');
    setSelectedRoundOptionId('');
  };

  const submitTempCheck = () => {
    pushAction({
      type: 'submit-temp-check',
      userId: currentUser.id,
      feelsHeard: tempCheck.feelsHeard,
      goalsAligned: tempCheck.goalsAligned,
      readiness: tempCheck.readiness,
    });
  };

  const submitMirror = () => {
    if (mirrorInput.trim().length < 8) return;
    pushAction({
      type: 'submit-mirror',
      userId: currentUser.id,
      reflection: mirrorInput.trim(),
    });
    setMirrorInput('');
  };

  const toggleValueSelection = (option: string) => {
    const has = valueSelections.includes(option);
    if (has) {
      setValueSelections((prev) => prev.filter((item) => item !== option));
      return;
    }
    if (valueSelections.length >= 3) return;
    setValueSelections((prev) => [...prev, option]);
  };

  const submitValueDeepDive = () => {
    if (valueSelections.length === 0) return;
    pushAction({
      type: 'submit-value-deep-dive',
      userId: currentUser.id,
      picks: valueSelections,
    });
  };

  const submitRoleProfile = () => {
    if (roleTab === 'cautious') {
      pushAction({
        type: 'submit-risk-rhythm-profile',
        userId: currentUser.id,
        role: 'cautious',
        idealPace: cautiousForm.idealPace,
        worries: cautiousForm.worries,
        safestEnvironment: cautiousForm.safestEnvironment,
      });
      return;
    }
    pushAction({
      type: 'submit-risk-rhythm-profile',
      userId: currentUser.id,
      role: 'eager',
      connectionPull: eagerForm.connectionPull,
      fearOfWaiting: eagerForm.fearOfWaiting,
      lowRiskMeeting: eagerForm.lowRiskMeeting,
    });
  };

  const submitBridge = () => {
    if (bridge.compromise.trim().length < 8) return;
    pushAction({
      type: 'submit-bridge',
      userId: currentUser.id,
      sweetSpot: bridge.sweetSpot,
      compromise: bridge.compromise.trim(),
    });
  };

  const submitFinalCheck = () => {
    pushAction({
      type: 'submit-final-check',
      userId: currentUser.id,
      feelsHeard: finalCheck.feelsHeard,
      goalsAligned: finalCheck.goalsAligned,
      readiness: finalCheck.readiness,
    });
  };

  const submitDateOfferProposal = () => {
    if (!dateOfferForm.title.trim() || !dateOfferForm.location.trim() || !dateOfferForm.dateTime.trim()) return;
    pushAction({
      type: 'propose-date-offer',
      userId: currentUser.id,
      title: dateOfferForm.title.trim(),
      location: dateOfferForm.location.trim(),
      dateTime: dateOfferForm.dateTime.trim(),
      durationMinutes: dateOfferForm.durationMinutes,
      safetyNotes: (dateOfferForm.safetyNotes || milestones.rhythmRisk.safetyPlan || '').trim(),
    });
  };

  const respondToDateOffer = (response: 'accepted' | 'declined') => {
    pushAction({
      type: 'respond-date-offer',
      userId: currentUser.id,
      response,
    });
  };

  const showSharedVibe = milestones.stage === 'shared-vibe';
  const showTruthOrDare = milestones.stage === 'truth-or-dare';
  const showTempCheck = ['temp-check', 'bridge', 'final-check', 'date-offer', 'resource-path'].includes(milestones.stage);
  const showBridge = ['bridge', 'final-check', 'date-offer', 'resource-path'].includes(milestones.stage);
  const showFinalCheck = ['final-check', 'date-offer', 'resource-path'].includes(milestones.stage);
  const stageToStepIndex: Record<string, number> = {
    'shared-vibe': 0,
    'truth-or-dare': 1,
    'temp-check': 2,
    'bridge': 3,
    'final-check': 3,
    'date-offer': 4,
    'resource-path': 4,
  };
  const stepLabels = ['Shared Vibe', 'Root / Reveal', 'Temp Check', 'Bridge', 'Decision'];
  const currentStepIndex = stageToStepIndex[milestones.stage] ?? 0;
  const currentStepLabel = stepLabels[currentStepIndex] ?? 'Shared Vibe';
  const stageTitleMap: Record<string, string> = {
    'shared-vibe': 'Shared Vibe',
    'truth-or-dare': 'Root / Reveal',
    'temp-check': 'Temp Check',
    'bridge': 'Bridge Activities',
    'final-check': 'Final Check-In',
    'date-offer': 'Date Offer',
    'resource-path': 'Guided Resources',
  };
  const isCurrentUserReadyForHandoff = milestones.stage === 'shared-vibe'
    ? myPicks.length >= 3
    : milestones.stage === 'truth-or-dare'
      ? milestones.truthOrDare.rounds.every((round) => (
          milestones.truthOrDare.responses.some((item) => item.roundId === round.id && item.userId === currentUser.id)
        ))
      : true;
  const stageHandoff = milestones.handoff && milestones.handoff.fromStage === milestones.stage
    ? milestones.handoff
    : null;
  const fallbackHandoff = !stageHandoff && isCurrentUserReadyForHandoff && milestones.stage === 'shared-vibe'
    ? {
        fromStage: 'shared-vibe' as const,
        toStage: 'truth-or-dare' as const,
        unlockedAt: milestones.updatedAt,
        choicesByUser: {},
      }
    : !stageHandoff && isCurrentUserReadyForHandoff && milestones.stage === 'truth-or-dare'
      ? {
          fromStage: 'truth-or-dare' as const,
          toStage: 'temp-check' as const,
          unlockedAt: milestones.updatedAt,
          choicesByUser: {},
        }
      : null;
  const activeHandoff = isCurrentUserReadyForHandoff ? (stageHandoff ?? fallbackHandoff) : null;
  const myHandoffChoice = stageHandoff?.choicesByUser[currentUser.id];
  const otherHandoffChoice = stageHandoff?.choicesByUser[otherUser.id];
  const nextStageLabel = activeHandoff ? stageTitleMap[activeHandoff.toStage] ?? activeHandoff.toStage : '';
  const getStepClassName = (stepIndex: number, isCompleted: boolean) => {
    if (stepIndex === currentStepIndex) {
      return 'border-[#D9FF3D] bg-[#D9FF3D]/12 text-[#D9FF3D] ring-1 ring-[#D9FF3D]/40';
    }
    if (isCompleted) {
      return 'border-green-500/40 bg-green-500/10 text-green-300';
    }
    return 'border-[#1A211A] text-[#A9B5AA]';
  };
  const setHandoffChoice = (choice: 'converse' | 'continue') => {
    pushAction({
      type: 'set-handoff-choice',
      userId: currentUser.id,
      choice,
    });
  };

  return (
    <section className="mt-8 rounded-2xl border border-[#1A211A] bg-[#111611] p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-xl text-[#F6FFF2]">Couple Milestones</h3>
          <p className="text-xs text-[#A9B5AA]">Build chemistry with structure before moving to date offers.</p>
        </div>
        <span className="text-xs uppercase tracking-wider text-[#D9FF3D]">{stageTitleMap[milestones.stage] ?? milestones.stage.replace(/-/g, ' ')}</span>
      </div>

      <div className="grid gap-2 text-xs md:grid-cols-5">
        <div className={`rounded-lg border px-3 py-2 ${getStepClassName(0, canUnlockTruthDare)}`}>Shared Vibe</div>
        <div className={`rounded-lg border px-3 py-2 ${getStepClassName(1, truthOrDareComplete)}`}>Root / Reveal</div>
        <div className={`rounded-lg border px-3 py-2 ${getStepClassName(2, milestones.tempCheck.outcome !== 'pending')}`}>Temp Check</div>
        <div className={`rounded-lg border px-3 py-2 ${getStepClassName(3, bridgeProgressComplete)}`}>Bridge</div>
        <div className={`rounded-lg border px-3 py-2 ${getStepClassName(4, milestones.stage === 'date-offer')}`}>Decision</div>
      </div>
      <p className="text-[11px] uppercase tracking-wider text-[#D9FF3D]">Current milestone: {currentStepLabel}</p>

      {milestones.stage === 'temp-check' && forestTempCheckReflection && (
        <div className="rounded-xl border border-[#D9FF3D]/30 bg-[#D9FF3D]/8 p-4">
          <p className="text-[11px] uppercase tracking-wider text-[#D9FF3D]">Forest's Read So Far</p>
          <p className="mt-3 whitespace-pre-line text-sm leading-6 text-[#F6FFF2]">{forestTempCheckReflection}</p>
        </div>
      )}

      {activeHandoff && (
        <div className="rounded-xl border border-[#D9FF3D]/40 bg-[#D9FF3D]/8 p-4 space-y-3">
          <p className="text-sm text-[#F6FFF2]">
            Before moving to <span className="text-[#D9FF3D]">{nextStageLabel}</span>, choose whether to keep reflecting in chat or continue now.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setHandoffChoice('converse')}
              className={`rounded-lg border px-3 py-1.5 text-xs ${
                myHandoffChoice === 'converse'
                  ? 'border-[#D9FF3D] bg-[#D9FF3D]/12 text-[#D9FF3D]'
                  : 'border-[#1A211A] text-[#A9B5AA]'
              }`}
            >
              Converse
            </button>
            <button
              onClick={() => setHandoffChoice('continue')}
              className={`rounded-lg border px-3 py-1.5 text-xs ${
                myHandoffChoice === 'continue'
                  ? 'border-green-500/50 bg-green-500/12 text-green-300'
                  : 'border-[#1A211A] text-[#A9B5AA]'
              }`}
            >
              Continue
            </button>
          </div>
          <p className="text-xs text-[#A9B5AA]">
            Your choice: <span className="text-[#F6FFF2]">{myHandoffChoice ?? 'not selected'}</span> • {otherUser.name}: <span className="text-[#F6FFF2]">{otherHandoffChoice ?? 'not selected'}</span>
          </p>
          <p className="text-xs text-[#6E7A6F]">
            The next milestone starts only after both of you choose <span className="text-green-300">Continue</span>.
          </p>
        </div>
      )}

      {showSharedVibe && (
        <div className="rounded-xl border border-[#1A211A] bg-[#0B0F0C]/70 p-4 space-y-4">
          <p className="text-sm text-[#F6FFF2]">{milestones.sharedVibe.prompt}</p>
          <p className="text-xs text-[#A9B5AA]">
            Pick cards that feel true to your ideal day. They do not need to match; the AI will read both styles and suggest date formats.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-wider text-[#A9B5AA]">Vibe Card Tray</p>
              <div className="flex flex-wrap gap-2">
                {filteredAvailableCards.map((item) => (
                  <button
                    key={item}
                    draggable
                    onDragStart={() => setDragItem(item)}
                    onClick={() => toggleVibeCard(item)}
                    className="rounded-full border border-[#1A211A] bg-[#111611] px-3 py-1.5 text-xs text-[#F6FFF2] hover:border-[#D9FF3D]"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                handleDropCard();
              }}
              className="rounded-xl border border-dashed border-[#D9FF3D]/40 bg-[#111611] p-3"
            >
              <p className="text-xs uppercase tracking-wider text-[#A9B5AA] mb-2">Your Canvas Picks</p>
              <div className="flex flex-wrap gap-2 min-h-10">
                {myPicks.length === 0 && (
                  <p className="text-xs text-[#6E7A6F]">Drag cards here (or tap cards) to build your Saturday plan.</p>
                )}
                {myPicks.map((item) => (
                  <button
                    key={item}
                    onClick={() => toggleVibeCard(item)}
                    className="rounded-full border border-[#D9FF3D]/40 bg-[#D9FF3D]/10 px-3 py-1.5 text-xs text-[#D9FF3D]"
                  >
                    {item} x
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-[#1A211A] bg-[#111611] px-3 py-3">
            <p className="text-xs text-[#A9B5AA] mb-2">Shared pins with {otherUser.name}</p>
            <div className="flex flex-wrap gap-2">
              {sharedItems.length === 0 && <p className="text-xs text-[#6E7A6F]">No shared items pinned yet.</p>}
              {sharedItems.map((item) => (
                <span key={item} className="rounded-full border border-green-500/40 bg-green-500/10 px-3 py-1.5 text-xs text-green-300">
                  {item}
                </span>
              ))}
            </div>
            <p className="mt-2 text-xs text-[#A9B5AA]">
              Progress to next stage: You {myPicks.length}/3 • {otherUser.name} {otherPicks.length}/3.
            </p>
            {canUnlockTruthDare && (
              <p className="mt-1 text-xs text-green-300">Both of you contributed enough signal. Root / Reveal is unlocked.</p>
            )}
          </div>

          {milestones.sharedVibe.summary && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-3 text-sm text-emerald-200">
              {milestones.sharedVibe.summary}
            </div>
          )}
        </div>
      )}

      {showTruthOrDare && (
        <div className="rounded-xl border border-[#1A211A] bg-[#0B0F0C]/70 p-4 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-medium text-[#F6FFF2]">Root / Reveal Rounds</h4>
              <p className="mt-1 text-xs text-[#A9B5AA]">
                Choose one side, answer it, and your partner automatically gets the opposite side.
              </p>
            </div>
            <p className="text-xs text-[#A9B5AA]">
              You: {myTruthDareResponseCount}/{milestones.truthOrDare.rounds.length} • {otherUser.name}: {oppositePromptResponsesByUser.byOther.length}/{milestones.truthOrDare.rounds.length}
            </p>
          </div>

          <div className="grid gap-2 md:grid-cols-5">
            {oppositePromptProgress.map((entry, index) => (
              <div
                key={entry.round.id}
                className={`rounded-lg border px-3 py-3 text-xs ${
                  entry.isComplete
                    ? 'border-green-500/40 bg-green-500/10 text-green-300'
                    : currentOppositePrompt?.round.id === entry.round.id
                      ? 'border-[#D9FF3D]/50 bg-[#D9FF3D]/10 text-[#F6FFF2]'
                      : 'border-[#1A211A] text-[#6E7A6F]'
                }`}
              >
                <p className="uppercase tracking-wider text-[10px]">Round {index + 1}</p>
                <p className="mt-1 font-medium">{entry.round.title}</p>
                <p className="mt-2 text-[11px]">
                  {entry.isComplete ? 'Complete' : currentOppositePrompt?.round.id === entry.round.id ? 'In progress' : 'Locked'}
                </p>
              </div>
            ))}
          </div>

          {currentOppositePrompt ? (
            <div className="rounded-lg border border-[#1A211A] bg-[#111611] p-4 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-[#D9FF3D]">Round {currentRoundNumber}</p>
                  <h5 className="mt-1 text-base font-medium text-[#F6FFF2]">{currentOppositePrompt.round.title}</h5>
                  <p className="mt-1 text-xs text-[#A9B5AA]">
                    Step 1 choose. Step 2 answer. Step 3 {otherUser.name} automatically gets the opposite prompt.
                  </p>
                </div>
                <span className="rounded-full border border-[#1A211A] px-3 py-1 text-[11px] text-[#A9B5AA]">
                  {currentOppositePrompt.myResponse
                    ? 'Waiting on partner'
                    : currentOppositePrompt.otherResponse
                      ? 'Opposite assigned'
                      : 'Choose a side'}
                </span>
              </div>

              {!currentOppositePrompt.myResponse && (
                <>
                  {currentOppositePrompt.otherResponse && forcedAssignedOption ? (
                    <div className="rounded-lg border border-[#D9FF3D]/30 bg-[#D9FF3D]/10 p-3 text-sm text-[#F6FFF2]">
                      {otherUser.name} answered <span className="text-[#D9FF3D]">{currentOppositePrompt.otherOption?.label}</span>.
                      Your prompt is automatically <span className="text-[#D9FF3D]">{forcedAssignedOption.label}</span>.
                    </div>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {currentOppositePrompt.round.options.map((option) => (
                        <button
                          key={option.id}
                          onClick={() => setSelectedRoundOptionId(option.id)}
                          className={`rounded-lg border px-3 py-3 text-left ${
                            effectiveSelectedRoundOptionId === option.id
                              ? 'border-[#D9FF3D] bg-[#D9FF3D]/10 text-[#F6FFF2]'
                              : 'border-[#1A211A] text-[#A9B5AA]'
                          }`}
                        >
                          <p className="text-[11px] uppercase tracking-wider">{option.label}</p>
                          <p className="mt-2 text-sm">{option.prompt}</p>
                        </button>
                      ))}
                    </div>
                  )}

                  {selectedRoundOption && (
                    <div className="rounded-lg border border-[#1A211A] bg-[#0B0F0C] p-3">
                      <p className="text-[11px] uppercase tracking-wider text-[#D9FF3D]">{selectedRoundOption.label}</p>
                      <p className="mt-2 text-sm text-[#F6FFF2]">{selectedRoundOption.prompt}</p>
                    </div>
                  )}

                  <textarea
                    value={oppositePromptResponse}
                    onChange={(event) => setOppositePromptResponse(event.target.value)}
                    rows={3}
                    placeholder={selectedRoundOption ? oppositePromptPlaceholder : 'Choose a side first...'}
                    className="w-full rounded-lg border border-[#1A211A] bg-[#0B0F0C] px-3 py-2 text-sm text-[#F6FFF2] placeholder:text-[#6E7A6F] focus:outline-none focus:border-[#D9FF3D]"
                  />
                  <button
                    onClick={submitTruthDare}
                    className="rounded-lg bg-[#D9FF3D] px-4 py-2 text-sm text-[#0B0F0C] font-medium disabled:opacity-50"
                    disabled={!canSubmitOppositePrompt}
                  >
                    {selectedRoundOption?.responseKind === 'ask' ? 'Send Question' : 'Submit Answer'}
                  </button>
                </>
              )}

              {currentOppositePrompt.myResponse && currentOppositePrompt.myOption && (
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 space-y-2">
                  <p className="text-[11px] uppercase tracking-wider text-emerald-200">
                    Your {currentOppositePrompt.myOption.responseKind === 'ask' ? 'question' : 'answer'}
                  </p>
                  <p className="text-sm text-[#F6FFF2]">
                    {currentOppositePrompt.myOption.label}: {currentOppositePrompt.myOption.prompt}
                  </p>
                  <p className="text-xs text-emerald-100">{currentOppositePrompt.myResponse.response}</p>
                </div>
              )}

              {currentOppositePrompt.otherResponse && currentOppositePrompt.otherOption && (
                <div className="rounded-lg border border-[#1A211A] bg-[#0B0F0C] p-3 space-y-2">
                  <p className="text-[11px] uppercase tracking-wider text-[#A9B5AA]">
                    {otherUser.name}'s {currentOppositePrompt.otherOption.responseKind === 'ask' ? 'question' : 'answer'}
                  </p>
                  <p className="text-sm text-[#F6FFF2]">
                    {currentOppositePrompt.otherOption.label}: {currentOppositePrompt.otherOption.prompt}
                  </p>
                  <p className="text-xs text-[#A9B5AA]">{currentOppositePrompt.otherResponse.response}</p>
                </div>
              )}

              {currentOppositePrompt.myResponse && !currentOppositePrompt.otherResponse && (
                <p className="text-xs text-[#A9B5AA]">
                  Waiting for {otherUser.name} to answer the opposite side before the next round unlocks.
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-green-500/40 bg-green-500/10 p-4 text-sm text-green-200">
              All five opposite-prompt rounds are complete. You can keep talking here or continue to Temp Check whenever you are both ready.
            </div>
          )}

          {completedOppositePrompts.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-wider text-[#A9B5AA]">Completed rounds</p>
              <div className="grid gap-3">
                {completedOppositePrompts.map((entry) => (
                  <div key={entry.round.id} className="rounded-lg border border-[#1A211A] bg-[#111611] p-3 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-[#D9FF3D]">
                          Round {oppositePromptProgress.findIndex((item) => item.round.id === entry.round.id) + 1}
                        </p>
                        <p className="mt-1 text-sm font-medium text-[#F6FFF2]">{entry.round.title}</p>
                      </div>
                      <span className="rounded-full border border-green-500/40 bg-green-500/10 px-3 py-1 text-[11px] text-green-300">
                        Complete
                      </span>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 space-y-2">
                        <p className="text-[11px] uppercase tracking-wider text-emerald-200">You</p>
                        <p className="text-sm text-[#F6FFF2]">{entry.myOption?.label}: {entry.myOption?.prompt}</p>
                        <p className="text-xs text-emerald-100">{entry.myResponse?.response}</p>
                      </div>
                      <div className="rounded-lg border border-[#1A211A] bg-[#0B0F0C] p-3 space-y-2">
                        <p className="text-[11px] uppercase tracking-wider text-[#A9B5AA]">{otherUser.name}</p>
                        <p className="text-sm text-[#F6FFF2]">{entry.otherOption?.label}: {entry.otherOption?.prompt}</p>
                        <p className="text-xs text-[#A9B5AA]">{entry.otherResponse?.response}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showTempCheck && (
        <div className="rounded-xl border border-[#1A211A] bg-[#0B0F0C]/70 p-4 space-y-4">
          <h4 className="text-sm font-medium text-[#F6FFF2]">Relationship Temp Check</h4>

          {!myTempCheck && (
            <div className="space-y-3">
              {[
                { key: 'feelsHeard', label: 'Do you feel heard and respected in this conversation?' },
                { key: 'goalsAligned', label: 'Are your long-term goals aligned enough to proceed?' },
                { key: 'readiness', label: 'How ready are you to meet this person in high-definition?' },
              ].map((question) => (
                <div key={question.key}>
                  <p className="text-xs text-[#A9B5AA] mb-1">{question.label}</p>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={tempCheck[question.key as keyof typeof tempCheck]}
                    onChange={(event) =>
                      setTempCheck((prev) => ({
                        ...prev,
                        [question.key]: Number(event.target.value),
                      }))
                    }
                    className="w-full"
                  />
                  <p className="text-xs text-[#6E7A6F]">
                    {tempCheck[question.key as keyof typeof tempCheck]}/10
                  </p>
                </div>
              ))}
              <button
                onClick={submitTempCheck}
                className="rounded-lg bg-[#D9FF3D] px-4 py-2 text-sm text-[#0B0F0C] font-medium"
              >
                Submit Temp Check
              </button>
            </div>
          )}

          {myTempCheck && (
            <p className="text-xs text-[#A9B5AA]">Your temp check is submitted. Waiting on {otherUser.name}...</p>
          )}

          {myTempCheck && otherTempCheck && milestones.tempCheck.outcome !== 'pending' && (
            <div className={`rounded-lg border px-3 py-3 text-sm ${
              milestones.tempCheck.outcome === 'aligned'
                ? 'border-green-500/40 bg-green-500/10 text-green-300'
                : 'border-amber-500/40 bg-amber-500/10 text-amber-200'
            }`}>
              {milestones.tempCheck.outcome === 'aligned'
                ? 'Both of you are at 7+ and aligned. Date Offer is unlocked.'
                : `There is a readiness gap around ${milestones.tempCheck.suggestedFocus ?? 'timing'}. The AI Wingman recommends bridge activities before meeting.`}
            </div>
          )}
        </div>
      )}

      {showBridge && (
        <div className="rounded-xl border border-[#1A211A] bg-[#0B0F0C]/70 p-4 space-y-4">
          <h4 className="text-sm font-medium text-[#F6FFF2]">Bridge Activities</h4>
          <div className="rounded-lg border border-[#1A211A] bg-[#111611] px-3 py-3 text-xs text-[#A9B5AA]">
            "Okay, let's hit pause on who wants what. We all know you like each other enough to be here. Let's look at this like a navigation problem: Rhythm and Risk."
          </div>

          <div className="space-y-2">
            <p className="text-xs text-[#A9B5AA]">The Mirror: What is one thing you have learned about {otherUser.name} so far?</p>
            {!myMirror && (
              <>
                <textarea
                  value={mirrorInput}
                  onChange={(event) => setMirrorInput(event.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-[#1A211A] bg-[#111611] px-3 py-2 text-sm text-[#F6FFF2] placeholder:text-[#6E7A6F] focus:outline-none focus:border-[#D9FF3D]"
                />
                <button
                  onClick={submitMirror}
                  className="rounded-lg border border-[#D9FF3D] px-3 py-1.5 text-xs text-[#D9FF3D]"
                >
                  Submit Mirror Reflection
                </button>
              </>
            )}
            {myMirror && <p className="text-xs text-[#A9B5AA]">Your reflection is saved.</p>}
            {milestones.mirror.revealed && (
              <div className="rounded-lg border border-[#1A211A] bg-[#111611] p-3 space-y-1">
                <p className="text-xs text-[#D9FF3D]">Simultaneous Reveal</p>
                <p className="text-xs text-[#A9B5AA]">You: {myMirror}</p>
                <p className="text-xs text-[#A9B5AA]">{otherUser.name}: {otherMirror}</p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-xs text-[#A9B5AA]">Value Deep-Dive: Pick your top 3 non-negotiables.</p>
            {!myValuePicks.length && (
              <>
                <div className="grid gap-2 sm:grid-cols-2">
                  {VALUE_DEEP_DIVE_OPTIONS.map((option) => (
                    <button
                      key={option}
                      onClick={() => toggleValueSelection(option)}
                      className={`rounded-lg border px-3 py-2 text-xs text-left ${
                        valueSelections.includes(option)
                          ? 'border-[#D9FF3D] text-[#D9FF3D]'
                          : 'border-[#1A211A] text-[#A9B5AA]'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                <button
                  onClick={submitValueDeepDive}
                  disabled={valueSelections.length === 0}
                  className="rounded-lg border border-[#D9FF3D] px-3 py-1.5 text-xs text-[#D9FF3D] disabled:opacity-50"
                >
                  Save Top 3
                </button>
              </>
            )}
            {myValuePicks.length > 0 && (
              <p className="text-xs text-[#A9B5AA]">Your picks: {myValuePicks.join(', ')}</p>
            )}
            {otherValuePicks.length > 0 && (
              <p className="text-xs text-[#6E7A6F]">{otherUser.name}'s picks submitted.</p>
            )}
            {milestones.valueDeepDive.overlap.length > 0 && (
              <p className="text-xs text-green-300">
                Overlap: {milestones.valueDeepDive.overlap.join(', ')}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-xs text-[#A9B5AA]">Risk / Rhythm Mapping</p>
            {myRole && (
              <p className="text-xs text-[#6E7A6F]">
                Based on temp check: your current role is <span className="text-[#D9FF3D]">{myRole}</span>.
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setRoleTab('cautious')}
                className={`rounded-full border px-3 py-1 text-xs ${roleTab === 'cautious' ? 'border-[#D9FF3D] text-[#D9FF3D]' : 'border-[#1A211A] text-[#A9B5AA]'}`}
              >
                Cautious Lens
              </button>
              <button
                onClick={() => setRoleTab('eager')}
                className={`rounded-full border px-3 py-1 text-xs ${roleTab === 'eager' ? 'border-[#D9FF3D] text-[#D9FF3D]' : 'border-[#1A211A] text-[#A9B5AA]'}`}
              >
                Eager Lens
              </button>
            </div>

            {roleTab === 'cautious' ? (
              <div className="space-y-2">
                <label className="text-xs text-[#A9B5AA]">Ideal pace (1-10)</label>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={cautiousForm.idealPace}
                  onChange={(event) => setCautiousForm((prev) => ({ ...prev, idealPace: Number(event.target.value) }))}
                  className="w-full"
                />
                <textarea
                  value={cautiousForm.worries}
                  onChange={(event) => setCautiousForm((prev) => ({ ...prev, worries: event.target.value }))}
                  placeholder="What yellow flags or worries are in your head?"
                  rows={2}
                  className="w-full rounded-lg border border-[#1A211A] bg-[#111611] px-3 py-2 text-sm text-[#F6FFF2] placeholder:text-[#6E7A6F] focus:outline-none focus:border-[#D9FF3D]"
                />
                <input
                  value={cautiousForm.safestEnvironment}
                  onChange={(event) => setCautiousForm((prev) => ({ ...prev, safestEnvironment: event.target.value }))}
                  placeholder="What environment feels lowest risk?"
                  className="w-full rounded-lg border border-[#1A211A] bg-[#111611] px-3 py-2 text-sm text-[#F6FFF2] placeholder:text-[#6E7A6F] focus:outline-none focus:border-[#D9FF3D]"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <textarea
                  value={eagerForm.connectionPull}
                  onChange={(event) => setEagerForm((prev) => ({ ...prev, connectionPull: event.target.value }))}
                  placeholder="What feels good about the current digital connection?"
                  rows={2}
                  className="w-full rounded-lg border border-[#1A211A] bg-[#111611] px-3 py-2 text-sm text-[#F6FFF2] placeholder:text-[#6E7A6F] focus:outline-none focus:border-[#D9FF3D]"
                />
                <textarea
                  value={eagerForm.fearOfWaiting}
                  onChange={(event) => setEagerForm((prev) => ({ ...prev, fearOfWaiting: event.target.value }))}
                  placeholder="What are you afraid of losing if you wait too long?"
                  rows={2}
                  className="w-full rounded-lg border border-[#1A211A] bg-[#111611] px-3 py-2 text-sm text-[#F6FFF2] placeholder:text-[#6E7A6F] focus:outline-none focus:border-[#D9FF3D]"
                />
                <input
                  value={eagerForm.lowRiskMeeting}
                  onChange={(event) => setEagerForm((prev) => ({ ...prev, lowRiskMeeting: event.target.value }))}
                  placeholder="What does a successful low-risk meeting look like?"
                  className="w-full rounded-lg border border-[#1A211A] bg-[#111611] px-3 py-2 text-sm text-[#F6FFF2] placeholder:text-[#6E7A6F] focus:outline-none focus:border-[#D9FF3D]"
                />
              </div>
            )}

            <button
              onClick={submitRoleProfile}
              className="rounded-lg border border-[#D9FF3D] px-3 py-1.5 text-xs text-[#D9FF3D]"
            >
              Save {roleTab === 'cautious' ? 'Risk' : 'Rhythm'} Landscape
            </button>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-[#A9B5AA]">Alignment Exercise: where is the sweet spot?</p>
            <input
              type="range"
              min={1}
              max={10}
              value={bridge.sweetSpot}
              onChange={(event) => setBridge((prev) => ({ ...prev, sweetSpot: Number(event.target.value) }))}
              className="w-full"
            />
            <textarea
              value={bridge.compromise}
              onChange={(event) => setBridge((prev) => ({ ...prev, compromise: event.target.value }))}
              placeholder="Write your compromise proposal that honors both rhythm and risk..."
              rows={2}
              className="w-full rounded-lg border border-[#1A211A] bg-[#111611] px-3 py-2 text-sm text-[#F6FFF2] placeholder:text-[#6E7A6F] focus:outline-none focus:border-[#D9FF3D]"
            />
            <button
              onClick={submitBridge}
              className="rounded-lg border border-[#D9FF3D] px-3 py-1.5 text-xs text-[#D9FF3D]"
            >
              Save Bridge Proposal
            </button>
            {myBridge && <p className="text-xs text-[#A9B5AA]">Your bridge proposal is saved.</p>}
            {otherBridge && <p className="text-xs text-[#6E7A6F]">{otherUser.name} has submitted a bridge proposal.</p>}
            {milestones.rhythmRisk.safetyPlan && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-3 text-xs text-emerald-200">
                {milestones.rhythmRisk.safetyPlan}
              </div>
            )}
          </div>
        </div>
      )}

      {showFinalCheck && (
        <div className="rounded-xl border border-[#1A211A] bg-[#0B0F0C]/70 p-4 space-y-4">
          <h4 className="text-sm font-medium text-[#F6FFF2]">Final Second Check-In</h4>
          {!myFinalCheck && (
            <div className="space-y-3">
              {[
                { key: 'feelsHeard', label: 'Do you feel heard and respected now?' },
                { key: 'goalsAligned', label: 'Are your goals aligned enough after the bridge work?' },
                { key: 'readiness', label: 'What is your current readiness to meet?' },
              ].map((question) => (
                <div key={question.key}>
                  <p className="text-xs text-[#A9B5AA] mb-1">{question.label}</p>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={finalCheck[question.key as keyof typeof finalCheck]}
                    onChange={(event) =>
                      setFinalCheck((prev) => ({
                        ...prev,
                        [question.key]: Number(event.target.value),
                      }))
                    }
                    className="w-full"
                  />
                  <p className="text-xs text-[#6E7A6F]">{finalCheck[question.key as keyof typeof finalCheck]}/10</p>
                </div>
              ))}
              <button
                onClick={submitFinalCheck}
                className="rounded-lg bg-[#D9FF3D] px-4 py-2 text-sm text-[#0B0F0C] font-medium"
              >
                Submit Final Check
              </button>
            </div>
          )}

          {myFinalCheck && !otherFinalCheck && (
            <p className="text-xs text-[#A9B5AA]">Your final check is submitted. Waiting on {otherUser.name}...</p>
          )}

          {milestones.finalCheck.outcome === 'aligned' && (
            <div className="rounded-lg border border-green-500/40 bg-green-500/10 px-3 py-3 text-sm text-green-300">
              Aligned. Proceed to Date Offer with the shared safety plan.
            </div>
          )}

          {milestones.finalCheck.outcome === 'mismatch' && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-3 text-sm text-amber-200 space-y-2">
              <p>Still not aligned. Move this connection into the Guided Resource Area before scheduling a date.</p>
              <button
                onClick={onOpenResources}
                className="rounded-lg border border-amber-300/50 px-3 py-1.5 text-xs text-amber-200"
              >
                Open Guided Resources
              </button>
            </div>
          )}
        </div>
      )}

      {milestones.stage === 'date-offer' && (
        <div className="rounded-xl border border-green-500/40 bg-green-500/10 p-4 space-y-4">
          <div>
            <h4 className="text-sm font-medium text-green-300 mb-1">Date Offer</h4>
            <p className="text-xs text-green-200">
              Create a concrete first-date plan and confirm it only when both of you accept.
            </p>
          </div>

          {dateOffer.proposal && (
            <div className="rounded-lg border border-green-500/30 bg-[#0B0F0C]/60 p-3 space-y-2 text-xs">
              <p className="text-green-100">
                Proposed by {dateOffer.proposedByUserId === currentUser.id ? 'you' : otherUser.name}
              </p>
              <p className="text-[#F6FFF2] text-sm">{dateOffer.proposal.title}</p>
              <p className="text-[#A9B5AA]">Location: {dateOffer.proposal.location}</p>
              <p className="text-[#A9B5AA]">When: {formatDateTime(dateOffer.proposal.dateTime)}</p>
              <p className="text-[#A9B5AA]">Length: {dateOffer.proposal.durationMinutes} minutes</p>
              {dateOffer.proposal.safetyNotes && (
                <p className="text-[#A9B5AA]">Safety notes: {dateOffer.proposal.safetyNotes}</p>
              )}
            </div>
          )}

          {canDraftDateOffer && (
            <div className="space-y-2 rounded-lg border border-[#1A211A] bg-[#111611] p-3">
              <p className="text-xs text-[#A9B5AA]">
                {dateOffer.status === 'declined'
                  ? 'Previous offer was declined. Propose a revised plan:'
                  : 'Propose your first date plan:'}
              </p>
              <input
                value={dateOfferForm.title}
                onChange={(event) => setDateOfferForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Date title (e.g., Coffee + Walk Spark Check)"
                className="w-full rounded-lg border border-[#1A211A] bg-[#0B0F0C] px-3 py-2 text-sm text-[#F6FFF2] placeholder:text-[#6E7A6F] focus:outline-none focus:border-[#D9FF3D]"
              />
              <input
                value={dateOfferForm.location}
                onChange={(event) => setDateOfferForm((prev) => ({ ...prev, location: event.target.value }))}
                placeholder="Public location"
                className="w-full rounded-lg border border-[#1A211A] bg-[#0B0F0C] px-3 py-2 text-sm text-[#F6FFF2] placeholder:text-[#6E7A6F] focus:outline-none focus:border-[#D9FF3D]"
              />
              <input
                type="datetime-local"
                value={dateOfferForm.dateTime}
                onChange={(event) => setDateOfferForm((prev) => ({ ...prev, dateTime: event.target.value }))}
                className="w-full rounded-lg border border-[#1A211A] bg-[#0B0F0C] px-3 py-2 text-sm text-[#F6FFF2] focus:outline-none focus:border-[#D9FF3D]"
              />
              <div>
                <p className="text-xs text-[#A9B5AA] mb-1">Duration: {dateOfferForm.durationMinutes} minutes</p>
                <input
                  type="range"
                  min={15}
                  max={240}
                  step={15}
                  value={dateOfferForm.durationMinutes}
                  onChange={(event) => setDateOfferForm((prev) => ({ ...prev, durationMinutes: Number(event.target.value) }))}
                  className="w-full"
                />
              </div>
              <textarea
                value={dateOfferForm.safetyNotes}
                onChange={(event) => setDateOfferForm((prev) => ({ ...prev, safetyNotes: event.target.value }))}
                placeholder={milestones.rhythmRisk.safetyPlan || 'Safety notes and logistics'}
                rows={2}
                className="w-full rounded-lg border border-[#1A211A] bg-[#0B0F0C] px-3 py-2 text-sm text-[#F6FFF2] placeholder:text-[#6E7A6F] focus:outline-none focus:border-[#D9FF3D]"
              />
              <button
                onClick={submitDateOfferProposal}
                disabled={!dateOfferForm.title.trim() || !dateOfferForm.location.trim() || !dateOfferForm.dateTime.trim()}
                className="rounded-lg bg-[#D9FF3D] px-4 py-2 text-sm text-[#0B0F0C] font-medium disabled:opacity-50"
              >
                Send Date Offer
              </button>
            </div>
          )}

          {dateOffer.proposal && dateOffer.status !== 'declined' && (
            <div className="rounded-lg border border-[#1A211A] bg-[#111611] p-3 space-y-2 text-xs">
              <p className="text-[#A9B5AA]">Decision status</p>
              <p className="text-[#A9B5AA]">You: <span className="text-[#F6FFF2]">{myDateOfferResponse}</span></p>
              <p className="text-[#A9B5AA]">{otherUser.name}: <span className="text-[#F6FFF2]">{otherDateOfferResponse}</span></p>

              {myDateOfferResponse === 'pending' && (
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => respondToDateOffer('accepted')}
                    className="rounded-lg border border-green-400/50 px-3 py-1.5 text-xs text-green-300"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => respondToDateOffer('declined')}
                    className="rounded-lg border border-amber-400/50 px-3 py-1.5 text-xs text-amber-200"
                  >
                    Decline
                  </button>
                </div>
              )}
            </div>
          )}

          {dateOffer.status === 'confirmed' && (
            <div className="rounded-lg border border-green-500/40 bg-green-500/15 px-3 py-3 text-sm text-green-200">
              Both accepted. Date confirmed and ready to move forward.
            </div>
          )}

          {dateOffer.status === 'declined' && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-3 text-sm text-amber-200">
              This offer was declined{dateOffer.declinedByUserId === currentUser.id ? ' by you' : ` by ${otherUser.name}`}. Adjust the plan and propose again.
            </div>
          )}
        </div>
      )}

      {milestones.stage === 'resource-path' && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
          <h4 className="text-sm font-medium text-amber-200 mb-2">Guided Resource Path Suggested</h4>
          <p className="text-xs text-amber-100">
            You are still on different pages. Continue strengthening alignment before meeting in person.
          </p>
          <button
            onClick={onOpenResources}
            className="mt-3 rounded-lg border border-amber-300/40 px-3 py-1.5 text-xs text-amber-200"
          >
            Go to Guided Resources
          </button>
        </div>
      )}
    </section>
  );
};

export default RelationshipMilestonesPanel;

