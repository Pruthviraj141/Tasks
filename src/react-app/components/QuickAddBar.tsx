import React, { useState } from "react";
import { Plus, Mic, SlidersHorizontal, ArrowUp } from "lucide-react";

interface QuickAddBarProps {
  onQuickAdd: (title: string) => Promise<void>;
  onOpenFullSheet: () => void;
  onOpenVoice: () => void;
}

export const QuickAddBar: React.FC<QuickAddBarProps> = ({
  onQuickAdd,
  onOpenFullSheet,
  onOpenVoice,
}) => {
  const [quickTitle, setQuickTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await onQuickAdd(quickTitle.trim());
      setQuickTitle("");
    } catch (err) {
      console.error("Quick add failed", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full">
      <form
        onSubmit={handleSubmit}
        className="relative flex items-center gap-1.5 p-1.5 pl-3.5 bg-white rounded-2xl border border-[#E5E3DD] shadow-[0_4px_20px_rgba(0,0,0,0.06)] transition-all focus-within:border-[#5E5CE6]/60 focus-within:ring-2 focus-within:ring-[#5E5CE6]/10"
      >
        {/* Subtle leading indicator */}
        <Plus className="size-4 text-[#A1A1AA] shrink-0" />

        {/* Inline Input */}
        <input
          type="text"
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
          placeholder="Add a task..."
          className="flex-1 text-[14px] bg-transparent text-[#1C1C1E] placeholder:text-[#A1A1AA] outline-none border-none py-1.5"
        />

        {/* Quick Submit or Action Buttons */}
        <div className="flex items-center gap-1 shrink-0">
          {quickTitle.trim() ? (
            <button
              type="submit"
              disabled={isSubmitting}
              className="size-8 rounded-xl bg-[#5E5CE6] text-white flex items-center justify-center hover:bg-[#4F46E5] active:scale-95 transition-all shadow-sm"
              title="Add task"
            >
              <ArrowUp className="size-4 stroke-[2.5]" />
            </button>
          ) : (
            <>
              {/* Expand to full sheet */}
              <button
                type="button"
                onClick={onOpenFullSheet}
                className="p-2 text-[#71717A] hover:text-[#1C1C1E] hover:bg-[#F4F3EE] rounded-xl transition-colors"
                title="Detailed task creation"
              >
                <SlidersHorizontal className="size-4" />
              </button>

              {/* Phase 2 Voice Microphone */}
              <button
                type="button"
                onClick={onOpenVoice}
                className="p-2 text-[#5E5CE6] hover:bg-[#EEF2FF] rounded-xl transition-colors"
                title="Voice input (Phase 2 preview)"
              >
                <Mic className="size-4.5" />
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
};
