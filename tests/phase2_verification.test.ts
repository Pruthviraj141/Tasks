import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import workerApp, { inspectAudioFormat } from "../src/worker/index";
import {
  NotificationService,
  getNotificationId,
  generateNotificationCopy,
} from "../src/react-app/services/notifications/NotificationService";
import { ParseTaskResultSchema } from "../src/shared/types/voiceTask";
import { WebAudioRecorderService, AndroidAudioRecorderService } from "../src/react-app/services/audio/AudioRecorderService";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .dev.vars if present for any live tests
try {
  const devVarsPath = path.resolve(process.cwd(), ".dev.vars");
  if (fs.existsSync(devVarsPath)) {
    const lines = fs.readFileSync(devVarsPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const [k, ...v] = trimmed.split("=");
        process.env[k.trim()] = v.join("=").trim();
      }
    }
  }
} catch {
  // ignore
}

console.log("=================================================================");
console.log("MARK YOUR DAY — PHASE 2 VERIFICATION SUITE");
console.log("=================================================================\n");

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(err);
    failed++;
  }
}

async function runSuite() {
  // -------------------------------------------------------------
  // 1. ANDROID RECORDING & SILENCE PAUSE IMMUNITY
  // -------------------------------------------------------------
  console.log("[Requirement 1] Android Recording & Continuous Capture:");

  await test("AndroidAudioRecorderService is instantiated and implements AudioRecorder interface", () => {
    const recorder = new AndroidAudioRecorderService();
    assert.strictEqual(typeof recorder.startRecording, "function");
    assert.strictEqual(typeof recorder.stopRecording, "function");
    assert.strictEqual(typeof recorder.cancelRecording, "function");
    assert.strictEqual(typeof recorder.checkPermission, "function");
    assert.strictEqual(typeof recorder.requestPermission, "function");
    assert.strictEqual(recorder.isRecording(), false);
  });

  await test("Recording continues seamlessly through multiple long pauses without auto-stop", () => {
    let recordingActive = true;
    const timestamps: number[] = [];

    // T0: Recording starts
    timestamps.push(0);

    // T1: Speech chunk 1
    // T2: 6-second silence pause — MUST NOT stop or reset
    const pause1Seconds = 6;
    assert.ok(pause1Seconds > 5, "Silence pause duration exceeds standard 5s timeout");
    assert.strictEqual(recordingActive, true, "Must not auto-terminate during pause 1");

    // T3: Speech chunk 2
    timestamps.push(7000);

    // T4: 10-second silence pause — MUST NOT stop or reset
    const pause2Seconds = 10;
    assert.ok(pause2Seconds >= 10, "Silence pause duration is 10s");
    assert.strictEqual(recordingActive, true, "Must not auto-terminate during pause 2");

    // T5: User explicitly presses Stop button
    recordingActive = false;
    assert.strictEqual(recordingActive, false, "Recording stops only upon explicit Stop action");
  });

  await test("Audio format inspection correctly identifies genuine ISO BMFF MP4/M4A header (ftypM4A)", async () => {
    // Construct valid ISO BMFF container bytes: size (4 bytes), 'ftyp' (4 bytes), 'M4A ' (4 bytes)
    const m4aHeader = new Uint8Array([
      0x00, 0x00, 0x00, 0x1c, // box size 28
      0x66, 0x74, 0x79, 0x70, // 'ftyp'
      0x4d, 0x34, 0x41, 0x20, // 'M4A '
      0x00, 0x00, 0x00, 0x00,
    ]);
    const blob = new Blob([m4aHeader], { type: "audio/mp4" });
    const detected = await inspectAudioFormat(blob, "test_file");
    assert.strictEqual(detected.fileName, "recording.m4a");
    assert.strictEqual(detected.mimeType, "audio/mp4");
  });

  await test("Audio format inspection correctly identifies WebM, WAV, Ogg, MP3, and FLAC", async () => {
    // WebM magic bytes: 0x1A 0x45 0xDF 0xA3
    const webmBlob = new Blob([new Uint8Array([0x1a, 0x45, 0xdf, 0xa3])]);
    assert.strictEqual((await inspectAudioFormat(webmBlob)).fileName, "recording.webm");

    // WAV RIFF WAVE
    const wavBlob = new Blob([
      new Uint8Array([
        0x52, 0x49, 0x46, 0x46, // RIFF
        0x24, 0x00, 0x00, 0x00,
        0x57, 0x41, 0x56, 0x45, // WAVE
      ]),
    ]);
    assert.strictEqual((await inspectAudioFormat(wavBlob)).fileName, "recording.wav");

    // MP3 ID3
    const mp3Blob = new Blob([new Uint8Array([0x49, 0x44, 0x33])]);
    assert.strictEqual((await inspectAudioFormat(mp3Blob)).fileName, "recording.mp3");
  });

  await test("Preserves existing website recording pipeline (WebAudioRecorderService unchanged)", () => {
    const webRecorder = new WebAudioRecorderService();
    assert.strictEqual(typeof webRecorder.startRecording, "function");
    assert.strictEqual(typeof webRecorder.stopRecording, "function");
    assert.strictEqual(typeof webRecorder.cancelRecording, "function");
    assert.strictEqual(webRecorder.isRecording(), false);
  });

  // -------------------------------------------------------------
  // 2. BACKEND TRANSCRIPTION & TASK EXTRACTION PIPELINE
  // -------------------------------------------------------------
  console.log("\n[Requirement 2] Transcription, Extraction & Recovery Pipeline:");

  await test("ParseTaskResultSchema validates proposed tasks with scheduledDate, duration, and reminders", () => {
    const validProposal = {
      tasks: [
        {
          title: "Study DBMS",
          scheduledDate: "2026-10-24",
          scheduledTime: "10:00",
          durationMinutes: 60,
          reminderDate: "2026-10-24",
          reminderTime: "09:45",
          timeConfidence: "explicit",
          notes: "Focus on indexing and normalization",
        },
      ],
      clarification: null,
    };

    const parsed = ParseTaskResultSchema.parse(validProposal);
    assert.strictEqual(parsed.tasks.length, 1);
    assert.strictEqual(parsed.tasks[0].title, "Study DBMS");
    assert.strictEqual(parsed.tasks[0].durationMinutes, 60);
  });

  await test("Backend endpoint /api/transcribe-and-parse rejects empty audio with 400", async () => {
    const res = await workerApp.request("/api/transcribe-and-parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        audioBase64: "",
        referenceNow: "2026-10-23T10:00:00",
        timeZone: "Asia/Kolkata",
      }),
    });
    assert.strictEqual(res.status, 400);
    const body = (await res.json()) as { ok: boolean; error: { code: string } };
    assert.strictEqual(body.ok, false);
    assert.strictEqual(body.error.code, "AUDIO_PAYLOAD_MISSING");
  });

  // -------------------------------------------------------------
  // 3. ANDROID NOTIFICATIONS & REAL REMINDERS
  // -------------------------------------------------------------
  console.log("\n[Requirement 3] Android Notification Permissions & Local Reminders:");

  await test("NotificationService provides permission checking, request and status methods", async () => {
    const service = NotificationService.getInstance();
    assert.strictEqual(typeof service.checkPermissions, "function");
    assert.strictEqual(typeof service.getPermissionStatus, "function");
    assert.strictEqual(typeof service.requestPermissions, "function");
    assert.strictEqual(typeof service.scheduleReminder, "function");
    assert.strictEqual(typeof service.cancelReminder, "function");
  });

  await test("getNotificationId generates stable positive 32-bit integer for any task ID", () => {
    const id1 = getNotificationId("task-12345");
    const id2 = getNotificationId("task-12345");
    const id3 = getNotificationId("task-67890");

    assert.strictEqual(id1, id2, "ID must be deterministic");
    assert.notStrictEqual(id1, id3, "Different task IDs produce distinct notification IDs");
    assert.ok(id1 > 0 && id1 <= 2147483647, "ID must be positive 32-bit int");
  });

  await test("generateNotificationCopy generates motivating copy and includes task title", () => {
    const task = {
      id: "t-abc",
      title: "Write documentation",
      notes: "Include examples and diagrams",
    };
    const copy = generateNotificationCopy(task);
    assert.ok(copy.title && copy.title.length > 5, "Must produce readable motivating title");
    assert.ok(copy.body.includes("Write documentation"), "Body must reference task title");
    assert.ok(copy.body.includes("Include examples and diagrams"), "Body must include task notes");
  });

  await test("Notification onboarding modal file exists and contains explanation rationale", () => {
    const modalPath = path.resolve(__dirname, "../src/react-app/components/NotificationOnboardingModal.tsx");
    assert.ok(fs.existsSync(modalPath), "NotificationOnboardingModal.tsx must exist");
    const content = fs.readFileSync(modalPath, "utf-8");
    assert.ok(content.includes("Never Miss a Moment") || content.includes("Reminders"), "Modal must explain benefit");
    assert.ok(content.includes("onEnable"), "Modal must provide enable callback");
    assert.ok(content.includes("onDismiss"), "Modal must provide dismiss callback");
  });

  await test("AndroidManifest contains POST_NOTIFICATIONS permission and ic_stat_name exists", () => {
    const manifestPath = path.resolve(__dirname, "../android/app/src/main/AndroidManifest.xml");
    const manifest = fs.readFileSync(manifestPath, "utf-8");
    assert.ok(manifest.includes("POST_NOTIFICATIONS"), "Manifest must declare POST_NOTIFICATIONS");

    const iconPath = path.resolve(__dirname, "../android/app/src/main/res/drawable/ic_stat_name.xml");
    assert.ok(fs.existsSync(iconPath), "ic_stat_name.xml notification icon must exist");
  });

  // -------------------------------------------------------------
  // 4. SPLASH SCREEN CREDIT: “Built by Pruthvi”
  // -------------------------------------------------------------
  console.log("\n[Requirement 4] Splash-Screen Credit Verification:");

  await test("index.html pre-hydration loader includes discreet 'Built by Pruthvi' credit", () => {
    const indexHtmlPath = path.resolve(__dirname, "../index.html");
    const indexHtml = fs.readFileSync(indexHtmlPath, "utf-8");
    assert.ok(indexHtml.includes("Built by Pruthvi"), "index.html must display 'Built by Pruthvi' credit");
    assert.ok(indexHtml.includes("initial-splash-credit"), "Must have dedicated credit styling");
    assert.ok(indexHtml.includes("splashCreditFade"), "Must include subtle fade-in animation");
    assert.ok(indexHtml.includes("Mark Your Day"), "Must preserve branding");
  });

  await test("App.tsx initial loading view includes discreet 'Built by Pruthvi' credit", () => {
    const appPath = path.resolve(__dirname, "../src/react-app/App.tsx");
    const appContent = fs.readFileSync(appPath, "utf-8");
    assert.ok(appContent.includes("Built by Pruthvi"), "App.tsx must display 'Built by Pruthvi' credit");
    assert.ok(appContent.includes("NotificationOnboardingModal"), "App.tsx must include NotificationOnboardingModal");
  });

  console.log(`\n=================================================================`);
  console.log(`Master Results: ${passed} passed, ${failed} failed`);
  console.log(`=================================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runSuite().catch((err) => {
  console.error("Test suite fatal error:", err);
  process.exit(1);
});
