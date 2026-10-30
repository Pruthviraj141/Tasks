import { format, isToday, isTomorrow, isYesterday } from "date-fns";

export function formatScheduledDate(dateStr?: string, timeStr?: string): string | null {
  if (!dateStr) return null;

  try {
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);

    let dateLabel = "";
    if (isToday(date)) {
      dateLabel = "Today";
    } else if (isTomorrow(date)) {
      dateLabel = "Tomorrow";
    } else if (isYesterday(date)) {
      dateLabel = "Yesterday";
    } else {
      dateLabel = format(date, "MMM d");
    }

    if (timeStr) {
      const [h, m] = timeStr.split(":").map(Number);
      const timeDate = new Date();
      timeDate.setHours(h, m, 0, 0);
      const timeLabel = format(timeDate, "h:mm a");
      return `${dateLabel}, ${timeLabel}`;
    }

    return dateLabel;
  } catch {
    return dateStr;
  }
}

export function formatDueDate(dueDateStr?: string): { label: string; isOverdue: boolean } | null {
  if (!dueDateStr) return null;

  try {
    const [year, month, day] = dueDateStr.split("-").map(Number);
    const targetDate = new Date(year, month - 1, day);
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const isOverdue = targetDate.getTime() < now.getTime();

    if (isToday(targetDate)) {
      return { label: "Due Today", isOverdue: false };
    }
    if (isTomorrow(targetDate)) {
      return { label: "Due Tomorrow", isOverdue: false };
    }

    return {
      label: `Due ${format(targetDate, "MMM d")}`,
      isOverdue,
    };
  } catch {
    return { label: `Due ${dueDateStr}`, isOverdue: false };
  }
}

export function formatDuration(minutes?: number): string | null {
  if (!minutes || minutes <= 0) return null;
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}m`;
}

export function getTodayISODate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getTomorrowISODate(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const year = tomorrow.getFullYear();
  const month = String(tomorrow.getMonth() + 1).padStart(2, "0");
  const day = String(tomorrow.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Minimal shape shared by persisted Tasks and Proposed (unsaved) tasks, enough
 * to classify a task into a day bucket without depending on the full Task type.
 */
export interface DateBucketable {
  scheduledDate?: string | null;
  dueDate?: string | null;
  isCompleted?: boolean;
}

export type TaskDateBucket = "overdue" | "today" | "tomorrow" | "upcoming" | "anytime";

/**
 * True when a task has a schedule or deadline strictly before `referenceTodayStr`
 * and has not been completed yet. This is the single source of truth for
 * "missed" tasks so Today/Tomorrow/Upcoming filters and the home-screen widget
 * never disagree about which tasks are overdue.
 */
export function isTaskOverdue(
  task: DateBucketable,
  referenceTodayStr: string = getTodayISODate()
): boolean {
  if (task.isCompleted) return false;
  const effectiveDate = task.dueDate || task.scheduledDate;
  return Boolean(effectiveDate) && effectiveDate! < referenceTodayStr;
}

/**
 * Classifies a task into exactly one day bucket relative to today/tomorrow.
 * This is the single source of truth used by the Today/Tomorrow/Upcoming tabs,
 * their counters, and the Android widget snapshot — previously each of those
 * re-implemented this check slightly differently, which is why tasks could
 * silently vanish from every tab except "All" once their date passed.
 *
 * - "overdue": scheduled or due before today, and not completed yet.
 * - "today": scheduled or due today (overdue tasks are reported separately
 *   via isTaskOverdue, but still belong in the "today" view so they are never
 *   hidden from the user).
 * - "tomorrow" / "upcoming": scheduled or due on a later date.
 * - "anytime": no scheduled date and no due date at all.
 */
export function getTaskDateBucket(
  task: DateBucketable,
  todayStr: string = getTodayISODate(),
  tomorrowStr: string = getTomorrowISODate()
): TaskDateBucket {
  if (isTaskOverdue(task, todayStr)) return "overdue";

  const dates = [task.scheduledDate, task.dueDate].filter(Boolean) as string[];
  if (dates.length === 0) return "anytime";
  if (dates.some((d) => d === todayStr)) return "today";
  if (dates.some((d) => d === tomorrowStr)) return "tomorrow";
  return "upcoming";
}
