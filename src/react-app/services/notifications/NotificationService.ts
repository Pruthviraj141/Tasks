import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { toast } from "sonner";
import type { Task } from "../../types/task";

/**
 * Generates a stable 32-bit positive integer from a string task ID,
 * as required by Android and iOS notification managers.
 */
export function getNotificationId(taskId: string): number {
  let hash = 0;
  for (let i = 0; i < taskId.length; i++) {
    hash = (hash << 5) - hash + taskId.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash % 2147483647) || 1;
}

/**
 * Curated, motivating titles inspired by friendly consumer apps (e.g., Zomato, Duolingo)
 * without generic pushiness or spam.
 */
export const MOTIVATIONAL_TITLES = [
  "Your future self will thank you ✨",
  "Time to make your mark ⚡",
  "One small step at a time 🎯",
  "Momentum is built right here 🚀",
  "Focus mode: activated 🌟",
  "Clear mind, clear day ✨",
];

export const MOTIVATIONAL_TEMPLATES = [
  (title: string) => `Time to work on ${title}. Start with one small step.`,
  (title: string) => `Ready for ${title}? Dive in and keep your momentum going.`,
  (title: string) => `Small actions, big outcomes. Let's tackle ${title}.`,
  (title: string) => `A few focused minutes on ${title} will make today count.`,
  (title: string) => `Time for ${title}. You've got everything you need to start.`,
];

export const REMINDER_CHANNEL_ID = "daymark_reminders_v2";

export function generateNotificationCopy(task: Pick<Task, "id" | "title" | "notes">): {
  title: string;
  body: string;
} {
  const hash = getNotificationId(task.id);
  const title = MOTIVATIONAL_TITLES[hash % MOTIVATIONAL_TITLES.length];
  const templateFn = MOTIVATIONAL_TEMPLATES[hash % MOTIVATIONAL_TEMPLATES.length];
  let body = templateFn(task.title);

  if (task.notes && task.notes.trim()) {
    body += `\n${task.notes.trim()}`;
  }

  return { title, body };
}

export class NotificationService {
  private static instance: NotificationService;
  private channelCreated = false;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async ensureChannelCreated(): Promise<void> {
    if (!Capacitor.isNativePlatform() || this.channelCreated) return;
    try {
      await LocalNotifications.createChannel({
        id: REMINDER_CHANNEL_ID,
        name: "Task Reminders",
        description: "Priority alerts and reminders for your scheduled day tasks",
        importance: 5, // IMPORTANCE_HIGH: pops down as a heads-up banner on top of the screen (like WhatsApp)
        visibility: 1, // VISIBILITY_PUBLIC: shows on lock screen
        vibration: true,
        lights: true,
        lightColor: "#5E5CE6",
      });
      this.channelCreated = true;
    } catch (err) {
      console.warn("Failed to create notification channel:", err);
    }
  }

  isSupported(): boolean {
    if (Capacitor.isNativePlatform()) return true;
    return typeof window !== "undefined" && "Notification" in window;
  }

  async getPermissionStatus(): Promise<"granted" | "denied" | "prompt" | "prompt-with-rationale"> {
    if (!Capacitor.isNativePlatform()) {
      if (typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission === "granted") return "granted";
        if (Notification.permission === "denied") return "denied";
        return "prompt";
      }
      return "denied";
    }

    try {
      const status = await LocalNotifications.checkPermissions();
      return status.display;
    } catch {
      return "prompt";
    }
  }

  async requestPermissions(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      if (typeof window !== "undefined" && "Notification" in window) {
        try {
          if (Notification.permission === "denied") return false;
          const perm = await Notification.requestPermission();
          return perm === "granted";
        } catch {
          return false;
        }
      }
      return false;
    }

    try {
      const status = await LocalNotifications.requestPermissions();
      return status.display === "granted";
    } catch (err) {
      console.warn("Failed to request notification permissions:", err);
      return false;
    }
  }

  async checkPermissions(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      if (typeof window !== "undefined" && "Notification" in window) {
        return Notification.permission === "granted";
      }
      return false;
    }

    try {
      const status = await LocalNotifications.checkPermissions();
      return status.display === "granted";
    } catch (err) {
      console.warn("Failed to check notification permissions:", err);
      return false;
    }
  }

  async requestPermissionsWithRationale(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      if (typeof window !== "undefined" && "Notification" in window) {
        try {
          if (Notification.permission === "denied") {
            toast.info("Notifications are blocked in your browser. Enable permissions in browser settings for reminders.", {
              duration: 4500,
            });
            return false;
          }
          const perm = await Notification.requestPermission();
          return perm === "granted";
        } catch {
          return false;
        }
      }
      return false;
    }

    try {
      // Explain benefit contextually if not granted
      toast.info("Turn on notifications so Mark Your Day can remind you at your scheduled time.", {
        duration: 3500,
      });

      const status = await LocalNotifications.requestPermissions();
      const granted = status.display === "granted";
      if (!granted) {
        toast("Reminder saved without notifications. You can enable them anytime in device settings.", {
          duration: 4000,
        });
      }
      return granted;
    } catch (err) {
      console.warn("Failed to request notification permissions:", err);
      return false;
    }
  }

  async scheduleReminder(task: Pick<Task, "id" | "title" | "reminderDate" | "reminderTime" | "notes">): Promise<boolean> {
    if (!task.reminderDate || !task.reminderTime) {
      return false;
    }

    // Parse target local timestamp
    const targetDate = new Date(`${task.reminderDate}T${task.reminderTime}:00`);
    const now = new Date();

    // Prevent duplicate or past-due notifications
    if (isNaN(targetDate.getTime()) || targetDate.getTime() <= now.getTime()) {
      console.warn("Reminder date/time is in the past or invalid; skipping notification schedule.");
      return false;
    }

    const notificationId = getNotificationId(task.id);
    const { title, body } = generateNotificationCopy(task);

    if (Capacitor.isNativePlatform()) {
      try {
        const hasPerm = await this.checkPermissions();
        if (!hasPerm) {
          const granted = await this.requestPermissionsWithRationale();
          if (!granted) {
            return false;
          }
        }

        // Ensure priority heads-up channel exists
        await this.ensureChannelCreated();

        // Always cancel previous notification first to prevent duplicates
        await this.cancelReminder(task.id);

        await LocalNotifications.schedule({
          notifications: [
            {
              id: notificationId,
              title,
              body,
              schedule: { at: targetDate, allowWhileIdle: true },
              channelId: REMINDER_CHANNEL_ID,
              smallIcon: "ic_stat_name",
              iconColor: "#5E5CE6",
              largeBody: body,
              actionTypeId: "",
              extra: { taskId: task.id },
            },
          ],
        });
        return true;
      } catch (err) {
        console.error("Failed to schedule native local notification:", err);
        return false;
      }
    } else {
      // Browser web fallback: clearly handle browser notifications and limitations
      if (typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission === "default") {
          await this.requestPermissionsWithRationale();
        }

        const diffMs = targetDate.getTime() - now.getTime();
        // Web notifications only trigger during the active browser session
        if (diffMs > 0 && diffMs < 2147483647 && Notification.permission === "granted") {
          setTimeout(() => {
            try {
              new Notification(title, {
                body,
                icon: "/favicon.ico",
              });
            } catch {
              // Graceful fallback
            }
          }, diffMs);
        }
      }
      return true;
    }
  }

  async ensureTimerChannelCreated(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;
    try {
      await LocalNotifications.createChannel({
        id: "daymark_focus_timer_v1",
        name: "Focus Timer",
        description: "Ongoing timer notifications for active focus sessions",
        importance: 2,
        visibility: 1,
        vibration: false,
        lights: false,
      });
    } catch (err) {
      console.warn("Failed to create timer channel:", err);
    }
  }

  async updateFocusTimerNotification(
    taskTitle: string,
    remainingSeconds: number,
    isRunning: boolean
  ): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;

    try {
      await this.ensureTimerChannelCreated();

      const hours = Math.floor(remainingSeconds / 3600);
      const minutes = Math.floor((remainingSeconds % 3600) / 60);
      const seconds = remainingSeconds % 60;
      const timeFormatted =
        hours > 0
          ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
          : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

      const title = isRunning
        ? `⏱️ ${timeFormatted} • Focusing: ${taskTitle}`
        : `⏸️ ${timeFormatted} (Paused) • ${taskTitle}`;

      const body = isRunning
        ? "Focus timer is currently active. Keep up the great work!"
        : "Focus timer paused. Tap to return to the app.";

      await LocalNotifications.schedule({
        notifications: [
          {
            id: 999999,
            title,
            body,
            channelId: "daymark_focus_timer_v1",
            smallIcon: "ic_stat_name",
            iconColor: "#4F46E5",
            ongoing: isRunning,
            autoCancel: false,
            silent: true,
            extra: { isFocusTimer: true },
          },
        ],
      });
    } catch (err) {
      console.warn("Failed to update focus timer notification:", err);
    }
  }

  async notifyFocusSessionCompleted(taskTitle: string): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;

    try {
      await this.cancelFocusTimerNotification();
      await this.ensureChannelCreated();

      await LocalNotifications.schedule({
        notifications: [
          {
            id: 999999,
            title: `🎉 Focus Session Complete!`,
            body: `Great job! You finished your focused session for: "${taskTitle}"`,
            channelId: REMINDER_CHANNEL_ID,
            smallIcon: "ic_stat_name",
            iconColor: "#10B981",
            autoCancel: true,
            ongoing: false,
          },
        ],
      });
    } catch (err) {
      console.warn("Failed to notify focus completion:", err);
    }
  }

  async cancelFocusTimerNotification(): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;

    try {
      await LocalNotifications.cancel({
        notifications: [{ id: 999999 }],
      });
    } catch (err) {
      console.warn("Failed to cancel focus timer notification:", err);
    }
  }

  async cancelReminder(taskId: string): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;

    try {
      const id = getNotificationId(taskId);
      await LocalNotifications.cancel({
        notifications: [{ id }],
      });
    } catch (err) {
      console.warn(`Failed to cancel notification for task ${taskId}:`, err);
    }
  }
}

export const notificationService = NotificationService.getInstance();
