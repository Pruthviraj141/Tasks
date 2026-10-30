import fs from "fs";
import path from "path";
import app from "../src/worker/index";

// Load GROQ_API_KEY from .dev.vars if not in process.env
if (!process.env.GROQ_API_KEY) {
  try {
    const devVars = fs.readFileSync(".dev.vars", "utf8");
    const match = devVars.match(/GROQ_API_KEY=([^\r\n]+)/);
    if (match) {
      process.env.GROQ_API_KEY = match[1].trim();
    }
  } catch {
    // Ignore
  }
}

async function runE2ETests() {
  console.log("Starting End-to-End Voice-to-Task Pipeline Test with Real Groq APIs...\n");

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is not configured.");
  }

  // 1. Load real audio file (speech.m4a produced with AAC MPEG-4 container matching Android recorder)
  const audioPath = "/home/pruthvi/.gemini/antigravity-ide/brain/df5b90e8-1b42-431e-9374-0a3653c141ec/scratch/audio_test/speech.m4a";
  if (!fs.existsSync(audioPath)) {
    throw new Error(`Audio file not found at ${audioPath}`);
  }
  const fileBytes = fs.readFileSync(audioPath);
  const audioBlob = new Blob([fileBytes], { type: "audio/mp4" });

  console.log(`[Audio Check] File size: ${audioBlob.size} bytes, type: ${audioBlob.type}`);

  // 2. Prepare FormData matching Android client request
  const formData = new FormData();
  formData.append("file", audioBlob, "recording.m4a");
  formData.append("audio", audioBlob, "recording.m4a");
  formData.append("referenceNow", "2026-10-23T19:30:00");
  formData.append("timeZone", "Asia/Kolkata");
  formData.append("locale", "en-IN");

  const req = new Request("http://localhost/api/transcribe-and-parse", {
    method: "POST",
    body: formData,
  });

  console.log("[Request] Dispatching POST /api/transcribe-and-parse to Hono app...");
  const res = await app.fetch(req, { GROQ_API_KEY: apiKey } as unknown as Env);

  console.log(`[Response] HTTP Status: ${res.status}`);
  const json = (await res.json()) as any;
  console.log("[Response Body]:", JSON.stringify(json, null, 2));

  if (res.status !== 200 || !json.ok) {
    throw new Error(`End-to-end pipeline failed: status ${res.status}, error: ${JSON.stringify(json.error)}`);
  }

  console.log("\n[Verification 1: Groq Whisper Transcription]");
  console.log(`  Transcript: "${json.data.transcript}"`);
  if (!json.data.transcript || !json.data.transcript.toLowerCase().includes("team meeting")) {
    throw new Error(`Transcription did not contain expected words. Got: "${json.data.transcript}"`);
  }
  console.log("  ✓ Groq Whisper transcription verified!");

  console.log("\n[Verification 2: Groq GPT-OSS Task Extraction]");
  console.log(`  Extracted ${json.data.tasks.length} task(s):`);
  for (const t of json.data.tasks) {
    console.log(`   - Task: "${t.title}", Date: ${t.scheduledDate}, Time: ${t.startTime || "None"}, Duration: ${t.durationMinutes}m`);
  }
  if (!json.data.tasks || json.data.tasks.length === 0) {
    throw new Error("No tasks extracted by GPT-OSS.");
  }
  console.log("  ✓ Groq GPT-OSS task extraction verified!");

  // 3. Test Error Stage Differentiation & Upstream Error Preservation (Requirement 1 & 3)
  console.log("\n[Verification 3: Error Stage Differentiation & Diagnostic Preservation]");
  const corruptBlob = new Blob([new Uint8Array([0x00, 0x01, 0x02, 0x03])], { type: "audio/mp4" });
  const badForm = new FormData();
  badForm.append("file", corruptBlob, "recording.m4a");
  badForm.append("referenceNow", "2026-10-23T19:30:00");
  badForm.append("timeZone", "Asia/Kolkata");

  const badReq = new Request("http://localhost/api/transcribe-and-parse", {
    method: "POST",
    body: badForm,
  });
  const badRes = await app.fetch(badReq, { GROQ_API_KEY: apiKey } as unknown as Env);
  const badJson = (await badRes.json()) as any;

  console.log(`  Corrupt file HTTP status: ${badRes.status}`);
  console.log(`  Error code: ${badJson.error?.code}`);
  console.log(`  Error stage: ${badJson.error?.stage}`);
  console.log(`  Error message: ${badJson.error?.message}`);

  if (badJson.error?.stage !== "transcription" || !badJson.error?.message.includes("GROQ_WHISPER_ERROR")) {
    throw new Error("Failed to preserve upstream transcription error stage and message.");
  }
  if (badJson.error?.message.includes("gsk_")) {
    throw new Error("GROQ_API_KEY was leaked in error message!");
  }
  console.log("  ✓ Diagnostic error stage identified accurately and API secrets preserved!");

  console.log("\nALL END-TO-END PIPELINE CHECKS PASSED SUCCESSFULLY!\n");
}

runE2ETests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
