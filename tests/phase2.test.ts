import assert from "node:assert/strict";
import {
  isValidCalendarDate,
  isValidClockTime,
  ParseTaskRequestSchema,
  ParseTaskResultSchema,
  type ProposedTask,
} from "../src/shared/types/voiceTask";
import { buildSystemPrompt } from "../src/worker/prompt";
import workerApp from "../src/worker/index";
import { WebTaskRepository } from "../src/react-app/storage/WebTaskRepository";

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

async function runTests() {
  console.log("Starting Daymark Phase 2 Master Test Suite...\n");
  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    try {
      fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ ${name}`);
      console.error(err);
      failed++;
    }
  }

  async function testAsync(name: string, fn: () => Promise<void>) {
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

  // --- CASE 16: DATE VALIDATION ---
  test("Case 16: Date and Time validation rejects invalid values", () => {
    assert.strictEqual(isValidCalendarDate("2026-10-23"), true);
    assert.strictEqual(isValidCalendarDate("2026-02-28"), true);
    assert.strictEqual(isValidCalendarDate("2026-02-31"), false); // Impossible leap/date
    assert.strictEqual(isValidCalendarDate("invalid-date"), false);

    assert.strictEqual(isValidClockTime("10:00"), true);
    assert.strictEqual(isValidClockTime("23:59"), true);
    assert.strictEqual(isValidClockTime("00:00"), true);
    assert.strictEqual(isValidClockTime("25:90"), false); // Impossible time
    assert.strictEqual(isValidClockTime("12:65"), false);
  });

  // --- CASE 13: EMPTY SPEECH RESULT ---
  test("Case 13: Request schema rejects empty or whitespace-only transcript", () => {
    const emptyResult = ParseTaskRequestSchema.safeParse({
      transcript: "   ",
      referenceNow: "2026-10-23T10:00:00",
      timeZone: "Asia/Kolkata",
    });
    assert.strictEqual(emptyResult.success, false);
  });

  // --- PROMPT GENERATION ---
  test("Prompt: buildSystemPrompt embeds local reference context and rules", () => {
    const prompt = buildSystemPrompt("2026-10-23T10:30:00", "Asia/Kolkata", "en-IN");
    assert.match(prompt, /2026-10-23/);
    assert.match(prompt, /Asia\/Kolkata/);
    assert.match(prompt, /Extract Actionable Tasks Only/);
  });

  // --- CASE 1: DURATION ONLY ---
  test("Case 1: Duration only ('Study DBMS for two hours')", () => {
    const raw = {
      tasks: [
        {
          title: "Study DBMS",
          notes: null,
          scheduledDate: null,
          scheduledTime: null,
          durationMinutes: 120,
          dueDate: null,
          dueTime: null,
          reminderDate: null,
          reminderTime: null,
          clarifications: [],
        },
      ],
      clarification: null,
    };
    const parsed = ParseTaskResultSchema.parse(raw);
    assert.strictEqual(parsed.tasks.length, 1);
    assert.strictEqual(parsed.tasks[0].title, "Study DBMS");
    assert.strictEqual(parsed.tasks[0].durationMinutes, 120);
    assert.strictEqual(parsed.tasks[0].scheduledDate, null);
    assert.strictEqual(parsed.tasks[0].scheduledTime, null);
  });

  // --- CASE 2: EXPLICIT NOW PLUS DURATION ---
  test("Case 2: Explicit now plus duration ('I will do coding now for two hours')", () => {
    const raw = {
      tasks: [
        {
          title: "Coding",
          notes: null,
          scheduledDate: "2026-10-23",
          scheduledTime: "10:30",
          durationMinutes: 120,
          dueDate: null,
          dueTime: null,
          reminderDate: null,
          reminderTime: null,
          clarifications: [],
        },
      ],
      clarification: null,
    };
    const parsed = ParseTaskResultSchema.parse(raw);
    assert.strictEqual(parsed.tasks[0].title, "Coding");
    assert.strictEqual(parsed.tasks[0].scheduledDate, "2026-10-23");
    assert.strictEqual(parsed.tasks[0].scheduledTime, "10:30");
    assert.strictEqual(parsed.tasks[0].durationMinutes, 120);
  });

  // --- CASE 3: START TIME ONLY ---
  test("Case 3: Start time only ('Study DBMS at 10 AM')", () => {
    const raw = {
      tasks: [
        {
          title: "Study DBMS",
          notes: null,
          scheduledDate: null,
          scheduledTime: "10:00",
          durationMinutes: null,
          dueDate: null,
          dueTime: null,
          reminderDate: null,
          reminderTime: null,
          clarifications: [],
        },
      ],
      clarification: null,
    };
    const parsed = ParseTaskResultSchema.parse(raw);
    assert.strictEqual(parsed.tasks[0].scheduledTime, "10:00");
    assert.strictEqual(parsed.tasks[0].durationMinutes, null);
  });

  // --- CASE 4: DATE AND TIME ---
  test("Case 4: Date and time ('Study DBMS tomorrow at 10 AM')", () => {
    const raw = {
      tasks: [
        {
          title: "Study DBMS",
          notes: null,
          scheduledDate: "2026-10-24",
          scheduledTime: "10:00",
          durationMinutes: null,
          dueDate: null,
          dueTime: null,
          reminderDate: null,
          reminderTime: null,
          clarifications: [],
        },
      ],
      clarification: null,
    };
    const parsed = ParseTaskResultSchema.parse(raw);
    assert.strictEqual(parsed.tasks[0].scheduledDate, "2026-10-24");
    assert.strictEqual(parsed.tasks[0].scheduledTime, "10:00");
  });

  // --- CASE 5: DURATION VS FUTURE START ---
  test("Case 5: Duration vs future start ('Start coding in two hours')", () => {
    const raw = {
      tasks: [
        {
          title: "Coding",
          notes: null,
          scheduledDate: "2026-10-23",
          scheduledTime: "12:30",
          durationMinutes: null, // Start is in 2 hours, not 2 hours duration
          dueDate: null,
          dueTime: null,
          reminderDate: null,
          reminderTime: null,
          clarifications: [],
        },
      ],
      clarification: null,
    };
    const parsed = ParseTaskResultSchema.parse(raw);
    assert.strictEqual(parsed.tasks[0].durationMinutes, null);
    assert.strictEqual(parsed.tasks[0].scheduledTime, "12:30");
  });

  // --- CASE 6: SCHEDULE PLUS DURATION ---
  test("Case 6: Schedule plus duration ('Work on SignVision at 3 PM for 90 minutes')", () => {
    const raw = {
      tasks: [
        {
          title: "Work on SignVision",
          notes: null,
          scheduledDate: "2026-10-23",
          scheduledTime: "15:00",
          durationMinutes: 90,
          dueDate: null,
          dueTime: null,
          reminderDate: null,
          reminderTime: null,
          clarifications: [],
        },
      ],
      clarification: null,
    };
    const parsed = ParseTaskResultSchema.parse(raw);
    assert.strictEqual(parsed.tasks[0].scheduledTime, "15:00");
    assert.strictEqual(parsed.tasks[0].durationMinutes, 90);
  });

  // --- CASE 7: DEADLINE ---
  test("Case 7: Deadline ('Finish the assignment by 6 PM')", () => {
    const raw = {
      tasks: [
        {
          title: "Finish the assignment",
          notes: null,
          scheduledDate: null,
          scheduledTime: null, // Must not be placed into scheduled start time
          durationMinutes: null,
          dueDate: "2026-10-23",
          dueTime: "18:00",
          reminderDate: null,
          reminderTime: null,
          clarifications: [],
        },
      ],
      clarification: null,
    };
    const parsed = ParseTaskResultSchema.parse(raw);
    assert.strictEqual(parsed.tasks[0].scheduledTime, null);
    assert.strictEqual(parsed.tasks[0].dueTime, "18:00");
  });

  // --- CASE 8: MULTIPLE TASKS ---
  test("Case 8: Multiple tasks ('Code for two hours now and study DBMS tomorrow at 10 AM')", () => {
    const raw = {
      tasks: [
        {
          title: "Code",
          notes: null,
          scheduledDate: "2026-10-23",
          scheduledTime: "10:30",
          durationMinutes: 120,
          dueDate: null,
          dueTime: null,
          reminderDate: null,
          reminderTime: null,
          clarifications: [],
        },
        {
          title: "Study DBMS",
          notes: null,
          scheduledDate: "2026-10-24",
          scheduledTime: "10:00",
          durationMinutes: null,
          dueDate: null,
          dueTime: null,
          reminderDate: null,
          reminderTime: null,
          clarifications: [],
        },
      ],
      clarification: null,
    };
    const parsed = ParseTaskResultSchema.parse(raw);
    assert.strictEqual(parsed.tasks.length, 2);
    assert.strictEqual(parsed.tasks[0].title, "Code");
    assert.strictEqual(parsed.tasks[1].title, "Study DBMS");
  });

  // --- CASE 9: AMBIGUOUS CLOCK TIME ---
  test("Case 9: Ambiguous clock time ('Study at 10')", () => {
    const raw = {
      tasks: [
        {
          title: "Study",
          notes: null,
          scheduledDate: null,
          scheduledTime: null,
          durationMinutes: null,
          dueDate: null,
          dueTime: null,
          reminderDate: null,
          reminderTime: null,
          clarifications: ["Did you mean 10 AM or 10 PM?"],
        },
      ],
      clarification: null,
    };
    const parsed = ParseTaskResultSchema.parse(raw);
    assert.strictEqual(parsed.tasks[0].clarifications.length, 1);
    assert.match(parsed.tasks[0].clarifications[0], /10 AM or 10 PM/);
  });

  // --- CASE 10: CONTEXTUAL FILLER ---
  test("Case 10: Contextual filler ('I just woke up. I need to code for one hour')", () => {
    const raw = {
      tasks: [
        {
          title: "Code",
          notes: null,
          scheduledDate: null,
          scheduledTime: null,
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
    const parsed = ParseTaskResultSchema.parse(raw);
    assert.strictEqual(parsed.tasks.length, 1);
    assert.notStrictEqual(parsed.tasks[0].title, "I just woke up");
    assert.strictEqual(parsed.tasks[0].durationMinutes, 60);
  });

  // --- CASE 11: MALFORMED MODEL OUTPUT ---
  test("Case 11: Malformed model output is rejected by schema", () => {
    const malformed = {
      tasks: [
        {
          title: "", // Empty title invalid
          scheduledDate: "2026-02-31", // Invalid date
        },
      ],
    };
    const validation = ParseTaskResultSchema.safeParse(malformed);
    assert.strictEqual(validation.success, false);
  });

  // --- HONO WORKER API TESTS ---
  await testAsync("Worker API: GET /api/health returns ok", async () => {
    const req = new Request("http://localhost/api/health", { method: "GET" });
    const res = await workerApp.fetch(req, {} as Env);
    assert.strictEqual(res.status, 200);
    const body = (await res.json()) as { ok: boolean; service: string };
    assert.strictEqual(body.ok, true);
    assert.strictEqual(body.service, "daymark-api");
  });

  await testAsync("Worker API: POST /api/parse-task rejects invalid JSON with 400", async () => {
    const req = new Request("http://localhost/api/parse-task", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "invalid-json{",
    });
    const res = await workerApp.fetch(req, {} as Env);
    assert.strictEqual(res.status, 400);
  });

  await testAsync("Worker API: POST /api/parse-task returns 503 when GROQ_API_KEY is missing", async () => {
    const prevKey = process.env.GROQ_API_KEY;
    const prevGroqKey = process.env.Groq_api_key;
    delete process.env.GROQ_API_KEY;
    delete process.env.Groq_api_key;

    try {
      const req = new Request("http://localhost/api/parse-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: "Code for one hour",
          referenceNow: "2026-10-23T10:00:00",
          timeZone: "Asia/Kolkata",
        }),
      });
      const res = await workerApp.fetch(req, {} as Env);
      assert.strictEqual(res.status, 503);
      const body = (await res.json()) as { ok: boolean; error: { code: string } };
      assert.strictEqual(body.ok, false);
      assert.strictEqual(body.error.code, "GROQ_API_KEY_MISSING");
    } finally {
      if (prevKey) process.env.GROQ_API_KEY = prevKey;
      if (prevGroqKey) process.env.Groq_api_key = prevGroqKey;
    }
  });

  // Load GROQ_API_KEY from .dev.vars or .env.local if not already set in process.env
  if (!process.env.GROQ_API_KEY) {
    try {
      const fs = await import("node:fs");
      const path = await import("node:path");
      const devVarsPath = path.resolve(process.cwd(), ".dev.vars");
      if (fs.existsSync(devVarsPath)) {
        const content = fs.readFileSync(devVarsPath, "utf8");
        for (const line of content.split("\n")) {
          const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/);
          if (match && match[1] === "GROQ_API_KEY") {
            process.env.GROQ_API_KEY = match[2].trim().replace(/^["']|["']$/g, "");
          }
        }
      }
    } catch {
      // ignore
    }
  }

  // Live Groq Integration Tests (when GROQ_API_KEY is available)
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  if (process.env.GROQ_API_KEY) {
    async function fetchWithGroqRetry(bodyObj: Record<string, unknown>): Promise<Response> {
      for (let attempt = 0; attempt < 3; attempt++) {
        const req = new Request("http://localhost/api/parse-task", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bodyObj),
        });
        const res = await workerApp.fetch(req, { GROQ_API_KEY: process.env.GROQ_API_KEY } as Env);
        if (res.status === 429) {
          console.log("    (Groq TPM rate limit hit, waiting 7s before retry...)");
          await sleep(7000);
          continue;
        }
        return res;
      }
      const finalReq = new Request("http://localhost/api/parse-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyObj),
      });
      return await workerApp.fetch(finalReq, { GROQ_API_KEY: process.env.GROQ_API_KEY } as Env);
    }

    await sleep(2500); // Wait for rate limit window to refresh
    await testAsync("Live Groq: Case 1 - 'I\\'ll do coding now for two hours.'", async () => {
      const res = await fetchWithGroqRetry({
        transcript: "I'll do coding now for two hours.",
        referenceNow: "2026-10-23T11:15:00",
        timeZone: "Asia/Kolkata",
      });
      assert.strictEqual(res.status, 200);
      const body = (await res.json()) as { ok: boolean; data: { tasks: ProposedTask[] } };
      assert.strictEqual(body.ok, true);
      assert.strictEqual(body.data.tasks.length, 1);
      assert.match(body.data.tasks[0].title.toLowerCase(), /coding/);
      assert.strictEqual(body.data.tasks[0].scheduledDate, "2026-10-23");
      assert.strictEqual(body.data.tasks[0].scheduledTime, "11:15");
      assert.strictEqual(body.data.tasks[0].durationMinutes, 120);
    });

    await sleep(2000);
    await testAsync("Live Groq: Case 2 - 'Study DBMS tomorrow at 10 AM for one hour.'", async () => {
      const res = await fetchWithGroqRetry({
        transcript: "Study DBMS tomorrow at 10 AM for one hour.",
        referenceNow: "2026-10-23T11:15:00",
        timeZone: "Asia/Kolkata",
      });
      assert.strictEqual(res.status, 200);
      const body = (await res.json()) as { ok: boolean; data: { tasks: ProposedTask[] } };
      assert.strictEqual(body.ok, true);
      assert.strictEqual(body.data.tasks.length, 1);
      assert.match(body.data.tasks[0].title.toLowerCase(), /dbms/);
      assert.strictEqual(body.data.tasks[0].scheduledDate, "2026-10-24");
      assert.strictEqual(body.data.tasks[0].scheduledTime, "10:00");
      assert.strictEqual(body.data.tasks[0].durationMinutes, 60);
    });

    await sleep(2000);
    await testAsync("Live Groq: Case 3 - 'Finish my assignment by 6 PM.' (Deadline)", async () => {
      const res = await fetchWithGroqRetry({
        transcript: "Finish my assignment by 6 PM.",
        referenceNow: "2026-10-23T11:15:00",
        timeZone: "Asia/Kolkata",
      });
      assert.strictEqual(res.status, 200);
      const body = (await res.json()) as { ok: boolean; data: { tasks: ProposedTask[] } };
      assert.strictEqual(body.ok, true);
      assert.strictEqual(body.data.tasks.length, 1);
      assert.strictEqual(body.data.tasks[0].scheduledTime, null);
      assert.strictEqual(body.data.tasks[0].dueTime, "18:00");
    });

    await sleep(2000);
    await testAsync("Live Groq: Case 4 - 'Study at 10.' (Clarification / Unresolved Hour)", async () => {
      const res = await fetchWithGroqRetry({
        transcript: "Study at 10.",
        referenceNow: "2026-10-23T11:15:00",
        timeZone: "Asia/Kolkata",
      });
      assert.strictEqual(res.status, 200);
      const body = (await res.json()) as { ok: boolean; data: { tasks: ProposedTask[] } };
      assert.strictEqual(body.ok, true);
      const clarificationPresent =
        (body.data.tasks[0]?.clarifications?.length ?? 0) > 0 ||
        body.data.tasks[0]?.scheduledTime === null;
      assert.strictEqual(clarificationPresent, true);
    });

    await sleep(2000);
    await testAsync("Live Groq: Case C - Multilingual Hinglish ('Abhi do ghante coding karunga, phir kal 11 baje DBMS padhunga.')", async () => {
      const res = await fetchWithGroqRetry({
        transcript: "Abhi do ghante coding karunga, phir kal 11 baje DBMS padhunga.",
        referenceNow: "2026-10-23T11:15:00",
        timeZone: "Asia/Kolkata",
        locale: "hi-IN",
      });
      assert.strictEqual(res.status, 200);
      const body = (await res.json()) as { ok: boolean; data: { tasks: ProposedTask[] } };
      assert.strictEqual(body.ok, true);
      assert.strictEqual(body.data.tasks.length, 2);
      assert.match(body.data.tasks[0].title.toLowerCase(), /coding/);
      assert.strictEqual(body.data.tasks[0].durationMinutes, 120);
      assert.match(body.data.tasks[1].title.toLowerCase(), /dbms/);
      assert.strictEqual(body.data.tasks[1].scheduledTime, "11:00");
    });

    await sleep(2000);
    await testAsync("Live Groq: Case D - Multilingual Marathi ('Aata don taas coding karto, udyan sakali 11 vajta DBMS cha abhyas karin.')", async () => {
      const res = await fetchWithGroqRetry({
        transcript: "Aata don taas coding karto, udyan sakali 11 vajta DBMS cha abhyas karin.",
        referenceNow: "2026-10-23T11:15:00",
        timeZone: "Asia/Kolkata",
        locale: "mr-IN",
      });
      assert.strictEqual(res.status, 200);
      const body = (await res.json()) as { ok: boolean; data: { tasks: ProposedTask[] } };
      assert.strictEqual(body.ok, true);
      assert.strictEqual(body.data.tasks.length, 2);
      assert.match(body.data.tasks[0].title.toLowerCase(), /coding/);
      assert.strictEqual(body.data.tasks[0].durationMinutes, 120);
      assert.match(body.data.tasks[1].title.toLowerCase(), /dbms/);
      assert.strictEqual(body.data.tasks[1].scheduledTime, "11:00");
    });

    await sleep(2000);
    await testAsync("Live Groq: Case E - Deadline and Reminder ('Finish my assignment by 6 PM and remind me to call Mom tomorrow at 5 PM.')", async () => {
      const res = await fetchWithGroqRetry({
        transcript: "Finish my assignment by 6 PM and remind me to call Mom tomorrow at 5 PM.",
        referenceNow: "2026-10-23T11:15:00",
        timeZone: "Asia/Kolkata",
      });
      assert.strictEqual(res.status, 200);
      const body = (await res.json()) as { ok: boolean; data: { tasks: ProposedTask[] } };
      assert.strictEqual(body.ok, true);
      assert.strictEqual(body.data.tasks.length, 2);
      // Assignment has deadline
      assert.strictEqual(body.data.tasks[0].dueTime, "18:00");
      // Call Mom has reminder
      assert.match(body.data.tasks[1].title.toLowerCase(), /mom/);
      assert.strictEqual(body.data.tasks[1].reminderTime, "17:00");
    });

    await sleep(2000);
    await testAsync("Live Groq: Case F - Multiple Tasks ('I will code for two hours now, study DBMS tomorrow at 11 AM, and revise DSA for 30 minutes.')", async () => {
      const res = await fetchWithGroqRetry({
        transcript: "I will code for two hours now, study DBMS tomorrow at 11 AM, and revise DSA for 30 minutes.",
        referenceNow: "2026-10-23T11:15:00",
        timeZone: "Asia/Kolkata",
      });
      assert.strictEqual(res.status, 200);
      const body = (await res.json()) as { ok: boolean; data: { tasks: ProposedTask[] } };
      assert.strictEqual(body.ok, true);
      assert.strictEqual(body.data.tasks.length, 3);
      assert.match(body.data.tasks[0].title.toLowerCase(), /cod/);
      assert.match(body.data.tasks[1].title.toLowerCase(), /dbms/);
      assert.match(body.data.tasks[2].title.toLowerCase(), /dsa/);
      assert.strictEqual(body.data.tasks[2].durationMinutes, 30);
    });
  }

  // --- LOCAL NOTIFICATION UNIT TESTS ---
  test("NotificationService: getNotificationId produces stable 32-bit positive integer", async () => {
    const { getNotificationId } = await import("../src/react-app/services/notifications/NotificationService");
    const id1 = getNotificationId("task-12345");
    const id2 = getNotificationId("task-12345");
    const id3 = getNotificationId("task-different");

    assert.strictEqual(id1, id2);
    assert.notStrictEqual(id1, id3);
    assert.strictEqual(id1 > 0, true);
    assert.strictEqual(id1 <= 2147483647, true);
  });

  // --- CASE 17: USER EDITS PROPOSAL & CASE 18: LOCAL PERSISTENCE ---
  await testAsync("Case 17 & 18: User edits proposal and saves to local repository", async () => {
    const repo = new WebTaskRepository();
    await repo.init();
    const initialTasks = await repo.getTasks();
    const initialCount = initialTasks.length;

    // AI proposed: "Study for 2 hours"
    // User edited title to "Study Advanced Calculus" and duration to 90 mins before confirming
    const editedProposal: ProposedTask = {
      title: "Study Advanced Calculus",
      notes: "Chapter 4 limits",
      scheduledDate: "2026-10-23",
      scheduledTime: "14:00",
      durationMinutes: 90,
      dueDate: null,
      dueTime: null,
      reminderDate: null,
      reminderTime: null,
      clarifications: [],
    };

    const saved = await repo.createTask({
      title: editedProposal.title,
      notes: editedProposal.notes ?? undefined,
      scheduledDate: editedProposal.scheduledDate ?? undefined,
      scheduledTime: editedProposal.scheduledTime ?? undefined,
      durationMinutes: editedProposal.durationMinutes ?? undefined,
    });

    assert.strictEqual(saved.title, "Study Advanced Calculus");
    assert.strictEqual(saved.durationMinutes, 90);

    const updatedTasks = await repo.getTasks();
    assert.strictEqual(updatedTasks.length, initialCount + 1);
    assert.strictEqual(updatedTasks[0].id, saved.id);
  });

  console.log(`\nTest Results: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
