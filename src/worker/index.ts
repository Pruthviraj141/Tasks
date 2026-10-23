import { Hono } from "hono";
import { cors } from "hono/cors";
import { ParseTaskRequestSchema } from "../shared/types/voiceTask";
import { parseTasksWithGroq } from "./parser";

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
        origin.includes("cloudflare.com")
      ) {
        return origin || "*";
      }
      return origin;
    },
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

// Lightweight health check without AI model invocation
app.get("/api/health", (c) => {
  return c.json({
    ok: true,
    service: "daymark-api",
  });
});

// Primary task parsing endpoint using Groq openai/gpt-oss-20b
app.post("/api/parse-task", async (c) => {
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

  // Retrieve GROQ_API_KEY from env or process.env during local dev
  const globalEnv = (
    globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }
  ).process?.env;
  const envAny = c.env as unknown as Record<string, string | undefined> | undefined;
  const apiKey =
    c.env.GROQ_API_KEY ||
    envAny?.Groq_api_key ||
    envAny?.groq_api_key ||
    globalEnv?.GROQ_API_KEY ||
    globalEnv?.Groq_api_key ||
    globalEnv?.groq_api_key;

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

export default app;
