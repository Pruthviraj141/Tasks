import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { Capacitor } from "@capacitor/core";

/**
 * Native Haptic Feedback service for Daymark.
 * Uses @capacitor/haptics on Android/iOS with graceful web fallbacks.
 * Never throws errors or interrupts business logic if unsupported.
 */
class HapticsService {
  private isNative = Capacitor.isNativePlatform();

  /**
   * Subtle selection feedback for checking off a task
   */
  async taskCompleted(): Promise<void> {
    try {
      if (this.isNative) {
        await Haptics.impact({ style: ImpactStyle.Light });
      } else if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate?.(12);
      }
    } catch {
      // Graceful fallback: do nothing
    }
  }

  /**
   * Medium impact when tasks are parsed, confirmed, and saved
   */
  async taskSaved(): Promise<void> {
    try {
      if (this.isNative) {
        await Haptics.notification({ type: NotificationType.Success });
      } else if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate?.([15, 40, 15]);
      }
    } catch {
      // Graceful fallback
    }
  }

  /**
   * Crisp feedback when voice recording finishes / transcript is captured
   */
  async voiceRecordingSuccess(): Promise<void> {
    try {
      if (this.isNative) {
        await Haptics.impact({ style: ImpactStyle.Medium });
      } else if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate?.(25);
      }
    } catch {
      // Graceful fallback
    }
  }

  /**
   * Light tactile tap for UI toggle or long-press
   */
  async selection(): Promise<void> {
    try {
      if (this.isNative) {
        await Haptics.selectionStart();
        await Haptics.selectionChanged();
        await Haptics.selectionEnd();
      } else if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate?.(8);
      }
    } catch {
      // Graceful fallback
    }
  }
}

export const haptics = new HapticsService();
