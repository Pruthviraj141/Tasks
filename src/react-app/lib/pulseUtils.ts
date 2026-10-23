import type { Task } from "../types/task";
import { getTodayISODate } from "./dateUtils";

export interface DayCompletionStatus {
  dateStr: string; // YYYY-MM-DD
  dayLabel: string; // Mon, Tue, etc.
  completedCount: number;
  isToday: boolean;
  hasCompleted: boolean;
  streakNumber: number; // Consecutive streak count up to this day (1, 2, 3...) or 0
}

export interface ProductivityPulseStats {
  currentStreak: number;
  completedThisWeek: number;
  weeklyDays: DayCompletionStatus[];
  consistencyMessage: string;
}

/**
 * Formats a Date object into local YYYY-MM-DD string.
 */
function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Calculates the consecutive streak achieved up to a specific date.
 * Returns 0 if that day had no completed tasks.
 */
function getStreakOnDate(targetDate: Date, completionMap: Map<string, number>): number {
  const d = new Date(targetDate);
  const key = toLocalDateKey(d);
  if ((completionMap.get(key) || 0) === 0) {
    return 0;
  }

  let streak = 1;
  d.setDate(d.getDate() - 1);
  while ((completionMap.get(toLocalDateKey(d)) || 0) > 0) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

/**
 * Calculates local 7-day activity and current completion streak based on actual completedAt timestamps.
 */
export function calculateProductivityPulse(tasks: Task[]): ProductivityPulseStats {
  const completedTasks = tasks.filter((t) => t.isCompleted && t.completedAt);

  // Group completed count by local YYYY-MM-DD
  const completionCountByDate = new Map<string, number>();

  for (const task of completedTasks) {
    if (!task.completedAt) continue;
    try {
      const d = new Date(task.completedAt);
      if (!isNaN(d.getTime())) {
        const dateKey = toLocalDateKey(d);
        completionCountByDate.set(dateKey, (completionCountByDate.get(dateKey) || 0) + 1);
      }
    } catch {
      // Ignore invalid timestamp
    }
  }

  const todayStr = getTodayISODate();
  const today = new Date();

  // 1. Build 7-day rolling window (last 6 days + today)
  const weeklyDays: DayCompletionStatus[] = [];
  let completedThisWeek = 0;

  for (let i = 6; i >= 0; i--) {
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() - i);

    const dateStr = toLocalDateKey(targetDate);
    const count = completionCountByDate.get(dateStr) || 0;
    completedThisWeek += count;

    const dayLabel = targetDate.toLocaleDateString("en-US", { weekday: "narrow" }); // M, T, W, T, F, S, S
    const streakOnThisDay = getStreakOnDate(targetDate, completionCountByDate);

    weeklyDays.push({
      dateStr,
      dayLabel,
      completedCount: count,
      isToday: dateStr === todayStr,
      hasCompleted: count > 0,
      streakNumber: streakOnThisDay,
    });
  }

  // 2. Calculate current active consecutive-day streak
  // - If today has completed tasks: current streak includes today
  // - If today has no completed tasks yet: current streak is preserved from yesterday
  // - If yesterday also had 0 completed tasks: streak is 0 (a full calendar day was missed)
  const todayCount = completionCountByDate.get(todayStr) || 0;
  let currentStreak = 0;

  if (todayCount > 0) {
    currentStreak = getStreakOnDate(today, completionCountByDate);
  } else {
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayKey = toLocalDateKey(yesterday);
    if ((completionCountByDate.get(yesterdayKey) || 0) > 0) {
      currentStreak = getStreakOnDate(yesterday, completionCountByDate);
    } else {
      currentStreak = 0;
    }
  }

  // 3. Encouraging, non-manipulative consistency message
  let consistencyMessage = "Ready when you are. Every finished task builds momentum.";
  if (currentStreak >= 7) {
    consistencyMessage = "Superb discipline. Your sustained focus creates compounding progress.";
  } else if (currentStreak >= 3) {
    consistencyMessage = "Great rhythm. Consecutive days of action build lasting momentum.";
  } else if (todayCount > 0) {
    consistencyMessage = "Off to a productive start today. One intentional step at a time.";
  }

  return {
    currentStreak,
    completedThisWeek,
    weeklyDays,
    consistencyMessage,
  };
}
