/**
 * Server-side audio transcription using Groq's whisper-large-v3 multilingual model.
 * Audio is sent directly from Cloudflare Worker / Hono to Groq over HTTPS.
 * API keys and audio are never exposed to the client or to Google.
 */
export async function transcribeAudioWithGroq(
  apiKey: string,
  audioBlob: Blob,
  fileName = "recording.m4a"
): Promise<string> {
  const endpoint = "https://api.groq.com/openai/v1/audio/transcriptions";
  const model = "whisper-large-v3";

  const formData = new FormData();
  formData.append("file", audioBlob, fileName);
  formData.append("model", model);
  formData.append("response_format", "json");
  // Prime Whisper for multilingual transcription (Hindi, Marathi, Hinglish, Indian English)
  formData.append(
    "prompt",
    "Task scheduling and reminders in English, Hindi, Marathi, and Hinglish. Examples: 'Code for two hours tomorrow at 10 AM', 'kal subah 9 baje gym jana hai', 'udya sakali 8 vajta call kara', 'finish report by Friday 5 PM'."
  );

  let response: Response | null = null;
  let lastErrorText = "";

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      if (attempt > 0) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: formData,
      });

      if (!response.ok) {
        lastErrorText = await response.text();
        console.error(
          `Groq Whisper error (${response.status}, attempt ${attempt + 1}):`,
          lastErrorText
        );
        if (response.status === 429 || response.status >= 500) {
          continue;
        }
        throw new Error(`GROQ_WHISPER_ERROR: ${response.status} - ${lastErrorText}`);
      }

      break;
    } catch (err) {
      if (err instanceof Error && err.message.startsWith("GROQ_WHISPER_ERROR")) {
        throw err;
      }
      if (attempt === 1) {
        console.error("Groq Whisper network error:", err);
        throw new Error("GROQ_WHISPER_NETWORK_ERROR: " + (err instanceof Error ? err.message : String(err)));
      }
    }
  }

  if (!response || !response.ok) {
    throw new Error(`GROQ_WHISPER_ERROR: ${response?.status || 500} - ${lastErrorText}`);
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch (err) {
    console.error("Failed to parse Groq Whisper response JSON:", err);
    throw new Error("GROQ_WHISPER_PARSE_ERROR");
  }

  const result = json as { text?: string };
  const text = (result.text || "").trim();

  return text;
}
