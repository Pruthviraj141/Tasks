import { format } from "date-fns";
import { Sun, Moon, Flame } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { TaskFilter } from "../types/task";
import { useTheme } from "../hooks/useTheme";
import { QuoteOfTheDay } from "./QuoteOfTheDay";
import { cn } from "cn";

interface HeaderProps {
  totalCount: number;
  completedCount: number;
  progressPercentage: number;
  activeFilter: TaskFilter;
  onFilterChange: (filter: TaskFilter) => void;
  counts: {
    all: number;
    today: number;
    upcoming: number;
    completed: number;
  };
  streakCount?: number;
  onOpenPulse?: () => void;
  onOpenShare?: () => void;
}

export const Header = ({
  totalCount,
  completedCount,
  progressPercentage,
  activeFilter,
  onFilterChange,
  counts,
  streakCount = 0,
  onOpenPulse,
  onOpenShare,
}: HeaderProps) => {
  const { isDark, toggleTheme } = useTheme();
  const shouldReduceMotion = useReducedMotion();
  const now = new Date();
  const currentDate = format(now, "EEEE, MMMM d");
  const hour = now.getHours();
  const greeting = hour >= 4 && hour < 12 
    ? "Good morning" 
    : hour >= 12 && hour < 17 
    ? "Good afternoon" 
    : "Good evening";

  return (
    <header className="px-5 pt-6 pb-2 transition-colors duration-200">
      {/* Top Greeting & Theme Toggle Bar */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[11.5px] font-medium tracking-wide text-[#5E5CE6] dark:text-[#9D9AF8] block">
            {greeting}
          </span>
          <p className="text-[12.5px] font-medium tracking-tight text-[#8E8C85] dark:text-[#888894]">
            {currentDate}
          </p>
        </div>

        {/* Action Controls: Pulse & Theme Toggle */}
        <div className="flex items-center gap-2">
          {onOpenPulse && (
            <button
              type="button"
              onClick={onOpenPulse}
              aria-label={`View Productivity Pulse: ${streakCount} day streak`}
              title={`Productivity Pulse: ${streakCount} day streak`}
              className="h-9 px-2.5 rounded-xl flex items-center gap-1.5 text-[#D97706] dark:text-[#FBBF24] bg-white/70 dark:bg-[#1E1E24] hover:bg-white dark:hover:bg-[#272730] border border-[#E8E6E0] dark:border-[#2C2C36] shadow-xs transition-all active:scale-95 cursor-pointer font-medium text-xs"
            >
              <Flame className="size-4 fill-amber-500/20 text-[#D97706] dark:text-[#FBBF24]" />
              <span className="font-bold text-[13px] font-mono">{streakCount}</span>
            </button>
          )}

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
            title={isDark ? "Switch to light theme" : "Switch to dark theme"}
            className="size-9 rounded-xl flex items-center justify-center text-[#71717A] dark:text-[#9E9EA8] hover:text-[#1C1C1E] dark:hover:text-[#F4F4F6] bg-white/70 dark:bg-[#1E1E24] hover:bg-white dark:hover:bg-[#272730] border border-[#E8E6E0] dark:border-[#2C2C36] shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <motion.div
              key={isDark ? "dark" : "light"}
              initial={shouldReduceMotion ? undefined : { rotate: -30, opacity: 0, scale: 0.8 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              {isDark ? (
                <Sun className="size-4 text-[#FBBF24]" />
              ) : (
                <Moon className="size-4 text-[#5E5CE6]" />
              )}
            </motion.div>
          </button>
        </div>
      </div>

      {/* Main Title & Progress Stats */}
      <div className="flex items-baseline justify-between mt-3">
        <h1 className="text-2xl font-bold tracking-tight text-[#1C1C1E] dark:text-[#F4F4F6] transition-colors">
          Tasks
        </h1>

        {totalCount > 0 && (
          <span className="text-xs font-medium text-[#71717A] dark:text-[#9E9EA8] transition-colors">
            {completedCount} of {totalCount} completed
          </span>
        )}
      </div>

      {/* Quote of the Day Section */}
      <QuoteOfTheDay onShare={onOpenShare} />

      {/* Subtle Micro Progress Bar */}
      {totalCount > 0 && (
        <div className="w-full h-1 bg-[#ECEAE4] dark:bg-[#25252D] rounded-full overflow-hidden mt-1 transition-colors">
          <div
            className="h-full bg-[#5E5CE6] dark:bg-[#7C79F2] rounded-full transition-all duration-300 ease-out shadow-[0_0_8px_rgba(124,121,242,0.3)]"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      )}

      {/* Filter Tabs / Segmented Control */}
      <div className="flex items-center gap-1 mt-3 p-1 bg-[#F2F0EB] dark:bg-[#1A1A20] border border-transparent dark:border-[#26262F] rounded-xl overflow-x-auto no-scrollbar transition-colors">
        {(
          [
            { id: "today", label: "Today", count: counts.today },
            { id: "upcoming", label: "Upcoming", count: counts.upcoming },
            { id: "all", label: "All", count: counts.all },
          ] as const
        ).map((tab) => {
          const isActive = activeFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onFilterChange(tab.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-medium transition-all select-none whitespace-nowrap cursor-pointer",
                isActive
                  ? "bg-white dark:bg-[#282832] text-[#1C1C1E] dark:text-[#F4F4F6] shadow-xs font-semibold"
                  : "text-[#71717A] dark:text-[#8E8E9B] hover:text-[#1C1C1E] dark:hover:text-[#F4F4F6] hover:bg-white/50 dark:hover:bg-white/5"
              )}
            >
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span
                  className={cn(
                    "text-[10.5px] px-1.5 py-0.2 rounded-full transition-colors",
                    isActive
                      ? "bg-[#F4F3EE] dark:bg-[#1E1E26] text-[#55534E] dark:text-[#B4B4C0]"
                      : "bg-[#E8E6E0] dark:bg-[#22222A] text-[#71717A] dark:text-[#888894]"
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </header>
  );
};
