import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { Sun, Moon, Flame, User as UserIcon, LogOut, Share2 } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { TaskFilter } from "../types/task";
import { useTheme } from "../hooks/useTheme";
import { useAuth } from "../context/AuthContext";
import { AuthModal } from "./AuthModal";
import { Button } from "./ui/button";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
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
    tomorrow: number;
    upcoming: number;
    overdue: number;
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
  const { user, signOut } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    if (isProfileOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isProfileOpen]);

  const now = new Date();
  const currentDate = format(now, "EEEE, MMMM d");
  const hour = now.getHours();
  const greeting =
    hour >= 4 && hour < 12
      ? "Good morning"
      : hour >= 12 && hour < 17
      ? "Good afternoon"
      : "Good evening";

  const getHeadingTitle = () => {
    switch (activeFilter) {
      case "today":
        return "Today";
      case "tomorrow":
        return "Tomorrow";
      case "upcoming":
        return "Upcoming";
      case "completed":
        return "Completed";
      case "all":
      default:
        return "All Tasks";
    }
  };

  return (
    <header className="px-4 sm:px-5 pt-4 sm:pt-5 pb-3 transition-colors duration-200">
      {/* Top Greeting & Controls Row */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[12px] font-medium tracking-tight text-[#4F46E5] dark:text-[#818CF8] block">
            {greeting}
          </span>
          <p className="text-[13px] font-medium tracking-tight text-[#71717A] dark:text-[#8E8E9A]">
            {currentDate}
          </p>
        </div>

        {/* Action Controls: Pulse, Theme Toggle & Google Auth */}
        <div className="flex items-center gap-1.5 relative">
          {onOpenPulse && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onOpenPulse}
              aria-label={`View Productivity Pulse: ${streakCount} day streak`}
              title={`Productivity Pulse: ${streakCount} day streak`}
              className="h-9 min-h-[44px] min-w-[44px] px-3 rounded-xl text-[#D97706] dark:text-[#FBBF24] bg-white/80 dark:bg-[#18181D] border-[#E6E4DC] dark:border-[#26262B] shadow-2xs hover:bg-white dark:hover:bg-[#202026] touch-manipulation"
            >
              <Flame className="size-3.5 fill-amber-500/20 text-[#D97706] dark:text-[#FBBF24]" />
              <span className="font-semibold text-xs tabular-nums">{streakCount}</span>
            </Button>
          )}

          {/* Theme Toggle Button */}
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            onClick={toggleTheme}
            aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
            title={isDark ? "Switch to light theme" : "Switch to dark theme"}
            className="size-9 min-h-[44px] min-w-[44px] rounded-xl text-[#71717A] dark:text-[#9E9EA8] bg-white/80 dark:bg-[#18181D] border-[#E6E4DC] dark:border-[#26262B] shadow-2xs hover:bg-white dark:hover:bg-[#202026] touch-manipulation"
          >
            <motion.div
              key={isDark ? "dark" : "light"}
              initial={shouldReduceMotion ? undefined : { rotate: -30, opacity: 0, scale: 0.8 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              {isDark ? (
                <Sun className="size-4 text-[#FBBF24]" />
              ) : (
                <Moon className="size-4 text-[#4F46E5]" />
              )}
            </motion.div>
          </Button>

          {/* Share Daily Progress & Story Card */}
          {onOpenShare && (
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={onOpenShare}
              aria-label="Share Today's Story & Card"
              title="Share Today's Story (Story, Square, Twitter)"
              className="size-9 min-h-[44px] min-w-[44px] rounded-xl text-[#4F46E5] dark:text-[#818CF8] bg-white/80 dark:bg-[#18181D] border-[#E6E4DC] dark:border-[#26262B] shadow-2xs hover:bg-white dark:hover:bg-[#202026] touch-manipulation"
            >
              <Share2 className="size-4" />
            </Button>
          )}

          {/* Google Auth / Profile Area */}
          <div className="relative" ref={profileRef}>
            {user ? (
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                onClick={() => setIsProfileOpen((prev) => !prev)}
                aria-label="Account details"
                title={user.email || "Account details"}
                className="size-9 min-h-[44px] min-w-[44px] rounded-xl bg-white/80 dark:bg-[#18181D] border-[#E6E4DC] dark:border-[#26262B] shadow-2xs hover:bg-white dark:hover:bg-[#202026] overflow-hidden p-0"
              >
                {user.user_metadata?.avatar_url || user.user_metadata?.picture ? (
                  <img
                    src={user.user_metadata.avatar_url || user.user_metadata?.picture}
                    alt={user.user_metadata?.full_name || "Profile"}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-semibold text-xs text-[#4F46E5] dark:text-[#818CF8] bg-primary/10">
                    {(user.user_metadata?.full_name || user.email || "U")[0].toUpperCase()}
                  </div>
                )}
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAuthModalOpen(true)}
                aria-label="Sign in to Mark Your Day"
                title="Sign in with Google"
                className="h-9 min-h-[44px] px-2.5 rounded-xl text-xs font-medium text-[#18181B] dark:text-[#F4F4F6] bg-white/80 dark:bg-[#18181D] border-[#E6E4DC] dark:border-[#26262B] shadow-2xs hover:bg-white dark:hover:bg-[#202026] flex items-center gap-1.5 touch-manipulation"
              >
                <UserIcon className="size-3.5 text-muted-foreground" />
                <span className="hidden sm:inline">Sign In</span>
              </Button>
            )}

            {/* Profile Dropdown */}
            {isProfileOpen && user && (
              <div className="absolute right-0 top-11 z-50 w-64 bg-card border border-border rounded-2xl p-3 shadow-xl flex flex-col gap-2.5 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center gap-3 pb-2 border-b border-border/50">
                  {user.user_metadata?.avatar_url || user.user_metadata?.picture ? (
                    <img
                      src={user.user_metadata.avatar_url || user.user_metadata.picture}
                      alt="Avatar"
                      className="w-9 h-9 rounded-full object-cover shrink-0 border border-border/40"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-primary/10 text-primary font-semibold text-xs flex items-center justify-center shrink-0">
                      {(user.user_metadata?.full_name || user.email || "U")[0].toUpperCase()}
                    </div>
                  )}
                  <div className="overflow-hidden">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {user.user_metadata?.full_name || "Mark Your Day User"}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                  </div>
                </div>

                {onOpenShare && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileOpen(false);
                      onOpenShare();
                    }}
                    className="w-full flex items-center justify-start gap-2.5 py-2 px-3 rounded-xl text-xs font-semibold text-[#4F46E5] dark:text-[#818CF8] bg-[#EEF2FF] dark:bg-[#20202E] hover:bg-[#E0E7FF] dark:hover:bg-[#282838] transition-colors cursor-pointer"
                  >
                    <Share2 className="size-3.5" />
                    <span>Share Today&apos;s Progress</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={async () => {
                    setIsProfileOpen(false);
                    await signOut();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-medium text-destructive bg-destructive/10 hover:bg-destructive/15 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />


      {/* Main Section Title & Animated Progress Stats */}
      <div className="flex items-baseline justify-between mt-3.5">
        <motion.h1
          key={activeFilter}
          initial={shouldReduceMotion ? undefined : { opacity: 0.8, y: 2 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="text-xl sm:text-2xl font-bold tracking-tight text-[#18181B] dark:text-[#F4F4F6] transition-colors"
        >
          {getHeadingTitle()}
        </motion.h1>

        <motion.span
          key={`${completedCount}-${totalCount}`}
          initial={shouldReduceMotion ? undefined : { scale: 0.95, opacity: 0.8 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="text-xs font-medium text-[#71717A] dark:text-[#8E8E9A] tabular-nums select-none"
        >
          {completedCount} of {totalCount} completed
        </motion.span>
      </div>

      {/* Micro Progress Bar: Always visible across all menus without hiding after completing tasks */}
      <div className="w-full h-1 bg-[#ECE9E0] dark:bg-[#222227] rounded-full overflow-hidden mt-1.5 mb-2.5 transition-colors">
        <div
          className="h-full bg-[#4F46E5] dark:bg-[#6366F1] rounded-full transition-all duration-300 ease-out"
          style={{ width: `${totalCount > 0 ? progressPercentage : 0}%` }}
        />
      </div>

      {/* Fluid Filter Tabs Segmented Control */}
      <Tabs
        value={activeFilter}
        onValueChange={(value) => onFilterChange(value as TaskFilter)}
        className="mt-2"
      >
        <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto no-scrollbar rounded-xl bg-[#EDEAE2] p-1 dark:border dark:border-[#222227] dark:bg-[#161619] touch-scroll">
          {(
            [
              { id: "today", label: "Today", count: counts.today },
              { id: "tomorrow", label: "Tomorrow", count: counts.tomorrow },
              { id: "upcoming", label: "Upcoming", count: counts.upcoming },
              { id: "completed", label: "Completed", count: counts.completed },
              { id: "all", label: "All", count: counts.all },
            ] as const
          ).map((tab) => {
            const isActive = activeFilter === tab.id;
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className={cn(
                  "flex-1 min-w-fit shrink-0 gap-1 sm:gap-1.5 whitespace-nowrap rounded-lg px-2 sm:px-2.5 py-1.5 min-h-[38px] text-[11px] sm:text-xs font-medium transition-all touch-manipulation",
                  "data-active:bg-white data-active:text-[#18181B] data-active:shadow-2xs dark:data-active:bg-[#24242A] dark:data-active:text-[#F4F4F6]",
                  "text-[#71717A] dark:text-[#8E8E9A] hover:text-[#18181B] dark:hover:text-[#F4F4F6]"
                )}
              >
                <span>{tab.label}</span>
                {tab.id === "today" && counts.overdue > 0 && (
                  <span
                    role="status"
                    aria-label={`${counts.overdue} overdue task${counts.overdue === 1 ? "" : "s"}`}
                    className="size-1.5 shrink-0 rounded-full bg-[#EF4444] animate-pulse"
                  />
                )}
                {tab.count > 0 && (
                  <motion.span
                    key={tab.count}
                    initial={shouldReduceMotion ? undefined : { scale: 0.9 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.15 }}
                    className={cn(
                      "rounded-full px-1.5 py-0.2 text-[10px] font-medium tabular-nums transition-colors",
                      isActive
                        ? "bg-[#F1EFE8] text-[#3F3F46] dark:bg-[#1A1A1F] dark:text-[#D4D4D8]"
                        : "bg-[#DFDCD4] text-[#71717A] dark:bg-[#202025] dark:text-[#8E8E9A]"
                    )}
                  >
                    {tab.count}
                  </motion.span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>
    </header>
  );
};
