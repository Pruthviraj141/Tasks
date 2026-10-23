import { format, isToday, isTomorrow, isYesterday, parseISO } from "date-fns";

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
