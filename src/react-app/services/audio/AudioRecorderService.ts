import { Capacitor } from "@capacitor/core";
import { CapacitorAudioRecorder } from "@capgo/capacitor-audio-recorder";
import { Filesystem } from "@capacitor/filesystem";
import { VoiceRecorder } from "capacitor-voice-recorder";

export interface RecordedAudioResult {
  blob: Blob;
  base64?: string;
  mimeType: string;
  durationMs: number;
}

export type AudioLevelCallback = (level: number) => void;

export interface AudioRecorder {
  isAvailable(): Promise<boolean>;
  checkPermission(): Promise<boolean>;
  requestPermission(): Promise<boolean>;
  startRecording(onAudioLevel?: AudioLevelCallback): Promise<void>;
  stopRecording(): Promise<RecordedAudioResult>;
  cancelRecording(): Promise<void>;
  isRecording(): boolean;
}

/**
 * AndroidAudioRecorderService — Native Android Audio Recording via @capgo/capacitor-audio-recorder.
 *
 * Records continuous raw audio without Google/Android Speech Recognition silence timeouts.
 * Recording continues through long pauses (5s, 10s, or more) until the user explicitly taps Stop.
 * Captures in genuine MPEG-4 AAC (.m4a) container with valid ISO BMFF headers, matching Groq Whisper.
 * Real-time amplitude polling powers the live waveform visualizer on Android.
 */
export class AndroidAudioRecorderService implements AudioRecorder {
  private recording = false;
  private startTime = 0;
  private amplitudeTimer: ReturnType<typeof setInterval> | null = null;
  private audioLevelCallback: AudioLevelCallback | null = null;

  async isAvailable(): Promise<boolean> {
    try {
      if (Capacitor.isPluginAvailable("CapacitorAudioRecorder")) {
        return true;
      }
      if (Capacitor.isPluginAvailable("VoiceRecorder")) {
        const canRecord = await VoiceRecorder.canDeviceVoiceRecord();
        return Boolean(canRecord.value);
      }
    } catch {
      // Fallback
    }
    return false;
  }

  async checkPermission(): Promise<boolean> {
    try {
      if (Capacitor.isPluginAvailable("CapacitorAudioRecorder")) {
        const status = await CapacitorAudioRecorder.checkPermissions();
        return status.recordAudio === "granted";
      }
      if (Capacitor.isPluginAvailable("VoiceRecorder")) {
        const status = await VoiceRecorder.hasAudioRecordingPermission();
        return Boolean(status.value);
      }
    } catch {
      // Fallback
    }
    return false;
  }

  async requestPermission(): Promise<boolean> {
    try {
      if (Capacitor.isPluginAvailable("CapacitorAudioRecorder")) {
        const status = await CapacitorAudioRecorder.requestPermissions();
        return status.recordAudio === "granted";
      }
      if (Capacitor.isPluginAvailable("VoiceRecorder")) {
        const status = await VoiceRecorder.requestAudioRecordingPermission();
        return Boolean(status.value);
      }
    } catch {
      // Fallback
    }
    return false;
  }

  async startRecording(onAudioLevel?: AudioLevelCallback): Promise<void> {
    this.startTime = Date.now();
    this.recording = true;
    this.audioLevelCallback = onAudioLevel || null;

    if (Capacitor.isPluginAvailable("CapacitorAudioRecorder")) {
      await CapacitorAudioRecorder.startRecording({
        bitRate: 192000,
        sampleRate: 44100,
      });
      this.startAmplitudePolling();
      return;
    }

    if (Capacitor.isPluginAvailable("VoiceRecorder")) {
      await VoiceRecorder.startRecording();
      return;
    }

    throw new Error("Native AudioRecorder plugin is not available on this device.");
  }

  private startAmplitudePolling(): void {
    this.stopAmplitudePolling();
    this.amplitudeTimer = setInterval(async () => {
      if (!this.recording) return;
      try {
        const amp = await CapacitorAudioRecorder.getCurrentAmplitude();
        if (this.audioLevelCallback && typeof amp?.value === "number") {
          // Normalize peak amplitude between 0.08 and 1.0 for realistic responsive waveforms
          const scaled = Math.min(1.0, Math.max(0.08, amp.value * 1.6));
          this.audioLevelCallback(scaled);
        }
      } catch {
        // Ignore amplitude query failure
      }
    }, 80);
  }

  private stopAmplitudePolling(): void {
    if (this.amplitudeTimer) {
      clearInterval(this.amplitudeTimer);
      this.amplitudeTimer = null;
    }
  }

  async stopRecording(): Promise<RecordedAudioResult> {
    this.recording = false;
    this.stopAmplitudePolling();
    const durationMs = Date.now() - this.startTime;

    if (Capacitor.isPluginAvailable("CapacitorAudioRecorder")) {
      const result = await CapacitorAudioRecorder.stopRecording();
      if (!result.uri && !result.blob) {
        throw new Error("No audio recording captured.");
      }

      let blob: Blob | null = null;
      let base64: string | undefined = undefined;

      if (result.blob) {
        blob = result.blob;
      } else if (result.uri) {
        // Read native file directly from filesystem into memory
        try {
          if (Capacitor.isPluginAvailable("Filesystem")) {
            const fsRes = await Filesystem.readFile({ path: result.uri });
            if (typeof fsRes.data === "string" && fsRes.data.length > 0) {
              base64 = fsRes.data;
              blob = this.base64ToBlob(fsRes.data, "audio/mp4");
            } else if (fsRes.data instanceof Blob && fsRes.data.size > 0) {
              blob = fsRes.data;
            }
          }
        } catch (fsErr) {
          console.warn("Filesystem.readFile failed, falling back to convertFileSrc:", fsErr);
        }

        // Fallback: convert file URI to webview asset and fetch as Blob
        if (!blob || blob.size === 0) {
          try {
            const fileSrc = Capacitor.convertFileSrc(result.uri);
            const res = await fetch(fileSrc);
            blob = await res.blob();
          } catch (fetchErr) {
            console.warn("fetch(convertFileSrc) failed:", fetchErr);
          }
        }
      }

      if (!blob || blob.size === 0) {
        throw new Error("Recorded audio file was empty or could not be read.");
      }

      return {
        blob,
        base64,
        mimeType: "audio/mp4",
        durationMs: result.duration || durationMs,
      };
    }

    if (Capacitor.isPluginAvailable("VoiceRecorder")) {
      const result = await VoiceRecorder.stopRecording();
      const base64 = result.value.recordDataBase64;
      if (!base64) {
        throw new Error("No audio recording data captured.");
      }
      const mimeType = result.value.mimeType || "audio/aac";
      const blob = this.base64ToBlob(base64, mimeType);
      return {
        blob,
        base64,
        mimeType,
        durationMs: result.value.msDuration || durationMs,
      };
    }

    throw new Error("Native AudioRecorder plugin is not available.");
  }

  async cancelRecording(): Promise<void> {
    this.recording = false;
    this.stopAmplitudePolling();
    try {
      if (Capacitor.isPluginAvailable("CapacitorAudioRecorder")) {
        await CapacitorAudioRecorder.cancelRecording();
      } else if (Capacitor.isPluginAvailable("VoiceRecorder")) {
        await VoiceRecorder.stopRecording();
      }
    } catch {
      // Ignore cancellation error
    }
  }

  isRecording(): boolean {
    return this.recording;
  }

  private base64ToBlob(base64: string, mimeType: string): Blob {
    const clean = base64.replace(/^data:[^;]+;base64,/, "");
    const binary = atob(clean);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: mimeType });
  }
}

/**
 * WebAudioRecorderService — Browser Audio Recording via HTML5 MediaRecorder & Web Audio API.
 *
 * Uses navigator.mediaDevices.getUserMedia() to capture uninterrupted audio.
 * Live volume metering via Web Audio API AnalyserNode powers the live waveform.
 * Recording continues through 5s, 10s, or longer pauses until user explicitly presses Stop.
 */
export class WebAudioRecorderService implements AudioRecorder {
  private recording = false;
  private startTime = 0;
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private animationFrameId: number | null = null;
  private audioLevelCallback: AudioLevelCallback | null = null;

  async isAvailable(): Promise<boolean> {
    return (
      typeof navigator !== "undefined" &&
      !!navigator.mediaDevices &&
      !!navigator.mediaDevices.getUserMedia
    );
  }

  async checkPermission(): Promise<boolean> {
    if (typeof navigator !== "undefined" && navigator.permissions?.query) {
      try {
        const res = await navigator.permissions.query({ name: "microphone" as PermissionName });
        return res.state === "granted";
      } catch {
        // Some browsers don't support querying microphone permission
      }
    }
    return true;
  }

  async requestPermission(): Promise<boolean> {
    try {
      if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop());
        return true;
      }
    } catch {
      return false;
    }
    return false;
  }

  async startRecording(onAudioLevel?: AudioLevelCallback): Promise<void> {
    this.audioLevelCallback = onAudioLevel || null;
    this.startTime = Date.now();
    this.recording = true;
    this.audioChunks = [];

    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    // 1. Initialize AudioContext for live waveform / volume metering
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.audioContext = new AudioCtx();
        if (this.audioContext.state === "suspended") {
          await this.audioContext.resume();
        }
        const source = this.audioContext.createMediaStreamSource(this.mediaStream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 64;
        source.connect(this.analyser);
        this.startLevelLoop();
      }
    } catch (err) {
      console.warn("Web AudioContext metering setup failed:", err);
    }

    // 2. Initialize MediaRecorder for complete continuous capture
    const mimeType = this.getSupportedMimeType();
    this.mediaRecorder = new MediaRecorder(this.mediaStream, {
      mimeType: mimeType || undefined,
    });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    // Slice chunks every 250ms so all audio data is captured reliably
    this.mediaRecorder.start(250);
  }

  async stopRecording(): Promise<RecordedAudioResult> {
    this.recording = false;
    this.stopLevelLoop();
    const durationMs = Date.now() - this.startTime;

    if (!this.mediaRecorder) {
      this.cleanupStream();
      throw new Error("No active recording session.");
    }

    const mimeType = this.mediaRecorder.mimeType || "audio/webm";

    return new Promise<RecordedAudioResult>((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error("MediaRecorder instance was lost."));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.audioChunks, { type: mimeType });
        this.cleanupStream();

        if (blob.size === 0) {
          reject(new Error("Recording was empty."));
          return;
        }

        resolve({
          blob,
          mimeType,
          durationMs,
        });
      };

      try {
        if (this.mediaRecorder.state !== "inactive") {
          this.mediaRecorder.stop();
        } else {
          const blob = new Blob(this.audioChunks, { type: mimeType });
          this.cleanupStream();
          resolve({ blob, mimeType, durationMs });
        }
      } catch (err) {
        this.cleanupStream();
        reject(err);
      }
    });
  }

  async cancelRecording(): Promise<void> {
    this.recording = false;
    this.stopLevelLoop();

    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      try {
        this.mediaRecorder.stop();
      } catch {
        // Ignore
      }
    }

    this.cleanupStream();
    this.audioChunks = [];
  }

  isRecording(): boolean {
    return this.recording;
  }

  private startLevelLoop(): void {
    if (!this.analyser) return;

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    const update = () => {
      if (!this.recording || !this.analyser) return;

      this.analyser.getByteFrequencyData(dataArray);

      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / dataArray.length);
      const normalizedLevel = Math.min(1.0, Math.max(0.08, rms / 128));

      if (this.audioLevelCallback) {
        this.audioLevelCallback(normalizedLevel);
      }

      this.animationFrameId = requestAnimationFrame(update);
    };

    this.animationFrameId = requestAnimationFrame(update);
  }

  private stopLevelLoop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private cleanupStream(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // Ignore
        }
      });
      this.mediaStream = null;
    }

    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch {
        // Ignore
      }
      this.audioContext = null;
    }

    this.analyser = null;
    this.mediaRecorder = null;
  }

  private getSupportedMimeType(): string {
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/aac",
      "audio/ogg;codecs=opus",
      "audio/wav",
    ];

    for (const mime of candidates) {
      if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(mime)) {
        return mime;
      }
    }

    return "";
  }
}

/**
 * Factory providing the appropriate platform recorder:
 * - Native Android: AndroidAudioRecorderService
 * - Web Browser: WebAudioRecorderService
 */
export function getAudioRecorder(): AudioRecorder {
  if (
    Capacitor.isNativePlatform() &&
    (Capacitor.isPluginAvailable("CapacitorAudioRecorder") ||
      Capacitor.isPluginAvailable("VoiceRecorder"))
  ) {
    return new AndroidAudioRecorderService();
  }
  return new WebAudioRecorderService();
}

export const audioRecorderService = getAudioRecorder();
