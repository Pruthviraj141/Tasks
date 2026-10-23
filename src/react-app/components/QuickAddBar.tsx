import { useState, type FormEvent } from "react";
import { Plus, Mic, SlidersHorizontal, ArrowUp } from "lucide-react";

interface QuickAddBarProps {
  onQuickAdd: (title: string) => Promise<void>;
  onOpenFullSheet: () => void;
  onOpenVoice: () => void;
}

export const QuickAddBar = ({
  onQuickAdd,
  onOpenFullSheet,
  onOpenVoice,
}: QuickAddBarProps) => {
  const [quickTitle, setQuickTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
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
        className="relative flex items-center gap-1.5 p-1.5 pl-3.5 bg-white dark:bg-[#1A1A20] rounded-2xl border border-[#E5E3DD] dark:border-[#2A2A34] shadow-[0_4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.45)] transition-all focus-within:border-[#5E5CE6]/60 dark:focus-within:border-[#7C79F2]/60 focus-within:ring-2 focus-within:ring-[#5E5CE6]/10 dark:focus-within:ring-[#7C79F2]/15"
      >
        {/* Subtle leading indicator */}
        <Plus className="size-4 text-[#A1A1AA] dark:text-[#686874] shrink-0" />

        {/* Inline Input */}
        <input
          type="text"
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
          placeholder="Add a task..."
          className="flex-1 text-[14px] bg-transparent text-[#1C1C1E] dark:text-[#F4F4F6] placeholder:text-[#A1A1AA] dark:placeholder:text-[#686874] outline-none border-none py-1.5"
        />

        {/* Quick Submit or Action Buttons */}
        <div className="flex items-center gap-1 shrink-0">
          {quickTitle.trim() ? (
            <button
              type="submit"
              disabled={isSubmitting}
              className="size-8 rounded-xl bg-[#5E5CE6] dark:bg-[#7C79F2] text-white flex items-center justify-center hover:bg-[#4F46E5] dark:hover:bg-[#6C68E8] active:scale-95 transition-all shadow-sm cursor-pointer"
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
                className="p-2 text-[#71717A] dark:text-[#9494A0] hover:text-[#1C1C1E] dark:hover:text-[#F4F4F6] hover:bg-[#F4F3EE] dark:hover:bg-[#252530] rounded-xl transition-colors cursor-pointer"
                title="Detailed task creation"
              >
                <SlidersHorizontal className="size-4" />
              </button>

              {/* Phase 2 Voice Microphone */}
              <button
                type="button"
                onClick={onOpenVoice}
                className="p-2 text-[#5E5CE6] dark:text-[#9D9AF8] hover:bg-[#EEF2FF] dark:hover:bg-[#7C79F2]/15 rounded-xl transition-colors cursor-pointer"
                title="Voice input"
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
