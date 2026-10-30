import { Hono } from "hono";
import { cors } from "hono/cors";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { ParseTaskRequestSchema } from "../shared/types/voiceTask";
import { parseTasksWithGroq } from "./parser";
import { transcribeAudioWithGroq } from "./transcriber";

let jwksClient: ReturnType<typeof createRemoteJWKSet> | null = null;
let cachedJwksUrl: string | null = null;

function getJwks(url: string) {
  if (!jwksClient || cachedJwksUrl !== url) {
    jwksClient = createRemoteJWKSet(new URL(url));
    cachedJwksUrl = url;
  }
  return jwksClient;
}

interface WorkerEnv extends Env {
  SUPABASE_URL?: string;
  SUPABASE_JWKS_URL?: string;
  SUPABASE_SECRET_KEY?: string;
  SUPABASE_JWT_SECRET?: string;
}

async function verifySupabaseAuthToken(
  authHeader: string | undefined,
  env: WorkerEnv
): Promise<{ success: boolean; userId?: string; error?: string }> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      success: false,
      error: "Missing or invalid Authorization header. A valid Supabase Bearer token is required.",
    };
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    return { success: false, error: "Empty Bearer token." };
  }

  const jwksUrl =
    env.SUPABASE_JWKS_URL ||
    (env.SUPABASE_URL
      ? `${env.SUPABASE_URL.replace(/\/+$/, "")}/auth/v1/.well-known/jwks.json`
      : "https://gngoelfmkxiqcluojefl.supabase.co/auth/v1/.well-known/jwks.json");

  // 1. Try JWKS asymmetric verification
  if (jwksUrl) {
    try {
      const JWKS = getJwks(jwksUrl);
      const { payload } = await jwtVerify(token, JWKS);
      if (payload && payload.sub) {
        return { success: true, userId: payload.sub };
      }
    } catch {
      // Fall through to symmetric secret verification if available
    }
  }

  // 2. Symmetric secret verification (HS256)
  const secret = env.SUPABASE_JWT_SECRET || env.SUPABASE_SECRET_KEY;
  if (secret) {
    try {
      const secretBytes = new TextEncoder().encode(secret);
      const { payload } = await jwtVerify(token, secretBytes);
      if (payload && payload.sub) {
        return { success: true, userId: payload.sub };
      }
    } catch {
      // Signature mismatch
    }
  }

  return {
    success: false,
    error: "Unauthorized: Invalid or expired Supabase authentication token.",
  };
}

const app = new Hono<{ Bindings: Env }>();

// Enable CORS for web dev, preview, and Capacitor mobile webviews
app.use(
  "/api/*",
  cors({
    origin: (origin) => {
      if (
        !origin ||
        origin.includes("localhost") ||
        origin.startsWith("capacitor://") ||
        origin.includes("cloudflare.com") ||
        origin.includes("workers.dev") ||
        origin.includes("pages.dev")
      ) {
        return origin || "*";
      }
      return origin || "*";
    },
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

function getGroqApiKey(c: { env?: Env }): string | undefined {
  const globalEnv = (
    globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }
  ).process?.env;
  const envAny = c.env as unknown as Record<string, string | undefined> | undefined;
  return (
    c.env?.GROQ_API_KEY ||
    envAny?.Groq_api_key ||
    envAny?.groq_api_key ||
    globalEnv?.GROQ_API_KEY ||
    globalEnv?.Groq_api_key ||
    globalEnv?.groq_api_key
  );
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const cleanBase64 = base64.replace(/^data:[^;]+;base64,/, "");
  const binaryString = atob(cleanBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

function getFileNameForMime(mime: string): string {
  if (mime.includes("mp4") || mime.includes("m4a")) return "recording.m4a";
  if (mime.includes("webm")) return "recording.webm";
  if (mime.includes("wav")) return "recording.wav";
  if (mime.includes("ogg")) return "recording.ogg";
  if (mime.includes("mpeg") || mime.includes("mp3")) return "recording.mp3";
  return "recording.m4a";
}

export async function inspectAudioFormat(
  blob: Blob,
  fallbackName = "recording.m4a"
): Promise<{ fileName: string; mimeType: string }> {
  try {
    const headerBuffer = await blob.slice(0, 32).arrayBuffer();
    const bytes = new Uint8Array(headerBuffer);

    // 1. ISO BMFF (MP4 / M4A): bytes 4..7 === 'ftyp'
    if (
      bytes.length >= 8 &&
      bytes[4] === 0x66 &&
      bytes[5] === 0x74 &&
      bytes[6] === 0x79 &&
      bytes[7] === 0x70
    ) {
      return { fileName: "recording.m4a", mimeType: "audio/mp4" };
    }

    // 2. WebM / Matroska: 0x1A 0x45 0xDF 0xA3
    if (
      bytes.length >= 4 &&
      bytes[0] === 0x1a &&
      bytes[1] === 0x45 &&
      bytes[2] === 0xdf &&
      bytes[3] === 0xa3
    ) {
      return { fileName: "recording.webm", mimeType: "audio/webm" };
    }

    // 3. RIFF WAV: 'RIFF' .... 'WAVE'
    if (
      bytes.length >= 12 &&
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x41 &&
      bytes[10] === 0x56 &&
      bytes[11] === 0x45
    ) {
      return { fileName: "recording.wav", mimeType: "audio/wav" };
    }

    // 4. Ogg: 'OggS'
    if (
      bytes.length >= 4 &&
      bytes[0] === 0x4f &&
      bytes[1] === 0x67 &&
      bytes[2] === 0x67 &&
      bytes[3] === 0x53
    ) {
      return { fileName: "recording.ogg", mimeType: "audio/ogg" };
    }

    // 5. MP3: 'ID3' or MPEG sync
    if (
      (bytes.length >= 3 && bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) ||
      (bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0 && (bytes[1] & 0x18) !== 0x08)
    ) {
      return { fileName: "recording.mp3", mimeType: "audio/mpeg" };
    }

    // 6. FLAC: 'fLaC'
    if (
      bytes.length >= 4 &&
      bytes[0] === 0x66 &&
      bytes[1] === 0x4c &&
      bytes[2] === 0x61 &&
      bytes[3] === 0x43
    ) {
      return { fileName: "recording.flac", mimeType: "audio/flac" };
    }
  } catch {
    // Fallback
  }

  const cleanFallback = fallbackName.includes(".") ? fallbackName : "recording.m4a";
  return { fileName: cleanFallback, mimeType: blob.type || "audio/mp4" };
}

// Lightweight health check without AI model invocation
app.get("/api/health", (c) => {
  return c.json({
    ok: true,
    service: "daymark-api",
  });
});

// Direct task parsing endpoint from text using Groq openai/gpt-oss-20b
app.post("/api/parse-task", async (c) => {
  // Validate Supabase session token
  const authHeader = c.req.header("Authorization");
  const authResult = await verifySupabaseAuthToken(authHeader, c.env as WorkerEnv);
  if (!authResult.success) {
    return c.json(
      {
        ok: false,
        error: {
          code: "UNAUTHORIZED",
          message: authResult.error || "A valid authenticated session is required to parse tasks.",
        },
      },
      401
    );
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json(
      {
        ok: false,
        error: {
          code: "INVALID_JSON",
          message: "Request body must be valid JSON.",
        },
      },
      400
    );
  }

  // Validate request parameters with Zod
  const validation = ParseTaskRequestSchema.safeParse(body);
  if (!validation.success) {
    const issue = validation.error.issues[0];
    return c.json(
      {
        ok: false,
        error: {
          code: "INVALID_REQUEST",
          message: issue?.message || "Invalid request payload.",
        },
      },
      400
    );
  }

  const apiKey = getGroqApiKey(c);
  if (!apiKey || !apiKey.trim()) {
    return c.json(
      {
        ok: false,
        error: {
          code: "GROQ_API_KEY_MISSING",
          message: "Task understanding is temporarily unavailable. GROQ_API_KEY is not configured.",
        },
      },
      503
    );
  }

  try {
    const result = await parseTasksWithGroq(apiKey, validation.data);
    return c.json({
      ok: true,
      data: result,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "UNKNOWN_ERROR";
    console.error("Task parsing error:", errorMsg);

    if (errorMsg.includes("429")) {
      return c.json(
        {
          ok: false,
          error: {
            code: "RATE_LIMITED",
            message: "Groq inference rate limit reached. Please wait a moment and retry.",
          },
        },
        429
      );
    }

    return c.json(
      {
        ok: false,
        error: {
          code: "AI_PARSING_FAILED",
          message: "Unable to extract tasks from speech. Please review or retry.",
        },
      },
      500
    );
  }
});

// Full audio recording transcription (whisper-large-v3) + task extraction (gpt-oss-20b)
app.post("/api/transcribe-and-parse", async (c) => {
  // Validate Supabase session token
  const authHeader = c.req.header("Authorization");
  const authResult = await verifySupabaseAuthToken(authHeader, c.env as WorkerEnv);
  if (!authResult.success) {
    return c.json(
      {
        ok: false,
        error: {
          code: "UNAUTHORIZED",
          message: authResult.error || "A valid authenticated session is required to parse audio.",
        },
      },
      401
    );
  }

  const apiKey = getGroqApiKey(c);
  if (!apiKey || !apiKey.trim()) {
    return c.json(
      {
        ok: false,
        error: {
          code: "GROQ_API_KEY_MISSING",
          message: "Voice understanding is temporarily unavailable. GROQ_API_KEY is not configured.",
        },
      },
      503
    );
  }

  let audioBlob: Blob | null = null;
  let fileName = "recording.m4a";
  let referenceNow = new Date().toISOString().slice(0, 19);
  let timeZone = "Asia/Kolkata";
  let locale = "en-IN";

  const contentType = c.req.header("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    try {
      const formData = await c.req.formData();
      const fileEntry = formData.get("file") || formData.get("audio");
      if (fileEntry && typeof fileEntry === "object" && "size" in fileEntry) {
        audioBlob = fileEntry as Blob;
        fileName = (fileEntry as { name?: string }).name || "recording.m4a";
      }

      const refNowParam = formData.get("referenceNow");
      if (typeof refNowParam === "string" && refNowParam.trim()) {
        referenceNow = refNowParam.trim();
      }
      const tzParam = formData.get("timeZone");
      if (typeof tzParam === "string" && tzParam.trim()) {
        timeZone = tzParam.trim();
      }
      const locParam = formData.get("locale");
      if (typeof locParam === "string" && locParam.trim()) {
        locale = locParam.trim();
      }
    } catch (err) {
      return c.json(
        {
          ok: false,
          error: {
            code: "INVALID_FORM_DATA",
            message: "Failed to parse audio multipart upload: " + (err instanceof Error ? err.message : "Error"),
          },
        },
        400
      );
    }
  } else {
    // JSON payload with base64
    try {
      const body = (await c.req.json()) as {
        audioBase64?: string;
        mimeType?: string;
        referenceNow?: string;
        timeZone?: string;
        locale?: string;
      };

      if (!body.audioBase64) {
        return c.json(
          {
            ok: false,
            error: {
              code: "AUDIO_PAYLOAD_MISSING",
              message: "Missing audioBase64 or audio file in request.",
            },
          },
          400
        );
      }

      const mime = body.mimeType || "audio/aac";
      audioBlob = base64ToBlob(body.audioBase64, mime);
      fileName = getFileNameForMime(mime);

      if (body.referenceNow) referenceNow = body.referenceNow;
      if (body.timeZone) timeZone = body.timeZone;
      if (body.locale) locale = body.locale;
    } catch (err) {
      return c.json(
        {
          ok: false,
          error: {
            code: "INVALID_JSON",
            message: "Failed to parse JSON body: " + (err instanceof Error ? err.message : "Error"),
          },
        },
        400
      );
    }
  }

  if (!audioBlob || audioBlob.size === 0) {
    return c.json(
      {
        ok: false,
        error: {
          code: "EMPTY_AUDIO",
          message: "No audio data received. Please record again.",
        },
      },
      400
    );
  }

  const MAX_AUDIO_SIZE = 25 * 1024 * 1024; // 25 MB Groq limit
  if (audioBlob.size > MAX_AUDIO_SIZE) {
    return c.json(
      {
        ok: false,
        error: {
          code: "AUDIO_TOO_LARGE",
          message: "Audio recording exceeds the 25 MB limit. Please record a shorter task description.",
        },
      },
      413
    );
  }

  // 1. Inspect actual recorded bytes to ensure genuine container format matching Groq Whisper
  const detected = await inspectAudioFormat(audioBlob, fileName);
  fileName = detected.fileName;

  // Stage 1: Transcribe audio with Groq whisper-large-v3 (multilingual: Hindi, Marathi, Hinglish, English)
  let transcript = "";
  try {
    transcript = await transcribeAudioWithGroq(apiKey, audioBlob, fileName);
  } catch (transcribeErr: unknown) {
    const rawMsg = transcribeErr instanceof Error ? transcribeErr.message : "GROQ_WHISPER_UNKNOWN_ERROR";
    console.error("Groq Whisper transcription failed:", rawMsg);
    const sanitized = rawMsg.replace(/gsk_[a-zA-Z0-9_-]+/g, "[REDACTED_API_KEY]");
    const is429 = sanitized.includes("429");
    return c.json(
      {
        ok: false,
        error: {
          code: is429 ? "RATE_LIMITED" : "TRANSCRIPTION_FAILED",
          stage: "transcription",
          message: sanitized,
        },
      },
      is429 ? 429 : 400
    );
  }

  if (!transcript || !transcript.trim()) {
    return c.json(
      {
        ok: false,
        error: {
          code: "NO_SPEECH_DETECTED",
          stage: "transcription",
          message: "No speech was detected in the audio. Please speak clearly and try again.",
        },
      },
      422
    );
  }

  // Stage 2: Send complete transcript to Groq openai/gpt-oss-20b for structured task extraction
  try {
    const parseResult = await parseTasksWithGroq(apiKey, {
      transcript,
      referenceNow,
      timeZone,
      locale,
    });

    return c.json({
      ok: true,
      data: {
        transcript,
        tasks: parseResult.tasks,
        clarification: parseResult.clarification,
      },
    });
  } catch (parseErr: unknown) {
    const rawMsg = parseErr instanceof Error ? parseErr.message : "GROQ_GPT_OSS_UNKNOWN_ERROR";
    console.error("Groq GPT-OSS task extraction failed:", rawMsg);
    const sanitized = rawMsg.replace(/gsk_[a-zA-Z0-9_-]+/g, "[REDACTED_API_KEY]");
    const is429 = sanitized.includes("429");
    return c.json(
      {
        ok: false,
        error: {
          code: is429 ? "RATE_LIMITED" : "TASK_EXTRACTION_FAILED",
          stage: "task_extraction",
          message: sanitized,
          transcript,
        },
      },
      is429 ? 429 : 500
    );
  }
});

export default app;
