import { Capacitor } from "@capacitor/core";
import type { SpeechRecognitionService } from "./types";
import { CapacitorSpeechAdapter } from "./CapacitorSpeechAdapter";
import { BrowserSpeechAdapter } from "./BrowserSpeechAdapter";

let speechServiceInstance: SpeechRecognitionService | null = null;

export function getSpeechRecognitionService(): SpeechRecognitionService {
  if (speechServiceInstance) {
    return speechServiceInstance;
  }

  if (Capacitor.isNativePlatform()) {
    speechServiceInstance = new CapacitorSpeechAdapter();
  } else {
    speechServiceInstance = new BrowserSpeechAdapter();
  }

  return speechServiceInstance;
}

export * from "./types";
