import type { SpeechRecognitionService, SpeechServiceCallbacks } from "./types";

interface IWindowSpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: ISpeechRecognitionEvent) => void) | null;
  onerror: ((event: { error: string; message?: string }) => void) | null;
  onend: (() => void) | null;
}

interface ISpeechRecognitionEvent {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [index: number]: {
        transcript: string;
      };
    };
  };
}

export class BrowserSpeechAdapter implements SpeechRecognitionService {
  private recognition: IWindowSpeechRecognition | null = null;
  private currentTranscript = "";
  private isUserStopped = false;
  private activeCallbacks: SpeechServiceCallbacks | null = null;
  private activeLocale = "en-IN";

  private getConstructor(): (new () => IWindowSpeechRecognition) | null {
    if (typeof window === "undefined") return null;
    const win = window as unknown as {
      SpeechRecognition?: new () => IWindowSpeechRecognition;
      webkitSpeechRecognition?: new () => IWindowSpeechRecognition;
    };
    return win.SpeechRecognition || win.webkitSpeechRecognition || null;
  }

  async isAvailable(): Promise<boolean> {
    return this.getConstructor() !== null;
  }

  async checkPermission(): Promise<boolean> {
    if (typeof navigator === "undefined" || !navigator.permissions) {
      return true;
    }
    try {
      const res = await navigator.permissions.query({ name: "microphone" as PermissionName });
      return res.state === "granted";
    } catch {
      return true;
    }
  }

  async requestPermission(): Promise<boolean> {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      return true;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      return true;
    } catch {
      return false;
    }
  }

  async start(callbacks: SpeechServiceCallbacks, locale = "en-IN"): Promise<void> {
    const Ctor = this.getConstructor();
    if (!Ctor) {
      throw new Error("SPEECH_NOT_SUPPORTED");
    }

    this.cancel();
    this.currentTranscript = "";
    this.isUserStopped = false;
    this.activeCallbacks = callbacks;
    this.activeLocale = locale;

    const startSession = () => {
      const recognition = new Ctor();
      this.recognition = recognition;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = this.activeLocale;

      recognition.onresult = (event: ISpeechRecognitionEvent) => {
        let fullTranscript = "";
        for (let i = 0; i < event.results.length; i++) {
          fullTranscript += event.results[i][0].transcript + " ";
        }
        const trimmed = fullTranscript.trim();
        if (trimmed) {
          this.currentTranscript = trimmed;
          callbacks.onPartialResult(trimmed);
        }
      };

      recognition.onerror = (event) => {
        // "no-speech" occurs during natural pauses between sentences - do not treat as fatal error
        if (event.error === "no-speech") {
          return;
        }
        console.warn("Browser SpeechRecognition error:", event.error);
        if (this.isUserStopped) return;
        callbacks.onError(event.error || "Speech error");
      };

      recognition.onend = () => {
        // Keep listening across natural conversational pauses until user explicitly presses Stop
        if (!this.isUserStopped) {
          try {
            startSession();
            return;
          } catch (err) {
            console.warn("Speech recognition auto-restart failed:", err);
          }
        }
        callbacks.onListeningChange(false);
        callbacks.onFinalResult(this.currentTranscript);
      };

      try {
        callbacks.onListeningChange(true);
        recognition.start();
      } catch (err: unknown) {
        if (!this.isUserStopped) {
          callbacks.onListeningChange(false);
          const message = err instanceof Error ? err.message : "Failed to start speech";
          callbacks.onError(message);
          throw err;
        }
      }
    };

    startSession();
  }

  async stop(): Promise<void> {
    this.isUserStopped = true;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // Ignore
      }
    }
    if (this.activeCallbacks) {
      this.activeCallbacks.onListeningChange(false);
      this.activeCallbacks.onFinalResult(this.currentTranscript);
    }
  }

  async cancel(): Promise<void> {
    this.isUserStopped = true;
    this.currentTranscript = "";
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {
        // Ignore
      }
      this.recognition = null;
    }
    if (this.activeCallbacks) {
      this.activeCallbacks.onListeningChange(false);
    }
  }
}
