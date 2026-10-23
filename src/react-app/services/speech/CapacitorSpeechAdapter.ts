import { SpeechRecognition } from "@capgo/capacitor-speech-recognition";
import type { PluginListenerHandle } from "@capacitor/core";
import type { SpeechRecognitionService, SpeechServiceCallbacks } from "./types";

export class CapacitorSpeechAdapter implements SpeechRecognitionService {
  private listenerHandles: PluginListenerHandle[] = [];
  private currentTranscript = "";

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
    this.currentTranscript = "";

    try {
      // Listen for partial and final transcription results
      const partialHandle = await SpeechRecognition.addListener(
        "partialResults",
        (event) => {
          const match =
            event.accumulatedText ||
            (event.matches && event.matches[0]) ||
            event.accumulated ||
            "";

          if (match) {
            this.currentTranscript = match;
            callbacks.onPartialResult(match);
          }
        }
      );
      this.listenerHandles.push(partialHandle);

      // Listen for listening state transitions
      const stateHandle = await SpeechRecognition.addListener(
        "listeningState",
        (event) => {
          const isListening =
            event.state === "started" ||
            event.state === "startingListening" ||
            event.status === "started";
          callbacks.onListeningChange(isListening);

          if (
            event.state === "stopped" ||
            event.status === "stopped"
          ) {
            callbacks.onFinalResult(this.currentTranscript);
          }
        }
      );
      this.listenerHandles.push(stateHandle);

      // Listen for recognition errors
      const errorHandle = await SpeechRecognition.addListener(
        "error",
        (event) => {
          console.warn("Native SpeechRecognition error:", event);
          callbacks.onError(event.message || "Speech recognition error");
        }
      );
      this.listenerHandles.push(errorHandle);

      // Start inline recognition (no popup dialog)
      callbacks.onListeningChange(true);
      await SpeechRecognition.start({
        language: locale,
        popup: false,
        partialResults: true,
      });
    } catch (err: unknown) {
      await this.cleanupListeners();
      const message = err instanceof Error ? err.message : "Failed to start speech recognition";
      callbacks.onError(message);
      callbacks.onListeningChange(false);
      throw err;
    }
  }

  async stop(): Promise<void> {
    try {
      await SpeechRecognition.stop();
    } catch (err) {
      console.warn("Error stopping native speech session:", err);
    } finally {
      await this.cleanupListeners();
    }
  }

  async cancel(): Promise<void> {
    try {
      await SpeechRecognition.forceStop({ timeout: 500 });
    } catch {
      try {
        await SpeechRecognition.stop();
      } catch {
        // Ignore
      }
    } finally {
      this.currentTranscript = "";
      await this.cleanupListeners();
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
