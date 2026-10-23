import type { Task } from "../types/task";
import { getTodayISODate } from "../lib/dateUtils";

export interface WidgetTaskItem {
  id: string;
  title: string;
  isCompleted: boolean;
  time?: string;
  duration?: string;
}

export interface WidgetDataSnapshot {
  dateString: string;
  formattedDate: string;
  completedCount: number;
  totalCount: number;
  todayTasks: WidgetTaskItem[];
  updatedAt: string;
}

const WIDGET_STORAGE_KEY = "daymark_widget_snapshot";
let memoryCache: WidgetDataSnapshot | null = null;

interface NativeWidgetBridge {
  syncSnapshot?: (json: string) => void;
  getPendingToggledTasks?: () => string;
}

declare global {
  interface Window {
    DaymarkNativeWidget?: NativeWidgetBridge;
  }
}

/**
 * Syncs the current task snapshot to local storage and the native Android widget provider
 * so the home-screen widget is refreshed with exact task states without polling.
 */
export function syncWidgetData(allTasks: Task[]): WidgetDataSnapshot {
  const todayStr = getTodayISODate();
  const todayTasks = allTasks.filter(
    (t) => !t.scheduledDate || t.scheduledDate === todayStr
  );

  const completedToday = todayTasks.filter((t) => t.isCompleted).length;

  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    month: "short",
    day: "numeric",
  };
  const formattedDate = new Intl.DateTimeFormat("en-US", options).format(new Date());

  const snapshot: WidgetDataSnapshot = {
    dateString: todayStr,
    formattedDate,
    completedCount: completedToday,
    totalCount: todayTasks.length,
    todayTasks: todayTasks.slice(0, 10).map((t) => ({
      id: t.id,
      title: t.title,
      isCompleted: t.isCompleted,
      time: t.scheduledTime,
      duration: t.durationMinutes ? `${t.durationMinutes}m` : undefined,
    })),
    updatedAt: new Date().toISOString(),
  };

  const serialized = JSON.stringify(snapshot);

  // 1. Web LocalStorage cache
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(WIDGET_STORAGE_KEY, serialized);
    }
  } catch {
    // Ignore storage issues
  }

  // 2. Android Native Bridge sync
  try {
    if (typeof window !== "undefined" && window.DaymarkNativeWidget?.syncSnapshot) {
      window.DaymarkNativeWidget.syncSnapshot(serialized);
    }
  } catch (err) {
    console.warn("Failed to sync snapshot to DaymarkNativeWidget bridge:", err);
  }

  memoryCache = snapshot;
  return snapshot;
}

/**
 * Checks if any tasks were toggled directly on the home-screen widget while the app was
 * closed or in the background, returning their IDs for synchronization with SQLite.
 */
export function getPendingWidgetToggles(): string[] {
  try {
    if (typeof window !== "undefined" && window.DaymarkNativeWidget?.getPendingToggledTasks) {
      const pendingStr = window.DaymarkNativeWidget.getPendingToggledTasks();
      if (pendingStr) {
        const parsed = JSON.parse(pendingStr);
        if (Array.isArray(parsed)) {
          return parsed.filter((id) => typeof id === "string");
        }
      }
    }
  } catch (err) {
    console.warn("Error reading pending widget toggles:", err);
  }
  return [];
}

export function getWidgetDataSnapshot(): WidgetDataSnapshot | null {
  try {
    if (typeof localStorage !== "undefined") {
      const data = localStorage.getItem(WIDGET_STORAGE_KEY);
      if (data) {
        return JSON.parse(data) as WidgetDataSnapshot;
      }
    }
  } catch {
    // Ignore
  }
  return memoryCache;
}
