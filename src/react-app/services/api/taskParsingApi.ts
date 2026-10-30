import type {
  ParseTaskRequest,
  ParseTaskResponse,
  ParseTaskResult,
  TranscribeAndParseResponse,
  TranscribeAndParseResult,
} from "../../../shared/types/voiceTask";

import { Capacitor } from "@capacitor/core";
import { supabase } from "../../lib/supabaseClient";

export function getApiBaseUrl(): string {
  const envUrl =
    typeof import.meta !== "undefined" && import.meta && import.meta.env
      ? import.meta.env.VITE_API_BASE_URL
      : undefined;
  if (envUrl && typeof envUrl === "string" && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, "");
  }

  if (Capacitor.isNativePlatform()) {
    return "https://daymark.markyourday.workers.dev";
  }
  return "";
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.access_token) {
      return {
        Authorization: `Bearer ${session.access_token}`,
      };
    }
  } catch (err) {
    console.warn("Could not retrieve active Supabase session token:", err);
  }
  return {};
}

export interface TranscribeAudioRequest {
  audioBlob?: Blob;
  audioBase64?: string;
  mimeType?: string;
  referenceNow: string;
  timeZone: string;
  locale?: string;
}

/**
 * Sends complete recorded audio file to the Hono backend.
 * The backend transcribes it with Groq whisper-large-v3, then parses tasks
 * using Groq openai/gpt-oss-20b, keeping all Groq API keys server-side.
 */
export async function transcribeAndParseAudio(
  request: TranscribeAudioRequest,
  signal?: AbortSignal
): Promise<TranscribeAndParseResult> {
  const baseUrl = getApiBaseUrl();
  const endpoint = `${baseUrl}/api/transcribe-and-parse`;
  const authHeaders = await getAuthHeaders();

  let response: Response;

  try {
    if (request.audioBlob) {
      const formData = new FormData();
      const ext = request.mimeType?.includes("webm")
        ? "recording.webm"
        : request.mimeType?.includes("wav")
        ? "recording.wav"
        : "recording.m4a";

      formData.append("file", request.audioBlob, ext);
      formData.append("audio", request.audioBlob, ext);
      formData.append("referenceNow", request.referenceNow);
      formData.append("timeZone", request.timeZone);
      formData.append("locale", request.locale || "en-IN");

      response = await fetch(endpoint, {
        method: "POST",
        headers: {
          ...authHeaders,
        },
        body: formData,
        signal,
      });
    } else if (request.audioBase64) {
      response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({
          audioBase64: request.audioBase64,
          mimeType: request.mimeType || "audio/aac",
          referenceNow: request.referenceNow,
          timeZone: request.timeZone,
          locale: request.locale || "en-IN",
        }),
        signal,
      });
    } else {
      throw new Error("No audio recording provided to transcribe.");
    }
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("REQUEST_ABORTED");
    }
    console.error("Network failure calling transcribe-and-parse:", err);
    throw new Error("Could not connect to task parser. Please check your internet connection.");
  }

  let json: TranscribeAndParseResponse;
  try {
    json = (await response.json()) as TranscribeAndParseResponse;
  } catch (err) {
    console.error("Failed to parse JSON response from transcribe-and-parse:", err);
    throw new Error("Invalid response received from audio transcriber.");
  }

  if (!json.ok) {
    const errorMsg = json.error?.message || "Audio processing failed. Please retry.";
    throw new Error(errorMsg);
  }

  return json.data;
}

export async function parseTasksFromTranscript(
  request: ParseTaskRequest,
  signal?: AbortSignal
): Promise<ParseTaskResult> {
  const baseUrl = getApiBaseUrl();
  const endpoint = `${baseUrl}/api/parse-task`;
  const authHeaders = await getAuthHeaders();

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify(request),
      signal,
    });
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("REQUEST_ABORTED");
    }
    console.error("Network or fetch failure calling parse-task:", err);
    throw new Error("Network connection error. Your transcript draft is preserved.");
  }

  let json: ParseTaskResponse;
  try {
    json = (await response.json()) as ParseTaskResponse;
  } catch (err) {
    console.error("Failed to parse JSON response from parse-task:", err);
    throw new Error("Invalid response received from task parser.");
  }

  if (!json.ok) {
    const errorMsg = json.error?.message || "Task parsing failed. Please review or retry.";
    throw new Error(errorMsg);
  }

  return json.data;
}

