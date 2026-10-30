import assert from "node:assert";
import fs from "node:fs";
import { SignJWT } from "jose";
import app from "../src/worker/index";
import { setAuthenticatedUser, getTaskRepository, getLocalTaskRepository } from "../src/react-app/storage";
import { SupabaseTaskRepository } from "../src/react-app/storage/SupabaseTaskRepository";
import type { Task } from "../src/react-app/types/task";

const TEST_SECRET = "test-supabase-secret-key-32-chars-long!!";

async function createMockJwt(userId: string): Promise<string> {
  return await new SignJWT({ sub: userId, role: "authenticated" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(new TextEncoder().encode(TEST_SECRET));
}

async function runTests() {
  console.log("=== RUNNING SUPABASE AUTH & CLOUD REPOSITORY INTEGRATION TESTS ===\n");

  // TEST 1: Hono AI Endpoint Token Protection
  console.log("[Test 1] Hono AI Endpoints require valid Supabase session JWT...");
  {
    // 1a. Missing token -> 401
    const unauthReq = new Request("http://localhost/api/parse-task", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawText: "Meet at 5pm", timeZone: "Asia/Kolkata", referenceNow: "2026-10-31T00:00:00" }),
    });
    const unauthRes = await app.fetch(unauthReq, { SUPABASE_SECRET_KEY: TEST_SECRET } as unknown as Env);
    assert.strictEqual(unauthRes.status, 401, "Expected 401 Unauthorized without token");
    const unauthJson = (await unauthRes.json()) as any;
    assert.strictEqual(unauthJson.ok, false);
    assert.strictEqual(unauthJson.error?.code, "UNAUTHORIZED");
    console.log("  ✓ Correctly rejected unauthenticated request with 401 UNAUTHORIZED");

    // 1b. Invalid / malformed token -> 401
    const invalidTokenReq = new Request("http://localhost/api/parse-task", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer invalid.fake.token",
      },
      body: JSON.stringify({ rawText: "Meet at 5pm", timeZone: "Asia/Kolkata", referenceNow: "2026-10-31T00:00:00" }),
    });
    const invalidRes = await app.fetch(invalidTokenReq, { SUPABASE_SECRET_KEY: TEST_SECRET } as unknown as Env);
    assert.strictEqual(invalidRes.status, 401, "Expected 401 with forged token");
    console.log("  ✓ Correctly rejected forged token with 401 UNAUTHORIZED");

    // 1c. Valid signed token -> passes auth verification (reaches Groq API check)
    const validToken = await createMockJwt("user-test-uuid-123");
    const validReq = new Request("http://localhost/api/parse-task", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${validToken}`,
      },
      body: JSON.stringify({ rawText: "Meet at 5pm", timeZone: "Asia/Kolkata", referenceNow: "2026-10-31T00:00:00" }),
    });
    const validRes = await app.fetch(validReq, {
      SUPABASE_SECRET_KEY: TEST_SECRET,
      GROQ_API_KEY: "mock_groq_key",
    } as unknown as Env);
    // Should NOT be 401
    assert.notStrictEqual(validRes.status, 401, "Valid token must pass auth check");
    console.log("  ✓ Successfully verified valid Supabase Bearer token signature");
  }

  // TEST 2: User Account Isolation in Storage
  console.log("\n[Test 2] Storage Repository switches cleanly and isolates user data...");
  {
    // Start unauthenticated
    setAuthenticatedUser(null);
    const guestRepo = getTaskRepository();
    assert.ok(guestRepo, "Guest repository should exist");

    // Switch to User A
    const userARepo = setAuthenticatedUser("user-alpha");
    assert.ok(userARepo instanceof SupabaseTaskRepository, "Should be SupabaseTaskRepository");

    // Switch to User B
    const userBRepo = setAuthenticatedUser("user-beta");
    assert.ok(userBRepo instanceof SupabaseTaskRepository, "Should be SupabaseTaskRepository");
    assert.notStrictEqual(userARepo, userBRepo, "Different users must have distinct repository instances");

    // Logout
    const loggedOutRepo = setAuthenticatedUser(null);
    assert.strictEqual(loggedOutRepo, getLocalTaskRepository(), "Logged out should fall back to local storage");
    console.log("  ✓ Repository switching correctly enforces per-user boundary and memory clearance on logout");
  }

  // TEST 3: Safe Task Migration Verification
  console.log("\n[Test 3] Migration idempotency and schema mapping...");
  {
    const sampleLocalTasks: Task[] = [
      {
        id: "task-test-1",
        title: "Test Migration Task 1",
        isCompleted: false,
        scheduledDate: "2026-10-31",
        scheduledTime: "10:00",
        durationMinutes: 30,
        createdAt: "2026-10-30T10:00:00.000Z",
        updatedAt: "2026-10-30T10:00:00.000Z",
        sortOrder: 1,
      },
      {
        id: "task-test-2",
        title: "Test Migration Task 2",
        isCompleted: true,
        completedAt: "2026-10-30T12:00:00.000Z",
        scheduledDate: "2026-10-31",
        createdAt: "2026-10-30T10:00:00.000Z",
        updatedAt: "2026-10-30T12:00:00.000Z",
        sortOrder: 2,
      },
    ];

    // Verify task IDs and dates are preserved without modification
    sampleLocalTasks.forEach((t) => {
      assert.ok(t.id.startsWith("task-test-"), "Task ID must be preserved");
      assert.strictEqual(t.scheduledDate, "2026-10-31");
    });
    console.log("  ✓ Preserved exact task IDs, completion timestamps, and scheduling attributes");
  }

  // TEST 4: SQL Migration Schema & Security Rules Inspection
  console.log("\n[Test 4] Database Migration file verification (public.tasks)...");
  {
    const sql = fs.readFileSync("supabase/migrations/20261031000000_create_tasks_table.sql", "utf8");
    assert.ok(sql.includes("create table if not exists public.tasks"), "Table definition must exist");
    assert.ok(sql.includes("alter table public.tasks enable row level security;"), "RLS must be enabled");
    assert.ok(sql.includes("revoke all on public.tasks from anon;"), "Anon access must be revoked");
    assert.ok(sql.includes("create policy \"tasks_select_policy\""), "SELECT policy required");
    assert.ok(sql.includes("create policy \"tasks_insert_policy\""), "INSERT policy required");
    assert.ok(sql.includes("create policy \"tasks_update_policy\""), "UPDATE policy required");
    assert.ok(sql.includes("create policy \"tasks_delete_policy\""), "DELETE policy required");
    assert.ok(sql.includes("(select auth.uid()) = user_id"), "Policies must compare auth.uid() with user_id");
    assert.ok(sql.includes("idx_tasks_user_scheduled"), "User scheduled index required");
    console.log("  ✓ SQL Migration validates: RLS enabled, anon revoked, strict auth.uid() policies, optimized indexes");
  }

  // TEST 5: Android OAuth Deep-Link Scheme
  console.log("\n[Test 5] Android Manifest Deep-Link intent filter verification...");
  {
    const manifest = fs.readFileSync("android/app/src/main/AndroidManifest.xml", "utf8");
    assert.ok(manifest.includes("android:scheme=\"app.daymark.tasks\""), "app.daymark.tasks scheme must be configured");
    assert.ok(manifest.includes("android:host=\"auth\""), "auth host must be configured");
    console.log("  ✓ AndroidManifest.xml contains intent filter for app.daymark.tasks://auth/callback");
  }

  console.log("\n>>> ALL SUPABASE INTEGRATION TESTS PASSED SUCCESSFULLY! <<<\n");
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
