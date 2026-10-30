import { useState, type FormEvent } from "react";
import { Mic, SlidersHorizontal, ArrowUp, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

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
        className="relative flex items-center gap-1 sm:gap-1.5 p-1 sm:p-1.5 pl-2.5 sm:pl-3 bg-white dark:bg-[#161619] rounded-2xl border border-[#E6E4DC] dark:border-[#242429] shadow-[0_4px_20px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)] transition-all focus-within:border-[#4F46E5]/60 dark:focus-within:border-[#6366F1]/60 focus-within:ring-2 focus-within:ring-[#4F46E5]/10 dark:focus-within:ring-[#6366F1]/15"
      >
        {/* Groq AI Indicator / Voice Shortcut */}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onOpenVoice}
          title="AI Voice & Smart Scheduler (Groq)"
          className="shrink-0 size-9 min-h-[44px] min-w-[44px] text-[#4F46E5] hover:bg-[#EEF2FF] dark:text-[#818CF8] dark:hover:bg-[#20202E] rounded-xl touch-manipulation"
        >
          <Sparkles className="size-4" />
        </Button>

        {/* Natural Language AI Input */}
        <Input
          type="text"
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
          placeholder="Schedule with AI (e.g. 'Study at 10 AM')..."
          aria-label="Natural language task input for Groq AI"
          className="h-auto flex-1 border-none bg-transparent py-1.5 px-1 text-[16px] sm:text-[13.5px] text-[#18181B] shadow-none outline-none placeholder:text-[#A1A1AA] placeholder:text-[12px] sm:placeholder:text-[13.5px] placeholder:truncate focus-visible:ring-0 dark:text-[#F4F4F6] dark:placeholder:text-[#686874]"
        />

        {/* Action Controls */}
        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0 pr-1">
          {quickTitle.trim() ? (
            <Button
              type="submit"
              size="icon-sm"
              disabled={isSubmitting}
              title="Parse & Preview with AI (Groq)"
              className="size-9 min-h-[44px] min-w-[44px] rounded-xl bg-[#4F46E5] text-white shadow-2xs hover:bg-[#4338CA] dark:bg-[#6366F1] dark:hover:bg-[#4F46E5] touch-manipulation"
            >
              <ArrowUp className="size-4 stroke-[2.5]" />
            </Button>
          ) : (
            <>
              {/* Detailed Manual Task Sheet */}
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={onOpenFullSheet}
                title="Detailed task editor"
                className="size-9 min-h-[44px] min-w-[44px] text-[#71717A] hover:bg-[#F3F1EA] hover:text-[#18181B] dark:text-[#8E8E9A] dark:hover:bg-[#202026] dark:hover:text-[#F4F4F6] rounded-xl touch-manipulation"
              >
                <SlidersHorizontal className="size-3.5" />
              </Button>

              {/* Voice Input Trigger */}
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={onOpenVoice}
                title="Voice input (Whisper)"
                className="size-9 min-h-[44px] min-w-[44px] text-[#4F46E5] hover:bg-[#EEF2FF] dark:text-[#818CF8] dark:hover:bg-[#20202E] rounded-xl touch-manipulation"
              >
                <Mic className="size-4" />
              </Button>
            </>
          )}
        </div>
      </form>
    </div>
  );
};
