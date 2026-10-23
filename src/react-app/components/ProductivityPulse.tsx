import { motion, AnimatePresence } from "motion/react";
import { Flame, TrendingUp, X, Sparkles } from "lucide-react";
import type { ProductivityPulseStats } from "../lib/pulseUtils";

interface ProductivityPulseProps {
  stats: ProductivityPulseStats;
  isOpen: boolean;
  onClose: () => void;
}

export const ProductivityPulse = ({
  stats,
  isOpen,
  onClose,
}: ProductivityPulseProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/45 backdrop-blur-xs"
          />

          {/* Modal / Sheet */}
          <motion.div
            initial={{ y: "100%", opacity: 0.95 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0.95 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="relative w-full max-w-sm bg-white dark:bg-[#16161B] rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border border-[#E8E6E0] dark:border-[#282832] flex flex-col z-10"
          >
            {/* Top Bar */}
            <div className="flex items-center justify-between pb-3 border-b border-[#F2F0EB] dark:border-[#22222A]">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-lg bg-[#F59E0B]/15 text-[#D97706] dark:text-[#FBBF24]">
                  <Flame className="size-4 fill-amber-500/20" />
                </span>
                <h3 className="text-sm font-semibold text-[#1C1C1E] dark:text-[#F4F4F6]">
                  Productivity Pulse
                </h3>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close Productivity Pulse"
                title="Close"
                className="p-1.5 text-[#8E8C85] dark:text-[#9D9DA8] hover:text-[#1C1C1E] dark:hover:text-[#F4F4F6] rounded-full hover:bg-[#F4F3EE] dark:hover:bg-[#22222A] transition-colors cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Prominent Streak Hero (GitHub / LeetCode style) */}
            <div className="flex flex-col items-center justify-center py-4 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-500/20 mb-2">
                <span className="text-xl">🔥</span>
                <span className="text-2xl font-extrabold font-mono text-[#D97706] dark:text-[#FBBF24] tracking-tight">
                  {stats.currentStreak}
                </span>
                <span className="text-xs font-semibold text-[#B45309] dark:text-[#FCD34D] uppercase tracking-wider">
                  {stats.currentStreak === 1 ? "day streak" : "days streak"}
                </span>
              </div>
              <p className="text-[11.5px] font-medium text-[#71717A] dark:text-[#9D9DA8]">
                {stats.currentStreak > 0
                  ? "Consecutive daily focus maintained"
                  : "Complete a task today to light your streak"}
              </p>
            </div>

            {/* Streak & Weekly Stats Cards */}
            <div className="grid grid-cols-2 gap-3 pb-3">
              <div className="p-3 bg-[#FAF9F5] dark:bg-[#1A1A22] rounded-2xl border border-[#E8E6DE] dark:border-[#272733] flex flex-col">
                <span className="text-[10.5px] font-medium text-[#71717A] dark:text-[#9D9DA8] uppercase tracking-wider">
                  Current Streak
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-bold font-mono text-[#D97706] dark:text-[#FBBF24]">
                    {stats.currentStreak}
                  </span>
                  <span className="text-xs font-medium text-[#71717A] dark:text-[#9D9DA8]">
                    {stats.currentStreak === 1 ? "day" : "days"}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-[#FAF9F5] dark:bg-[#1A1A22] rounded-2xl border border-[#E8E6DE] dark:border-[#272733] flex flex-col">
                <span className="text-[10.5px] font-medium text-[#71717A] dark:text-[#9D9DA8] uppercase tracking-wider">
                  7-Day Output
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-bold font-mono text-[#5E5CE6] dark:text-[#7C79F2]">
                    {stats.completedThisWeek}
                  </span>
                  <span className="text-xs font-medium text-[#71717A] dark:text-[#9D9DA8]">
                    {stats.completedThisWeek === 1 ? "task" : "tasks"}
                  </span>
                </div>
              </div>
            </div>

            {/* 7-Day Numbered Streak Matrix */}
            <div className="p-3.5 bg-[#FAF9F5] dark:bg-[#1A1A22] rounded-2xl border border-[#E8E6DE] dark:border-[#272733]">
              <div className="flex items-center justify-between text-[11px] font-medium text-[#71717A] dark:text-[#9D9DA8] mb-2.5">
                <span className="flex items-center gap-1.5 font-semibold">
                  <TrendingUp className="size-3 text-[#10B981] dark:text-[#34D399]" />
                  7-Day Streak Timeline
                </span>
                <span className="text-[10.5px] text-[#8E8C85] dark:text-[#7A7A89]">
                  Numbered progress
                </span>
              </div>

              <div className="flex items-center justify-between gap-1.5 pt-1">
                {stats.weeklyDays.map((day) => (
                  <div key={day.dateStr} className="flex flex-col items-center gap-1.5 flex-1">
                    <span
                      className={`text-[10px] font-semibold tracking-wider ${
                        day.isToday
                          ? "text-[#5E5CE6] dark:text-[#9D9AF8]"
                          : "text-[#8E8C85] dark:text-[#717182]"
                      }`}
                    >
                      {day.dayLabel}
                    </span>

                    <div
                      title={`${day.dateStr}: ${day.completedCount} completed${
                        day.hasCompleted ? ` (Streak Day ${day.streakNumber})` : ""
                      }`}
                      className={`size-8 rounded-xl flex items-center justify-center transition-all ${
                        day.hasCompleted
                          ? "bg-[#10B981] dark:bg-[#059669] text-white shadow-xs font-mono font-bold text-xs"
                          : day.isToday
                          ? "border-2 border-dashed border-[#5E5CE6] dark:border-[#7C79F2] bg-[#EEF2FF] dark:bg-[#202030] text-[#5E5CE6] dark:text-[#7C79F2] text-[10px] font-medium"
                          : "bg-[#EAE8E0] dark:bg-[#262630]"
                      }`}
                    >
                      {day.hasCompleted ? (
                        <span>{day.streakNumber}</span>
                      ) : day.isToday ? (
                        <span className="size-1.5 rounded-full bg-[#5E5CE6] dark:bg-[#7C79F2] animate-pulse" />
                      ) : (
                        <span className="size-1 rounded-full bg-[#A1A1AA] dark:bg-[#52525E]" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Encouraging Consistency Insight */}
            <div className="mt-3.5 pt-3 border-t border-[#F2F0EB] dark:border-[#22222A] flex items-center gap-2 justify-center text-center">
              <Sparkles className="size-3 text-[#D97706] dark:text-[#FBBF24] shrink-0" />
              <p className="text-[11.5px] text-[#71717A] dark:text-[#9D9DA8] italic leading-snug">
                &ldquo;{stats.consistencyMessage}&rdquo;
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
