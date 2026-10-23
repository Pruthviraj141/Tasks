import { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Mic, X, Sparkles, Check, ArrowRight, RotateCcw, AlertCircle, StopCircle, Keyboard } from "lucide-react";
import { useVoiceTaskFlow } from "../../hooks/useVoiceTaskFlow";
import { ProposedTaskCard } from "./ProposedTaskCard";
import type { TaskRepository } from "../../storage/TaskRepository";

interface VoiceComposerProps {
  isOpen: boolean;
  onClose: () => void;
  repository: TaskRepository;
  onTasksSaved?: () => void;
  onOpenManualCreate?: () => void;
}

export const VoiceComposer = ({
  isOpen,
  onClose,
  repository,
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
    selectedLocale,
    setSelectedLocale,
    startListening,
    stopListening,
    updateTranscript,
    submitTranscript,
    updateProposal,
    removeProposal,
    confirmAndSave,
    resetFlow,
  } = useVoiceTaskFlow(repository, onTasksSaved);

  const languageOptions = [
    { id: "en-IN", label: "English" },
    { id: "hi-IN", label: "हिंदी" },
    { id: "mr-IN", label: "मराठी" },
    { id: "hinglish", label: "Hinglish", locale: "en-IN" },
  ];

  // When modal opens in idle state, start listening automatically
  useEffect(() => {
    if (isOpen && state === "idle") {
      startListening();
    }
  }, [isOpen, state, startListening]);

  // Auto-close on success
  useEffect(() => {
    if (state === "success") {
      const timer = setTimeout(() => {
        resetFlow();
        onClose();
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [state, resetFlow, onClose]);

  const handleClose = () => {
    resetFlow();
    onClose();
  };

  const handleLanguageChange = async (targetLocale: string) => {
    setSelectedLocale(targetLocale);
    if (state === "listening") {
      await stopListening();
      await startListening(targetLocale);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px]"
          />

          {/* Modal / Sheet container */}
          <motion.div
            initial={{ y: "100%", opacity: 0.95 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0.95 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="relative w-full max-w-lg bg-[#FAF9F6] dark:bg-[#141418] rounded-t-3xl sm:rounded-3xl shadow-2xl border border-[#E8E6E0] dark:border-[#272732] overflow-hidden flex flex-col max-h-[90vh] z-10"
          >
            {/* Top Bar */}
            <div className="flex items-center justify-between px-5 pt-3 pb-2 border-b border-[#ECEAE4] dark:border-[#22222A]">
              <div className="flex items-center gap-2">
                <div className="size-2 rounded-full bg-[#5E5CE6] dark:bg-[#7C79F2] animate-pulse" />
                <h3 className="text-sm font-semibold text-[#1C1C1E] dark:text-[#F4F4F6]">
                  Voice Task Composer
                </h3>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="p-1 text-[#8E8C85] hover:text-[#1C1C1E] dark:text-[#9D9DA8] dark:hover:text-[#F4F4F6] rounded-full hover:bg-[#F2F0EB] dark:hover:bg-[#22222A] transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Language Selector Pills */}
            <div className="flex items-center gap-1.5 px-5 py-2 bg-[#F6F5F0] dark:bg-[#18181F] border-b border-[#ECEAE4] dark:border-[#22222A] overflow-x-auto">
              <span className="text-[11px] font-medium text-[#8E8C85] dark:text-[#9D9DA8] mr-1 shrink-0">Language:</span>
              {languageOptions.map((opt) => {
                const isSelected =
                  opt.id === "hinglish"
                    ? selectedLocale === "en-IN" && opt.label === "Hinglish"
                    : selectedLocale === (opt.locale || opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleLanguageChange(opt.locale || opt.id)}
                    className={`px-2.5 py-1 text-[11px] font-medium rounded-full transition-all shrink-0 ${
                      isSelected
                        ? "bg-[#5E5CE6] dark:bg-[#7C79F2] text-white shadow-xs"
                        : "bg-white dark:bg-[#202027] text-[#71717A] dark:text-[#C4C4CE] hover:bg-[#ECEAE4] dark:hover:bg-[#282833] border border-[#E8E6E0] dark:border-[#2D2D38]"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {/* State-dependent content */}
            <div className="flex-1 overflow-y-auto p-5">
              {/* STATE: CHECKING AVAILABILITY OR PERMISSION */}
              {(state === "checking_availability" || state === "requesting_permission") && (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <div className="size-14 rounded-full bg-[#EEF2FF] dark:bg-[#252538] flex items-center justify-center text-[#5E5CE6] dark:text-[#9B99F8] mb-3">
                    <Mic className="size-6 animate-pulse" />
                  </div>
                  <h4 className="text-sm font-semibold text-[#1C1C1E] dark:text-[#F4F4F6]">
                    {state === "checking_availability"
                      ? "Checking speech services..."
                      : "Requesting microphone permission..."}
                  </h4>
                  <p className="text-xs text-[#71717A] dark:text-[#9D9DA8] max-w-xs mt-1">
                    Daymark processes your speech on-device and extracts tasks with Groq AI.
                  </p>
                </div>
              )}

              {/* STATE: LISTENING */}
              {state === "listening" && (
                <div className="py-8 flex flex-col items-center text-center">
                  {/* Pulsing Mic Sphere */}
                  <div className="relative size-24 flex items-center justify-center mb-5">
                    <motion.div
                      animate={{ scale: [1, 1.35, 1], opacity: [0.35, 0.1, 0.35] }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                      className="absolute inset-0 rounded-full bg-[#5E5CE6] dark:bg-[#7C79F2]"
                    />
                    <motion.div
                      animate={{ scale: [1, 1.2, 1], opacity: [0.6, 0.25, 0.6] }}
                      transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut", delay: 0.1 }}
                      className="absolute inset-2 rounded-full bg-[#818CF8]/40 dark:bg-[#7C79F2]/30"
                    />
                    <div className="relative size-16 rounded-full bg-gradient-to-tr from-[#5E5CE6] to-[#7C3AED] dark:from-[#6A67EE] dark:to-[#8B5CF6] shadow-lg shadow-[#5E5CE6]/35 dark:shadow-[#7C79F2]/30 flex items-center justify-center text-white">
                      <Mic className="size-7" />
                    </div>
                  </div>

                  <p className="text-sm font-semibold text-[#1C1C1E] dark:text-[#F4F4F6] mb-1">
                    Listening to your voice...
                  </p>
                  <p className="text-xs text-[#71717A] dark:text-[#9D9DA8] max-w-xs mb-4">
                    e.g. &ldquo;Code for two hours now, then study DBMS tomorrow at 10 AM.&rdquo;
                  </p>

                  {/* Live Transcript Stream */}
                  <div className="w-full min-h-[72px] p-3.5 bg-white dark:bg-[#18181E] rounded-2xl border border-[#ECEAE4] dark:border-[#272732] text-left text-sm text-[#1C1C1E] dark:text-[#F4F4F6] leading-relaxed shadow-inner">
                    {transcript ? (
                      <span>{transcript}</span>
                    ) : (
                      <span className="text-[#A1A1AA] dark:text-[#636370] italic">Speak clearly into your microphone...</span>
                    )}
                  </div>

                  {/* Stop / Cancel controls */}
                  <div className="flex items-center gap-3 mt-6">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="px-4 py-2 text-xs font-medium text-[#71717A] dark:text-[#9D9DA8] hover:bg-[#F2F0EB] dark:hover:bg-[#22222A] rounded-xl transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={stopListening}
                      className="px-5 py-2.5 text-xs font-semibold text-white bg-[#5E5CE6] hover:bg-[#4F46E5] dark:bg-[#7C79F2] dark:hover:bg-[#6865E8] rounded-xl shadow-md shadow-[#5E5CE6]/25 dark:shadow-[#7C79F2]/25 flex items-center gap-1.5 transition-all active:scale-95"
                    >
                      <StopCircle className="size-4" />
                      Done Speaking
                    </button>
                  </div>
                </div>
              )}

              {/* STATE: TRANSCRIPT READY */}
              {state === "transcript_ready" && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-[#1C1C1E] dark:text-[#F4F4F6] flex items-center justify-between mb-1.5">
                      <span>Captured Words</span>
                      <span className="text-[11px] font-normal text-[#8E8C85] dark:text-[#9D9DA8]">
                        Edit before sending if needed
                      </span>
                    </label>
                    <textarea
                      value={transcript}
                      onChange={(e) => updateTranscript(e.target.value)}
                      rows={3}
                      placeholder="Your spoken request will appear here..."
                      className="w-full text-sm text-[#1C1C1E] dark:text-[#F4F4F6] bg-white dark:bg-[#18181E] rounded-2xl p-3.5 border border-[#ECEAE4] dark:border-[#272732] outline-none focus:border-[#5E5CE6] dark:focus:border-[#7C79F2] focus:ring-2 focus:ring-[#5E5CE6]/10 resize-none transition-all"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => startListening()}
                      className="px-3 py-2 text-xs font-medium text-[#71717A] dark:text-[#9D9DA8] hover:text-[#1C1C1E] dark:hover:text-[#F4F4F6] hover:bg-[#F2F0EB] dark:hover:bg-[#22222A] rounded-xl flex items-center gap-1.5 transition-colors"
                    >
                      <RotateCcw className="size-3.5" />
                      Speak Again
                    </button>

                    <button
                      type="button"
                      onClick={submitTranscript}
                      disabled={!transcript.trim()}
                      className="px-5 py-2.5 text-xs font-semibold text-white bg-[#5E5CE6] hover:bg-[#4F46E5] dark:bg-[#7C79F2] dark:hover:bg-[#6865E8] disabled:opacity-50 disabled:pointer-events-none rounded-xl shadow-md shadow-[#5E5CE6]/25 dark:shadow-[#7C79F2]/25 flex items-center gap-1.5 transition-all active:scale-95"
                    >
                      <Sparkles className="size-3.5" />
                      Understand Tasks
                      <ArrowRight className="size-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* STATE: PARSING */}
              {state === "parsing" && (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <div className="relative size-14 rounded-full bg-[#EEF2FF] dark:bg-[#252538] flex items-center justify-center text-[#5E5CE6] dark:text-[#9B99F8] mb-4">
                    <Sparkles className="size-7 animate-spin" style={{ animationDuration: "3s" }} />
                  </div>
                  <h4 className="text-sm font-semibold text-[#1C1C1E] dark:text-[#F4F4F6]">
                    Understanding your request...
                  </h4>
                  <p className="text-xs text-[#71717A] dark:text-[#9D9DA8] max-w-xs mt-1">
                    Extracting task titles, schedules, durations, and deadlines with Groq AI.
                  </p>
                </div>
              )}

              {/* STATE: REVIEWING */}
              {state === "reviewing" && (
                <div className="space-y-4">
                  {/* Summary Header */}
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-[#1C1C1E] dark:text-[#F4F4F6] uppercase tracking-wider">
                      Proposed Tasks ({proposedTasks.length})
                    </h4>
                    <span className="text-[11px] text-[#8E8C85] dark:text-[#9D9DA8]">
                      Review before saving
                    </span>
                  </div>

                  {/* Clarification banner if needed */}
                  {overallClarification && (
                    <div className="p-3 bg-[#FEF3C7] dark:bg-[#2C2411] border border-[#FDE68A] dark:border-[#4B3B1C] rounded-2xl flex items-start gap-2 text-xs text-[#92400E] dark:text-[#FDE68A]">
                      <AlertCircle className="size-4 shrink-0 mt-0.5" />
                      <p className="leading-relaxed">{overallClarification}</p>
                    </div>
                  )}

                  {/* List of Proposed Task Cards */}
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
                        No actionable tasks could be extracted from this request.
                      </p>
                      <button
                        type="button"
                        onClick={() => startListening()}
                        className="text-xs font-semibold text-[#5E5CE6] dark:text-[#9B99F8] hover:underline"
                      >
                        Try speaking again
                      </button>
                    </div>
                  )}

                  {/* Actions Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-[#ECEAE4] dark:border-[#22222A]">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="px-4 py-2 text-xs font-medium text-[#71717A] dark:text-[#9D9DA8] hover:bg-[#F2F0EB] dark:hover:bg-[#22222A] rounded-xl transition-colors"
                    >
                      Discard
                    </button>

                    {proposedTasks.length > 0 && (
                      <button
                        type="button"
                        onClick={confirmAndSave}
                        className="px-5 py-2.5 text-xs font-semibold text-white bg-[#5E5CE6] hover:bg-[#4F46E5] dark:bg-[#7C79F2] dark:hover:bg-[#6865E8] rounded-xl shadow-md shadow-[#5E5CE6]/25 dark:shadow-[#7C79F2]/25 flex items-center gap-1.5 transition-all active:scale-95"
                      >
                        <Check className="size-4 stroke-[2.5]" />
                        Confirm & Save ({proposedTasks.length})
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* STATE: SAVING */}
              {state === "saving" && (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <div className="size-6 border-2 border-[#5E5CE6] dark:border-[#7C79F2] border-t-transparent rounded-full animate-spin mb-3" />
                  <h4 className="text-sm font-semibold text-[#1C1C1E] dark:text-[#F4F4F6]">
                    Saving to local tasks...
                  </h4>
                </div>
              )}

              {/* STATE: SUCCESS */}
              {state === "success" && (
                <div className="py-10 flex flex-col items-center justify-center text-center">
                  <div className="size-14 rounded-full bg-[#ECFDF5] dark:bg-[#064E3B]/40 text-[#10B981] dark:text-[#34D399] flex items-center justify-center mb-3">
                    <Check className="size-7 stroke-[2.5]" />
                  </div>
                  <h4 className="text-sm font-semibold text-[#1C1C1E] dark:text-[#F4F4F6]">
                    {savedCount} {savedCount === 1 ? "task" : "tasks"} added!
                  </h4>
                  <p className="text-xs text-[#71717A] dark:text-[#9D9DA8] mt-1">
                    Your day is organized and ready.
                  </p>
                </div>
              )}

              {/* STATE: ERROR */}
              {state === "error" && (
                <div className="space-y-4">
                  <div className="p-3.5 bg-[#FEF2F2] dark:bg-[#361515] border border-[#FECACA] dark:border-[#5C2323] rounded-2xl flex items-start gap-2.5 text-xs text-[#B91C1C] dark:text-[#FCA5A5]">
                    <AlertCircle className="size-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold mb-0.5">Something went wrong</p>
                      <p className="text-[#991B1B] dark:text-[#FCA5A5]">{errorMessage}</p>
                    </div>
                  </div>

                  {/* Transcript draft is retained or user can type directly */}
                  <div>
                    <label className="text-[11.5px] font-medium text-[#71717A] dark:text-[#9D9DA8] mb-1 block">
                      {transcript ? "Your draft was preserved:" : "Or type your request to parse:"}
                    </label>
                    <textarea
                      value={transcript}
                      onChange={(e) => updateTranscript(e.target.value)}
                      rows={2}
                      placeholder="e.g. Code for two hours now, then study DBMS tomorrow at 11 AM"
                      className="w-full text-xs text-[#1C1C1E] dark:text-[#F4F4F6] bg-white dark:bg-[#18181E] rounded-xl p-3 border border-[#ECEAE4] dark:border-[#272732] outline-none focus:border-[#5E5CE6] dark:focus:border-[#7C79F2]"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        handleClose();
                        if (onOpenManualCreate) onOpenManualCreate();
                      }}
                      className="text-xs text-[#71717A] dark:text-[#9D9DA8] hover:text-[#1C1C1E] dark:hover:text-[#F4F4F6] flex items-center gap-1.5"
                    >
                      <Keyboard className="size-3.5" />
                      Type manually instead
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => startListening()}
                        className="px-3 py-1.5 text-xs font-medium text-[#71717A] dark:text-[#9D9DA8] hover:bg-[#F2F0EB] dark:hover:bg-[#22222A] rounded-xl"
                      >
                        Retry Voice
                      </button>
                      <button
                        type="button"
                        disabled={!transcript.trim()}
                        onClick={submitTranscript}
                        className="px-4 py-2 text-xs font-semibold text-white bg-[#5E5CE6] hover:bg-[#4F46E5] dark:bg-[#7C79F2] dark:hover:bg-[#6865E8] disabled:opacity-50 disabled:pointer-events-none rounded-xl shadow-xs"
                      >
                        Parse Tasks
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
