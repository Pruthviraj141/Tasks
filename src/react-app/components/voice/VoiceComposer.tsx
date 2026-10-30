import { useEffect, useState, useRef } from "react";
import { motion } from "motion/react";
import { Mic, X, Sparkles, Check, AlertCircle, StopCircle, Keyboard, RotateCw } from "lucide-react";
import { useVoiceTaskFlow } from "../../hooks/useVoiceTaskFlow";
import { ProposedTaskCard } from "./ProposedTaskCard";
import type { TaskRepository } from "../../storage/TaskRepository";
import { Drawer, DrawerContent } from "../ui/drawer";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";

interface VoiceComposerProps {
  isOpen: boolean;
  onClose: () => void;
  repository: TaskRepository;
  initialTypedText?: string | null;
  onTasksSaved?: () => void;
  onOpenManualCreate?: () => void;
}

export const VoiceComposer = ({
  isOpen,
  onClose,
  repository,
  initialTypedText,
  onTasksSaved,
  onOpenManualCreate,
}: VoiceComposerProps) => {
  const {
    state,
    transcript,
    errorMessage,
    proposedTasks,
    overallClarification,
    savedCount,
    audioLevel,
    recordingSeconds,
    hasRetainedAudio,
    startListening,
    stopListening,
    cancelListening,
    retryProcessingAudio,
    updateTranscript,
    submitTranscript,
    updateProposal,
    removeProposal,
    confirmAndSave,
    resetFlow,
  } = useVoiceTaskFlow(repository, onTasksSaved);

  const [isTypingMode, setIsTypingMode] = useState(false);
  const [typedInput, setTypedInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // When modal opens:
  // If initialTypedText is provided, immediately submit it to Groq parser
  // Otherwise, start audio recording immediately
  useEffect(() => {
    if (isOpen) {
      if (initialTypedText && initialTypedText.trim()) {
        setIsTypingMode(false);
        setTypedInput(initialTypedText.trim());
        submitTranscript(initialTypedText.trim());
      } else if (state === "idle") {
        setIsTypingMode(false);
        startListening();
      }
    } else {
      setIsTypingMode(false);
      setTypedInput("");
    }
  }, [isOpen, initialTypedText]);

  // Focus textarea when switching to typing mode
  useEffect(() => {
    if (isTypingMode && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isTypingMode]);

  // Auto-close on success immediately
  useEffect(() => {
    if (state === "success") {
      const timer = setTimeout(() => {
        resetFlow();
        onClose();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [state, resetFlow, onClose]);

  const handleClose = () => {
    cancelListening();
    resetFlow();
    setIsTypingMode(false);
    onClose();
  };

  const handleStopSpeaking = async () => {
    await stopListening();
  };

  const handleSwitchToTyping = async () => {
    await cancelListening();
    setTypedInput(transcript || "");
    setIsTypingMode(true);
  };

  const handleSwitchToVoice = () => {
    setIsTypingMode(false);
    startListening();
  };

  const handleTypedSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const textToSubmit = typedInput.trim();
    if (!textToSubmit) return;
    await submitTranscript(textToSubmit);
  };

  // Formatted recording timer MM:SS
  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  // Dynamic waveform bars computed from live mic amplitude
  const waveformBars = [
    Math.max(10, Math.min(36, 12 + audioLevel * 24)),
    Math.max(14, Math.min(48, 16 + audioLevel * 34)),
    Math.max(18, Math.min(58, 20 + audioLevel * 40)),
    Math.max(22, Math.min(68, 24 + audioLevel * 46)),
    Math.max(26, Math.min(74, 28 + audioLevel * 50)),
    Math.max(22, Math.min(68, 24 + audioLevel * 46)),
    Math.max(18, Math.min(58, 20 + audioLevel * 40)),
    Math.max(14, Math.min(48, 16 + audioLevel * 34)),
    Math.max(10, Math.min(36, 12 + audioLevel * 24)),
  ];

  return (
    <Drawer open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }} showSwipeHandle>
      <DrawerContent className="flex flex-col overflow-hidden border border-[#E8E6E0] bg-[#FAF9F6] shadow-2xl max-h-[92dvh] dark:border-[#272732] dark:bg-[#141418] touch-scroll safe-pb">
            {/* Top Bar */}
            <div className="flex items-center justify-between px-4 sm:px-5 pb-3 border-b border-[#ECEAE4] dark:border-[#22222A]">
              <div className="flex items-center gap-2">
                <div className="size-2 rounded-full bg-[#5E5CE6] dark:bg-[#7C79F2] animate-pulse" />
                <h3 className="text-sm font-semibold tracking-tight text-[#1C1C1E] dark:text-[#F4F4F6]">
                  {state === "reviewing"
                    ? "Proposed Tasks"
                    : isTypingMode
                    ? "Natural Language Task Input"
                    : "Mark Your Day Voice"}
                </h3>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={handleClose}
                aria-label="Close"
                className="-mr-1 size-9 min-h-[44px] min-w-[44px] rounded-full text-[#8E8C85] hover:bg-[#F2F0EB] dark:text-[#9D9DA8] dark:hover:bg-[#22222A] touch-manipulation"
              >
                <X className="size-4" />
              </Button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 pb-6">
              {/* 1. STATE: RECORDING (Continuous, No-Timeout Microphone Interface) */}
              {!isTypingMode &&
                (state === "listening" ||
                  state === "checking_availability" ||
                  state === "requesting_permission" ||
                  state === "idle") && (
                  <div className="py-4 flex flex-col items-center text-center">
                    {/* Pulsing Microphone Orb responding to audio amplitude */}
                    <div className="relative size-28 flex items-center justify-center my-2">
                      <motion.div
                        animate={{
                          scale: [1, 1.25 + audioLevel * 0.35, 1],
                          opacity: [0.35, 0.12, 0.35],
                        }}
                        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute inset-0 rounded-full bg-[#5E5CE6] dark:bg-[#7C79F2]"
                      />
                      <motion.div
                        animate={{
                          scale: [1, 1.15 + audioLevel * 0.2, 1],
                          opacity: [0.55, 0.25, 0.55],
                        }}
                        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut", delay: 0.1 }}
                        className="absolute inset-2.5 rounded-full bg-[#818CF8]/40 dark:bg-[#7C79F2]/30"
                      />
                      <div className="relative size-18 rounded-full bg-gradient-to-tr from-[#5E5CE6] to-[#7C3AED] dark:from-[#6A67EE] dark:to-[#8B5CF6] shadow-xl shadow-[#5E5CE6]/30 dark:shadow-[#7C79F2]/25 flex items-center justify-center text-white">
                        <Mic className="size-8 stroke-[2.2]" />
                      </div>
                    </div>

                    {/* Live Waveform Visualizer */}
                    <div className="flex items-center justify-center gap-1.5 h-12 my-2 px-6">
                      {waveformBars.map((h, i) => (
                        <motion.div
                          key={i}
                          animate={{ height: h }}
                          transition={{ duration: 0.1, ease: "linear" }}
                          className="w-1.5 rounded-full bg-gradient-to-t from-[#5E5CE6] to-[#818CF8] dark:from-[#7C79F2] dark:to-[#A5B4FC]"
                        />
                      ))}
                    </div>

                    {/* Elapsed Time & Recording Status Badge */}
                    <div className="inline-flex items-center gap-2 mt-1 px-3 py-1 rounded-full bg-[#F2F0EB] dark:bg-[#1E1E26] border border-[#ECEAE4] dark:border-[#2C2C38]">
                      <div className="size-2 rounded-full bg-[#EF4444] animate-pulse" />
                      <span className="text-xs font-mono font-semibold text-[#1C1C1E] dark:text-[#F4F4F6]">
                        {formatTimer(recordingSeconds)}
                      </span>
                    </div>

                    <p className="text-xs text-[#71717A] dark:text-[#9D9DA8] max-w-xs mt-3 leading-relaxed">
                      Continuous recording. Speak freely with pauses — won&apos;t cut off until you press Stop.
                    </p>
                    <p className="text-[11px] text-[#A1A1AA] dark:text-[#686874] mt-0.5 font-medium">
                      Hindi • Marathi • Hinglish • English
                    </p>

                    {/* Action Controls */}
                    <div className="w-full flex items-center justify-between gap-3 mt-6 pt-1">
                      {/* Switch to "Type instead" */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="lg"
                        onClick={handleSwitchToTyping}
                        className="text-[#5E5CE6] hover:bg-[#EEF2FF] dark:text-[#9D9AF8] dark:hover:bg-[#7C79F2]/15"
                      >
                        <Keyboard className="size-3.5" />
                        Type instead
                      </Button>

                      {/* Cancel & Stop Buttons */}
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="lg"
                          onClick={handleClose}
                          className="text-[#71717A] dark:text-[#9D9DA8]"
                        >
                          Cancel
                        </Button>

                        <Button
                          type="button"
                          size="lg"
                          onClick={handleStopSpeaking}
                          className="rounded-xl bg-[#EF4444] text-white shadow-md shadow-[#EF4444]/25 hover:bg-[#DC2626] dark:bg-[#DC2626] dark:hover:bg-[#B91C1C]"
                        >
                          <StopCircle className="size-4 stroke-[2.2]" />
                          Stop &amp; Parse
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

              {/* 2. STATE: TYPING INSTEAD (Direct typed natural language) */}
              {isTypingMode &&
                (state === "idle" ||
                  state === "listening" ||
                  state === "transcript_ready") && (
                  <form onSubmit={handleTypedSubmit} className="py-2 space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-[#1C1C1E] dark:text-[#F4F4F6] block mb-1.5">
                        Describe your tasks in natural language:
                      </label>
                      <Textarea
                        ref={inputRef}
                        value={typedInput}
                        onChange={(e) => {
                          setTypedInput(e.target.value);
                          updateTranscript(e.target.value);
                        }}
                        rows={4}
                        placeholder="e.g. Code for two hours tomorrow at 10 AM, revise DSA for 30 minutes, remind me to call Mom at 5 PM"
                        className="w-full resize-none rounded-2xl border-[#ECEAE4] bg-white p-3.5 text-[16px] sm:text-sm text-[#1C1C1E] focus-visible:border-[#5E5CE6] focus-visible:ring-[#5E5CE6]/10 dark:border-[#272732] dark:bg-[#18181E] dark:text-[#F4F4F6] dark:focus-visible:border-[#7C79F2]"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="lg"
                        onClick={handleSwitchToVoice}
                        className="text-[#5E5CE6] hover:bg-[#EEF2FF] dark:text-[#9D9AF8] dark:hover:bg-[#7C79F2]/15"
                      >
                        <Mic className="size-3.5" />
                        Use microphone
                      </Button>

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="lg"
                          onClick={handleClose}
                          className="text-[#71717A] dark:text-[#9D9DA8]"
                        >
                          Cancel
                        </Button>

                        <Button
                          type="submit"
                          size="lg"
                          disabled={!typedInput.trim()}
                          className="rounded-xl bg-[#5E5CE6] text-white shadow-md shadow-[#5E5CE6]/25 hover:bg-[#4F46E5] dark:bg-[#7C79F2] dark:shadow-[#7C79F2]/25 dark:hover:bg-[#6865E8]"
                        >
                          <Sparkles className="size-3.5" />
                          Parse Tasks
                        </Button>
                      </div>
                    </div>
                  </form>
                )}

              {/* 3. STATE: PARSING (Groq Whisper-large-v3 & GPT-OSS 20B Processing) */}
              {state === "parsing" && (
                <div className="py-14 flex flex-col items-center justify-center text-center">
                  <div className="relative size-16 rounded-full bg-[#EEF2FF] dark:bg-[#252538] flex items-center justify-center text-[#5E5CE6] dark:text-[#9B99F8] mb-4">
                    <Sparkles className="size-8 animate-spin" style={{ animationDuration: "2.5s" }} />
                  </div>
                  <h4 className="text-sm font-semibold text-[#1C1C1E] dark:text-[#F4F4F6]">
                    Understanding your tasks...
                  </h4>
                  <p className="text-xs text-[#71717A] dark:text-[#9D9DA8] max-w-xs mt-1 leading-relaxed">
                    Transcribing with Groq Whisper &amp; extracting schedules with GPT-OSS 20B.
                  </p>
                </div>
              )}

              {/* 4. STATE: REVIEWING (Task Proposal Screen - Directly shown upon processing) */}
              {state === "reviewing" && (
                <div className="space-y-4">
                  {/* Summary Bar */}
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-xs font-semibold text-[#1C1C1E] dark:text-[#F4F4F6] uppercase tracking-wider">
                      Proposed Tasks ({proposedTasks.length})
                    </span>
                    <span className="text-[11px] text-[#8E8C85] dark:text-[#9D9DA8]">
                      Editable preview • Confirm before saving
                    </span>
                  </div>

                  {/* Transcript quote if available */}
                  {transcript && (
                    <div className="p-3 bg-white dark:bg-[#18181E] rounded-xl border border-[#ECEAE4] dark:border-[#272732] text-xs text-[#71717A] dark:text-[#9D9DA8] italic">
                      &ldquo;{transcript}&rdquo;
                    </div>
                  )}

                  {/* Clarification banner if any field was ambiguous */}
                  {overallClarification && (
                    <div className="p-3 bg-[#FEF3C7] dark:bg-[#2C2411] border border-[#FDE68A] dark:border-[#4B3B1C] rounded-2xl flex items-start gap-2.5 text-xs text-[#92400E] dark:text-[#FDE68A]">
                      <AlertCircle className="size-4 shrink-0 mt-0.5" />
                      <p className="leading-relaxed">{overallClarification}</p>
                    </div>
                  )}

                  {/* List of Editable Proposed Task Cards */}
                  {proposedTasks.length > 0 ? (
                    <div className="space-y-2.5">
                      {proposedTasks.map((task, idx) => (
                        <ProposedTaskCard
                          key={idx}
                          task={task}
                          index={idx}
                          onUpdate={updateProposal}
                          onRemove={removeProposal}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center bg-white dark:bg-[#18181E] rounded-2xl border border-[#ECEAE4] dark:border-[#272732] p-4">
                      <p className="text-xs text-[#71717A] dark:text-[#9D9DA8] mb-3">
                        No actionable tasks were identified in your input.
                      </p>
                      <button
                        type="button"
                        onClick={handleSwitchToVoice}
                        className="text-xs font-semibold text-[#5E5CE6] dark:text-[#9B99F8] hover:underline cursor-pointer"
                      >
                        Try speaking again
                      </button>
                    </div>
                  )}

                  {/* Confirmation Actions Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-[#ECEAE4] dark:border-[#22222A]">
                    <Button
                      type="button"
                      variant="ghost"
                      size="lg"
                      onClick={handleClose}
                      className="text-[#71717A] dark:text-[#9D9DA8]"
                    >
                      Discard
                    </Button>

                    {proposedTasks.length > 0 && (
                      <Button
                        type="button"
                        size="lg"
                        onClick={confirmAndSave}
                        className="rounded-xl bg-[#5E5CE6] text-white shadow-md shadow-[#5E5CE6]/25 hover:bg-[#4F46E5] dark:bg-[#7C79F2] dark:shadow-[#7C79F2]/25 dark:hover:bg-[#6865E8]"
                      >
                        <Check className="size-4 stroke-[2.5]" />
                        Confirm &amp; Save ({proposedTasks.length})
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* 5. STATE: SAVING */}
              {state === "saving" && (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <div className="size-6 border-2 border-[#5E5CE6] dark:border-[#7C79F2] border-t-transparent rounded-full animate-spin mb-3" />
                  <h4 className="text-sm font-semibold text-[#1C1C1E] dark:text-[#F4F4F6]">
                    Saving to local tasks...
                  </h4>
                </div>
              )}

              {/* 6. STATE: SUCCESS */}
              {state === "success" && (
                <div className="py-10 flex flex-col items-center justify-center text-center">
                  <div className="size-14 rounded-full bg-[#ECFDF5] dark:bg-[#064E3B]/40 text-[#10B981] dark:text-[#34D399] flex items-center justify-center mb-3">
                    <Check className="size-7 stroke-[2.5]" />
                  </div>
                  <h4 className="text-sm font-semibold text-[#1C1C1E] dark:text-[#F4F4F6]">
                    {savedCount} {savedCount === 1 ? "task" : "tasks"} added!
                  </h4>
                  <p className="text-xs text-[#71717A] dark:text-[#9D9DA8] mt-1">
                    Your day is organized and saved locally.
                  </p>
                </div>
              )}

              {/* 7. STATE: ERROR (Graceful Recovery) */}
              {state === "error" && (
                <div className="space-y-4">
                  <div className="p-3.5 bg-[#FEF2F2] dark:bg-[#361515] border border-[#FECACA] dark:border-[#5C2323] rounded-2xl flex items-start gap-2.5 text-xs text-[#B91C1C] dark:text-[#FCA5A5]">
                    <AlertCircle className="size-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold mb-0.5">Could not parse tasks</p>
                      <p className="text-[#991B1B] dark:text-[#FCA5A5]">{errorMessage}</p>
                    </div>
                  </div>

                  {/* Transcript draft is preserved so no input is lost */}
                  <div>
                    <label className="text-[11.5px] font-medium text-[#71717A] dark:text-[#9D9DA8] mb-1.5 block">
                      Edit or retry parsing:
                    </label>
                    <Textarea
                      value={transcript}
                      onChange={(e) => updateTranscript(e.target.value)}
                      rows={3}
                      placeholder="e.g. Code for two hours tomorrow at 10 AM"
                      className="w-full rounded-xl border-[#ECEAE4] bg-white p-3 text-xs text-[#1C1C1E] focus-visible:border-[#5E5CE6] dark:border-[#272732] dark:bg-[#18181E] dark:text-[#F4F4F6] dark:focus-visible:border-[#7C79F2]"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        handleClose();
                        if (onOpenManualCreate) onOpenManualCreate();
                      }}
                      className="text-[#71717A] dark:text-[#9D9DA8]"
                    >
                      <Keyboard className="size-3.5" />
                      Type manually instead
                    </Button>

                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      {hasRetainedAudio && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={retryProcessingAudio}
                          className="rounded-xl bg-[#EEF2FF] text-[#5E5CE6] hover:bg-[#E0E7FF] dark:bg-[#7C79F2]/15 dark:text-[#9D9AF8] dark:hover:bg-[#7C79F2]/25"
                        >
                          <RotateCw className="size-3.5" />
                          Retry Audio Processing
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleSwitchToVoice}
                        className="text-[#71717A] dark:text-[#9D9DA8]"
                      >
                        New Recording
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        disabled={!transcript.trim()}
                        onClick={() => submitTranscript(transcript.trim())}
                        className="rounded-xl bg-[#5E5CE6] text-white shadow-xs hover:bg-[#4F46E5] dark:bg-[#7C79F2] dark:hover:bg-[#6865E8]"
                      >
                        Parse Tasks
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
      </DrawerContent>
    </Drawer>
  );
};
