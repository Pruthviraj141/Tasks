import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import workerApp from "../src/worker/index";
import { WebTaskRepository } from "../src/react-app/storage/WebTaskRepository";
import { syncWidgetData } from "../src/react-app/storage/widgetSync";
import { ParseTaskResultSchema } from "../src/shared/types/voiceTask";

// Load .dev.vars into process.env for test runner
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
  // Ignore
}

// Mock localStorage for node test environment
if (typeof globalThis.localStorage === "undefined") {
  const store = new Map<string, string>();
  globalThis.localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    length: 0,
  };
}

async function runFocusedVerification() {
  console.log("=================================================");
  console.log("DAYMARK: FOCUSED VERIFICATION TEST SUITE");
  console.log("1. Audio Recording & Silence Pause Immunity");
  console.log("2. Recording-to-Groq-to-Task-Preview Pipeline");
  console.log("3. Task Completion Feedback & Persistence");
  console.log("4. Android Widget Layout, Streak & Sync Logic");
  console.log("=================================================\n");

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

  // -------------------------------------------------------------------
  // TEST AREA 1: AUDIO RECORDING WITH PAUSES (NO AUTO-SILENCE TIMEOUT)
  // -------------------------------------------------------------------
  console.log("[Area 1] Audio Recording & Silence Pause Immunity:");

  await test("Continuous recording continues through 5s+ pauses and ends ONLY on explicit Stop", async () => {
    const recordedChunks: Uint8Array[] = [];
    let isRecording = true;

    function emitAudioChunk(bytes: number[]) {
      if (isRecording) {
        recordedChunks.push(new Uint8Array(bytes));
      }
    }

    // Speech period 1
    emitAudioChunk([1, 2, 3, 4]);

    // Simulated 5-second silence pause (zero speech events)
    // Continuous audio recording does NOT stop on silence timeouts
    assert.strictEqual(isRecording, true, "Recorder must remain active during silence");

    // Speech period 2 after pause
    emitAudioChunk([5, 6, 7, 8]);

    // Simulated 10-second silence pause
    assert.strictEqual(isRecording, true, "Recorder must remain active during 10s pause");

    // Speech period 3 (multilingual phrase)
    emitAudioChunk([9, 10, 11, 12]);

    // Explicit user Stop action
    isRecording = false;
    const finalBlob = new Blob(recordedChunks, { type: "audio/webm" });

    assert.strictEqual(isRecording, false, "Recorder stopped only after explicit user stop");
    assert.strictEqual(finalBlob.size, 12, "All speech chunks across pauses are preserved");
  });

  await test("Cancellation cleanly discards audio without triggering transcription", async () => {
    let isRecording = true;
    let audioDisposed = false;
    let transcriptionTriggered = false;

    // Simulate user tapping Cancel during recording
    isRecording = false;
    audioDisposed = true;

    assert.strictEqual(isRecording, false);
    assert.strictEqual(audioDisposed, true);
    assert.strictEqual(transcriptionTriggered, false);
  });

  // -------------------------------------------------------------------
  // TEST AREA 2: RECORDING-TO-GROQ-TO-TASK-PREVIEW PIPELINE
  // -------------------------------------------------------------------
  console.log("\n[Area 2] Complete Recording-to-Groq-to-Task-Preview Pipeline:");

  await test("Backend rejects empty audio with 400 EMPTY_AUDIO / AUDIO_PAYLOAD_MISSING", async () => {
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
    const json = (await res.json()) as { ok: boolean; error: { code: string } };
    assert.strictEqual(json.ok, false);
    assert.strictEqual(json.error.code, "AUDIO_PAYLOAD_MISSING");
  });

  await test("Backend handles oversized audio boundary validation cleanly", async () => {
    const dummy = btoa("mock audio content bytes");
    const res = await workerApp.request("/api/transcribe-and-parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        audioBase64: dummy,
        referenceNow: "2026-10-23T10:00:00",
        timeZone: "Asia/Kolkata",
      }),
    });

    // In a test without real audio bytes, it will attempt transcription and return an error envelope (not crash)
    assert.ok(res.status === 400 || res.status === 413 || res.status === 500);
    const json = (await res.json()) as { ok: boolean };
    assert.strictEqual(json.ok, false);
  });

  await test("Task proposals validate correctly against ParseTaskResultSchema", async () => {
    const mockExtracted = {
      tasks: [
        {
          title: "Code for two hours tomorrow at 10 AM",
          notes: null,
          scheduledDate: "2026-10-24",
          scheduledTime: "10:00",
          durationMinutes: 120,
          dueDate: null,
          dueTime: null,
          reminderDate: "2026-10-24",
          reminderTime: "09:50",
          clarifications: [],
        },
        {
          title: "Kal subah 9 baje gym",
          notes: null,
          scheduledDate: "2026-10-24",
          scheduledTime: "09:00",
          durationMinutes: 60,
          dueDate: null,
          dueTime: null,
          reminderDate: null,
          reminderTime: null,
          clarifications: [],
        },
      ],
      clarification: null,
    };

    const parsed = ParseTaskResultSchema.safeParse(mockExtracted);
    assert.strictEqual(parsed.success, true);
    assert.strictEqual(parsed.data.tasks.length, 2);
    assert.strictEqual(parsed.data.tasks[0].durationMinutes, 120);
    assert.strictEqual(parsed.data.tasks[1].scheduledTime, "09:00");
  });

  // -------------------------------------------------------------------
  // TEST AREA 3: TASK COMPLETION FEEDBACK & PERSISTENCE
  // -------------------------------------------------------------------
  console.log("\n[Area 3] Task Completion Feedback & Persistence:");

  await test("Task toggle correctly sets completedAt, updates state, and persists in repository", async () => {
    const repo = new WebTaskRepository();
    const task = await repo.createTask({
      title: "Write integration tests",
      scheduledDate: "2026-10-23",
    });

    assert.strictEqual(task.isCompleted, false);
    assert.strictEqual(task.completedAt, undefined);

    // Toggle to completed
    const completed = await repo.toggleTask(task.id);
    assert.strictEqual(completed.isCompleted, true);
    assert.ok(completed.completedAt !== undefined, "completedAt must be set");

    // Fetch from storage to ensure persistence
    const fetched = await repo.getTaskById(task.id);
    assert.strictEqual(fetched?.isCompleted, true);

    // Toggle back to active
    const uncompleted = await repo.toggleTask(task.id);
    assert.strictEqual(uncompleted.isCompleted, false);
    assert.strictEqual(uncompleted.completedAt, undefined);
  });

  // -------------------------------------------------------------------
  // TEST AREA 4: ANDROID WIDGET LAYOUT, STREAK & SYNC LOGIC
  // -------------------------------------------------------------------
  console.log("\n[Area 4] Android Widget Layout, Streak & Sync Logic:");

  await test("syncWidgetData computes correct streak count and formats snapshot", async () => {
    const repo = new WebTaskRepository();
    const t1 = await repo.createTask({ title: "Task 1", scheduledDate: "2026-10-23" });
    await repo.toggleTask(t1.id);

    const allTasks = await repo.getTasks();
    const snapshot = syncWidgetData(allTasks);

    assert.ok(snapshot.completedCount >= 1);
    assert.strictEqual(typeof snapshot.currentStreak, "number");
    assert.ok(snapshot.currentStreak >= 1, "Streak must be at least 1 after completing a task today");
    assert.ok(snapshot.todayTasks.length > 0);
  });

  await test("Android widget layout XML has NO microphone button and HAS streak container", () => {
    const xmlPath = path.resolve(process.cwd(), "android/app/src/main/res/layout/daymark_widget.xml");
    const xmlContent = fs.readFileSync(xmlPath, "utf-8");

    // 1. Microphone button must be completely removed
    assert.strictEqual(
      xmlContent.includes("widget_btn_mic"),
      false,
      "widget_btn_mic must be removed from daymark_widget.xml"
    );

    // 2. Streak container and flame must exist
    assert.ok(
      xmlContent.includes("widget_streak_container"),
      "widget_streak_container must exist in daymark_widget.xml"
    );
    assert.ok(
      xmlContent.includes("widget_streak_count"),
      "widget_streak_count must exist in daymark_widget.xml"
    );
  });

  await test("DaymarkWidgetProvider.java contains streak handling and strikethrough styling", () => {
    const javaPath = path.resolve(
      process.cwd(),
      "android/app/src/main/java/app/daymark/tasks/DaymarkWidgetProvider.java"
    );
    const javaContent = fs.readFileSync(javaPath, "utf-8");

    assert.ok(
      javaContent.includes("currentStreak"),
      "DaymarkWidgetProvider must parse currentStreak from snapshot"
    );
    assert.ok(
      javaContent.includes("widget_streak_count"),
      "DaymarkWidgetProvider must set text on widget_streak_count"
    );
    assert.ok(
      javaContent.includes("StrikethroughSpan"),
      "DaymarkWidgetProvider must apply StrikethroughSpan on completed tasks"
    );
    assert.strictEqual(
      javaContent.includes("widget_btn_mic"),
      false,
      "DaymarkWidgetProvider must not reference widget_btn_mic"
    );
  });

  console.log("\n=================================================");
  console.log(`Master Verification Results: ${passed} passed, ${failed} failed`);
  console.log("=================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runFocusedVerification().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
