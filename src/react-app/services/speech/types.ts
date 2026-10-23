export interface SpeechServiceCallbacks {
  onPartialResult: (transcript: string) => void;
  onFinalResult: (transcript: string) => void;
  onError: (error: string) => void;
  onListeningChange: (isListening: boolean) => void;
}

export interface SpeechRecognitionService {
  isAvailable(): Promise<boolean>;
  checkPermission(): Promise<boolean>;
  requestPermission(): Promise<boolean>;
  start(callbacks: SpeechServiceCallbacks, locale?: string): Promise<void>;
  stop(): Promise<void>;
  cancel(): Promise<void>;
}
