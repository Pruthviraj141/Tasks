import { useMemo } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Quote as QuoteIcon, Sparkles, Share2 } from "lucide-react";
import { getDailyQuote } from "../data/motivationalQuotes";

interface QuoteOfTheDayProps {
  onShare?: () => void;
}

export const QuoteOfTheDay = ({ onShare }: QuoteOfTheDayProps) => {
  const shouldReduceMotion = useReducedMotion();
  const quote = useMemo(() => getDailyQuote(), []);

  return (
    <motion.div
      initial={shouldReduceMotion ? undefined : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="relative my-3 p-3.5 rounded-2xl bg-gradient-to-br from-[#5E5CE6]/[0.04] via-white/60 to-[#F6F5F0]/80 dark:from-[#7C79F2]/[0.07] dark:via-[#19191E]/90 dark:to-[#141418] border border-[#E8E6E0] dark:border-[#282830] shadow-[0_2px_12px_rgba(0,0,0,0.02)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.25)] backdrop-blur-xs transition-colors duration-200 select-none overflow-hidden"
    >
      {/* Decorative background watermark */}
      <div className="absolute -right-2 -bottom-3 text-[#5E5CE6]/[0.07] dark:text-[#7C79F2]/[0.08] pointer-events-none select-none">
        <QuoteIcon className="size-16 stroke-[1.2] rotate-180" />
      </div>

      <div className="relative z-10 flex flex-col gap-1.5">
        {/* Label header & Share action */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="flex items-center justify-center size-4 rounded-full bg-[#5E5CE6]/10 dark:bg-[#7C79F2]/20 text-[#5E5CE6] dark:text-[#9D9AF8]">
              <Sparkles className="size-2.5 stroke-[2.5]" />
            </span>
            <span className="text-[10px] font-semibold tracking-wider uppercase text-[#8E8C85] dark:text-[#9494A0]">
              Quote of the Day
            </span>
          </div>

          {onShare && (
            <button
              type="button"
              onClick={onShare}
              title="Share Quote as Story Card"
              className="p-1 -mr-1 text-[#8E8C85] dark:text-[#9494A0] hover:text-[#5E5CE6] dark:hover:text-[#7C79F2] hover:bg-[#5E5CE6]/10 rounded-lg transition-colors flex items-center gap-1 text-[11px]"
            >
              <Share2 className="size-3.5" />
              <span className="text-[10px] font-medium hidden sm:inline">Share</span>
            </button>
          )}
        </div>

        {/* Quote body text */}
        <p className="text-[13px] sm:text-[13.5px] leading-relaxed font-normal italic text-[#2C2C2E] dark:text-[#ECECF0] pr-4">
          &ldquo;{quote.text}&rdquo;
        </p>
      </div>
    </motion.div>
  );
};
