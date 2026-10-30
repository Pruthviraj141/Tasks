import { Flame, TrendingUp, X, Sparkles, Share2, Quote } from "lucide-react";
import type { ProductivityPulseStats } from "../lib/pulseUtils";
import { getDailyQuote } from "../data/motivationalQuotes";
import { Drawer, DrawerContent } from "./ui/drawer";
import { Button } from "./ui/button";

interface ProductivityPulseProps {
  stats: ProductivityPulseStats;
  isOpen: boolean;
  onClose: () => void;
  onOpenShare?: () => void;
}

export const ProductivityPulse = ({
  stats,
  isOpen,
  onClose,
  onOpenShare,
}: ProductivityPulseProps) => {
  const dailyQuote = getDailyQuote();

  return (
    <Drawer open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }} showSwipeHandle>
      <DrawerContent className="flex flex-col border border-[#E6E4DC] bg-[#FAF9F5] p-4 sm:p-5 shadow-2xl dark:border-[#242429] dark:bg-[#151518] max-h-[90dvh] overflow-y-auto touch-scroll safe-pb">
        {/* Top Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-[#ECE9E0] dark:border-[#222227]">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-[#F59E0B]/15 text-[#D97706] dark:text-[#FBBF24]">
              <Flame className="size-4 fill-amber-500/20" />
            </span>
            <h3 className="text-sm font-semibold text-[#18181B] dark:text-[#F4F4F6]">
              Productivity Pulse
            </h3>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Close Productivity Pulse"
            title="Close"
            className="size-9 min-h-[44px] min-w-[44px] rounded-full text-[#71717A] hover:bg-[#F0EDE4] dark:text-[#8E8E9A] dark:hover:bg-[#202026] touch-manipulation"
          >
            <X className="size-4" />
          </Button>
        </div>

        {/* Prominent Streak Hero */}
        <div className="flex flex-col items-center justify-center py-3.5 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-500/20 mb-1.5">
            <span className="text-lg">🔥</span>
            <span className="text-2xl font-extrabold font-mono text-[#D97706] dark:text-[#FBBF24] tracking-tight tabular-nums">
              {stats.currentStreak}
            </span>
            <span className="text-xs font-semibold text-[#B45309] dark:text-[#FCD34D] uppercase tracking-wider">
              {stats.currentStreak === 1 ? "day streak" : "days streak"}
            </span>
          </div>
          <p className="text-[12px] font-medium text-[#71717A] dark:text-[#8E8E9A]">
            {stats.currentStreak > 0
              ? "Consecutive daily focus maintained"
              : "Complete a task today to light your streak"}
          </p>
        </div>

        {/* Streak & Weekly Stats Cards */}
        <div className="grid grid-cols-2 gap-2.5 pb-2.5">
          <div className="p-3 bg-white dark:bg-[#1A1A20] rounded-xl border border-[#E6E4DC] dark:border-[#242429] flex flex-col shadow-2xs">
            <span className="text-[10.5px] font-medium text-[#71717A] dark:text-[#8E8E9A] uppercase tracking-wider">
              Current Streak
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-bold font-mono text-[#D97706] dark:text-[#FBBF24] tabular-nums">
                {stats.currentStreak}
              </span>
              <span className="text-xs font-medium text-[#71717A] dark:text-[#8E8E9A]">
                {stats.currentStreak === 1 ? "day" : "days"}
              </span>
            </div>
          </div>

          <div className="p-3 bg-white dark:bg-[#1A1A20] rounded-xl border border-[#E6E4DC] dark:border-[#242429] flex flex-col shadow-2xs">
            <span className="text-[10.5px] font-medium text-[#71717A] dark:text-[#8E8E9A] uppercase tracking-wider">
              7-Day Output
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-bold font-mono text-[#4F46E5] dark:text-[#818CF8] tabular-nums">
                {stats.completedThisWeek}
              </span>
              <span className="text-xs font-medium text-[#71717A] dark:text-[#8E8E9A]">
                {stats.completedThisWeek === 1 ? "task" : "tasks"}
              </span>
            </div>
          </div>
        </div>

        {/* 7-Day Numbered Streak Matrix */}
        <div className="p-3.5 bg-white dark:bg-[#1A1A20] rounded-xl border border-[#E6E4DC] dark:border-[#242429] shadow-2xs">
          <div className="flex items-center justify-between text-[11px] font-medium text-[#71717A] dark:text-[#8E8E9A] mb-2.5">
            <span className="flex items-center gap-1.5 font-semibold text-[#18181B] dark:text-[#F4F4F6]">
              <TrendingUp className="size-3 text-[#10B981] dark:text-[#34D399]" />
              7-Day Streak Timeline
            </span>
            <span className="text-[10.5px] text-[#71717A] dark:text-[#8E8E9A]">
              Numbered progress
            </span>
          </div>

          <div className="flex items-center justify-between gap-1 sm:gap-1.5 pt-0.5">
            {stats.weeklyDays.map((day) => (
              <div key={day.dateStr} className="flex flex-col items-center gap-1 sm:gap-1.5 flex-1">
                <span
                  className={`text-[9.5px] sm:text-[10px] font-semibold tracking-wider ${
                    day.isToday
                      ? "text-[#4F46E5] dark:text-[#818CF8]"
                      : "text-[#71717A] dark:text-[#8E8E9A]"
                  }`}
                >
                  {day.dayLabel}
                </span>

                <div
                  title={`${day.dateStr}: ${day.completedCount} completed${
                    day.hasCompleted ? ` (Streak Day ${day.streakNumber})` : ""
                  }`}
                  className={`size-7 sm:size-8 rounded-xl flex items-center justify-center transition-all ${
                    day.hasCompleted
                      ? "bg-[#10B981] dark:bg-[#059669] text-white shadow-2xs font-mono font-bold text-[11px] sm:text-xs tabular-nums"
                      : day.isToday
                      ? "border-2 border-dashed border-[#4F46E5] dark:border-[#6366F1] bg-[#EEF2FF] dark:bg-[#1E1E2E] text-[#4F46E5] dark:text-[#818CF8] text-[9.5px] sm:text-[10px] font-medium"
                      : "bg-[#EAE7DF] dark:bg-[#222228]"
                  }`}
                >
                  {day.hasCompleted ? (
                    <span>{day.streakNumber}</span>
                  ) : day.isToday ? (
                    <span className="size-1.5 rounded-full bg-[#4F46E5] dark:bg-[#818CF8] animate-pulse" />
                  ) : (
                    <span className="size-1 rounded-full bg-[#A1A1AA] dark:bg-[#52525E]" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Daily Motivation & Editorial Quote of the Day */}
        <div className="mt-3 p-3.5 rounded-xl bg-white dark:bg-[#1A1A20] border border-[#E6E4DC] dark:border-[#242429] relative overflow-hidden shadow-2xs">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-[#71717A] dark:text-[#8E8E9A]">
              <Quote className="size-3 text-[#4F46E5] dark:text-[#818CF8]" />
              <span>Quote of the Day</span>
            </div>

            {onOpenShare && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  onClose();
                  onOpenShare();
                }}
                title="Share Quote as Story Card"
                className="h-6 px-2 text-[11px] text-[#4F46E5] dark:text-[#818CF8] hover:bg-[#EEF2FF] dark:hover:bg-[#20202E] rounded-md gap-1 font-medium"
              >
                <Share2 className="size-3" />
                <span>Share</span>
              </Button>
            )}
          </div>

          <p className="text-[13px] leading-relaxed italic text-[#27272A] dark:text-[#E4E4E7] font-serif pr-2">
            &ldquo;{dailyQuote.text}&rdquo;
          </p>
        </div>

        {/* Encouraging Consistency Insight */}
        <div className="mt-2.5 pt-2 border-t border-[#ECE9E0] dark:border-[#222227] flex items-center gap-2 justify-center text-center">
          <Sparkles className="size-3 text-[#D97706] dark:text-[#FBBF24] shrink-0" />
          <p className="text-[11.5px] text-[#71717A] dark:text-[#8E8E9A] italic leading-snug">
            &ldquo;{stats.consistencyMessage}&rdquo;
          </p>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
