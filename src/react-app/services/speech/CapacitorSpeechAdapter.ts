import { SpeechRecognition } from "@capgo/capacitor-speech-recognition";
import type { PluginListenerHandle } from "@capacitor/core";
import type { SpeechRecognitionService, SpeechServiceCallbacks } from "./types";

/**
 * CapacitorSpeechAdapter — Continuous listening on Android.
 *
 * Android's native SpeechRecognition has a built-in silence timeout (~5s)
 * that forcibly stops the recognizer. To provide uninterrupted listening
 * (until the user explicitly presses Stop), we:
 *
 *  1. Track accumulated transcript across sessions.
 *  2. When the native engine stops (timeout / error) and the user has NOT
 *     pressed Stop, commit the partial text and immediately restart a new
 *     recognition session.
 *  3. Listeners are re-registered every restart so there are no stale handles.
 */
export class CapacitorSpeechAdapter implements SpeechRecognitionService {
  private listenerHandles: PluginListenerHandle[] = [];

  /** Full transcript accumulated across all auto-restart sessions. */
  private accumulatedTranscript = "";

  /** Partial text from the currently active native session only. */
  private currentSessionPartial = "";

  /** True only when the user explicitly calls stop() or cancel(). */
  private isUserStopped = false;

  private activeCallbacks: SpeechServiceCallbacks | null = null;
  private activeLocale = "en-IN";

  /** Guard to prevent concurrent restarts from racing each other. */
  private isRestarting = false;

  async isAvailable(): Promise<boolean> {
    try {
      const res = await SpeechRecognition.available();
      return Boolean(res.available);
    } catch {
      return false;
    }
  }

  async checkPermission(): Promise<boolean> {
    try {
      const status = await SpeechRecognition.checkPermissions();
      return status.speechRecognition === "granted";
    } catch {
      return false;
    }
  }

  async requestPermission(): Promise<boolean> {
    try {
      const status = await SpeechRecognition.requestPermissions();
      return status.speechRecognition === "granted";
    } catch {
      return false;
    }
  }

  async start(callbacks: SpeechServiceCallbacks, locale = "en-IN"): Promise<void> {
    await this.cleanupListeners();

    this.accumulatedTranscript = "";
    this.currentSessionPartial = "";
    this.isUserStopped = false;
    this.isRestarting = false;
    this.activeCallbacks = callbacks;
    this.activeLocale = locale;

    await this.startNativeSession(callbacks, locale);
  }

  /**
   * Starts (or restarts) the native engine and wires up all listeners.
   * Always cleans up old handles first so there are no duplicates.
   */
  private async startNativeSession(
    callbacks: SpeechServiceCallbacks,
    locale: string
  ): Promise<void> {
    await this.cleanupListeners();

    if (this.isUserStopped) return;

    try {
      // Partial results — merge current session text with accumulated base.
      const partialHandle = await SpeechRecognition.addListener(
        "partialResults",
        (event) => {
          if (this.isUserStopped) return;

          const sessionText =
            event.accumulatedText ||
            (event.matches && event.matches[0]) ||
            event.accumulated ||
            "";

          if (sessionText) {
            this.currentSessionPartial = sessionText;
            callbacks.onPartialResult(this.buildFullTranscript(sessionText));
          }
        }
      );
      this.listenerHandles.push(partialHandle);

      // State changes — restart seamlessly when the native engine times out.
      const stateHandle = await SpeechRecognition.addListener(
        "listeningState",
        (event) => {
          const stopped =
            event.state === "stopped" || event.status === "stopped";
          const started =
            event.state === "started" ||
            event.state === "startingListening" ||
            event.status === "started";

          if (started) {
            callbacks.onListeningChange(true);
          }

          if (stopped && !this.isUserStopped && !this.isRestarting) {
            this.commitCurrentSession();
            this.scheduleRestart();
          }
        }
      );
      this.listenerHandles.push(stateHandle);

      // Errors — restart on transient errors; surface only fatal ones.
      const errorHandle = await SpeechRecognition.addListener(
        "error",
        (event) => {
          if (this.isUserStopped) return;

          const msg: string = event.message || event.code || "";
          // Android error codes 7 (NO_MATCH) and 8 (SPEECH_TIMEOUT) are transient.
          const isTransient =
            msg.includes("no match") ||
            msg.includes("speech timeout") ||
            msg.includes("7") ||
            msg.includes("8");

          if (isTransient && !this.isRestarting) {
            this.commitCurrentSession();
            this.scheduleRestart();
          } else if (!isTransient) {
            console.warn("CapacitorSpeechAdapter fatal error:", event);
            callbacks.onError(msg || "Speech recognition error");
          }
        }
      );
      this.listenerHandles.push(errorHandle);

      callbacks.onListeningChange(true);

      await SpeechRecognition.start({
        language: locale,
        popup: false,
        partialResults: true,
      });
    } catch (err: unknown) {
      await this.cleanupListeners();
      if (!this.isUserStopped) {
        const message =
          err instanceof Error ? err.message : "Failed to start speech recognition";
        callbacks.onError(message);
        callbacks.onListeningChange(false);
      }
      throw err;
    }
  }

  /** Commit the current session partial into the accumulated transcript. */
  private commitCurrentSession(): void {
    if (this.currentSessionPartial) {
      this.accumulatedTranscript = this.buildFullTranscript(
        this.currentSessionPartial
      );
      this.currentSessionPartial = "";
    }
  }

  /** Build the full display string: accumulated base + live session partial. */
  private buildFullTranscript(sessionPartial: string): string {
    if (!this.accumulatedTranscript) return sessionPartial;
    return `${this.accumulatedTranscript} ${sessionPartial}`;
  }

  /**
   * Restart the native session after a short delay.
   * The isRestarting guard prevents concurrent restarts from stacking.
   */
  private scheduleRestart(): void {
    if (this.isUserStopped || this.isRestarting) return;
    this.isRestarting = true;

    setTimeout(async () => {
      if (this.isUserStopped || !this.activeCallbacks) {
        this.isRestarting = false;
        return;
      }
      try {
        await this.startNativeSession(this.activeCallbacks, this.activeLocale);
      } catch {
        this.activeCallbacks?.onError(
          "Microphone session ended. Tap mic to retry."
        );
        this.activeCallbacks?.onListeningChange(false);
      } finally {
        this.isRestarting = false;
      }
    }, 150);
  }

  async stop(): Promise<void> {
    this.isUserStopped = true;
    this.commitCurrentSession();

    try {
      await SpeechRecognition.stop();
    } catch (err) {
      console.warn("Error stopping native speech session:", err);
    } finally {
      await this.cleanupListeners();
      if (this.activeCallbacks) {
        this.activeCallbacks.onListeningChange(false);
        this.activeCallbacks.onFinalResult(this.accumulatedTranscript);
      }
    }
  }

  async cancel(): Promise<void> {
    this.isUserStopped = true;
    try {
      await SpeechRecognition.forceStop({ timeout: 500 });
    } catch {
      try {
        await SpeechRecognition.stop();
      } catch {
        // Ignore
      }
    } finally {
      this.accumulatedTranscript = "";
      this.currentSessionPartial = "";
      await this.cleanupListeners();
      if (this.activeCallbacks) {
        this.activeCallbacks.onListeningChange(false);
      }
    }
  }

  private async cleanupListeners(): Promise<void> {
    for (const handle of this.listenerHandles) {
      try {
        await handle.remove();
      } catch {
        // Ignore cleanup errors
      }
    }
    this.listenerHandles = [];
  }
}
