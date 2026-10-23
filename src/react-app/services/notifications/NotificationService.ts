import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
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

export class NotificationService {
  private static instance: NotificationService;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
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

  async requestPermissions(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      if (typeof window !== "undefined" && "Notification" in window) {
        try {
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

  async scheduleReminder(task: Pick<Task, "id" | "title" | "reminderDate" | "reminderTime" | "notes">): Promise<boolean> {
    if (!task.reminderDate || !task.reminderTime) {
      return false;
    }

    // Parse target local timestamp
    const targetDate = new Date(`${task.reminderDate}T${task.reminderTime}:00`);
    const now = new Date();

    if (isNaN(targetDate.getTime()) || targetDate.getTime() <= now.getTime()) {
      console.warn("Reminder date/time is in the past or invalid; skipping notification schedule.");
      return false;
    }

    const notificationId = getNotificationId(task.id);

    if (Capacitor.isNativePlatform()) {
      try {
        const hasPerm = await this.checkPermissions();
        if (!hasPerm) {
          const granted = await this.requestPermissions();
          if (!granted) {
            console.warn("Notification permission denied by user; task saved without notification.");
            return false;
          }
        }

        // Cancel previous notification if any
        await this.cancelReminder(task.id);

        await LocalNotifications.schedule({
          notifications: [
            {
              id: notificationId,
              title: task.title,
              body: task.notes || "Daymark Task Reminder",
              schedule: { at: targetDate },
              sound: undefined,
              smallIcon: "ic_stat_name",
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
      // Browser web fallback (set a timeout if within current session)
      const diffMs = targetDate.getTime() - now.getTime();
      if (diffMs > 0 && diffMs < 2147483647 && typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        setTimeout(() => {
          try {
            new Notification(task.title, { body: task.notes || "Daymark Task Reminder" });
          } catch {
            // Ignore web notification failure
          }
        }, diffMs);
      }
      return true;
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
