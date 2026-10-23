import {
  ParseTaskResultSchema,
  type ParseTaskResult,
  type ParseTaskRequest,
} from "../shared/types/voiceTask";
import { buildSystemPrompt } from "./prompt";

export async function parseTasksWithGroq(
  apiKey: string,
  request: ParseTaskRequest
): Promise<ParseTaskResult> {
  const systemPrompt = buildSystemPrompt(
    request.referenceNow,
    request.timeZone,
    request.locale || "en-IN"
  );

  const endpoint = "https://api.groq.com/openai/v1/chat/completions";
  const model = "openai/gpt-oss-20b";

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: request.transcript },
        ],
        temperature: 0.1,
        max_tokens: 1024,
        response_format: { type: "json_object" },
      }),
    });
  } catch (err) {
    console.error("Groq API network/fetch error:", err);
    throw new Error("GROQ_NETWORK_ERROR");
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Groq API error (${response.status}):`, errorText);
    throw new Error(`GROQ_API_ERROR: ${response.status}`);
  }

  let json: unknown;
  try {
    json = await response.json();
  } catch (err) {
    console.error("Failed to parse Groq response JSON:", err);
    throw new Error("GROQ_RESPONSE_PARSE_ERROR");
  }

  const groqData = json as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = groqData.choices?.[0]?.message?.content;
  if (!content || !content.trim()) {
    throw new Error("EMPTY_GROQ_RESPONSE");
  }

  // Strip possible markdown fences
  const cleaned = content
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  // Locate JSON object bounds
  const startIdx = cleaned.indexOf("{");
  const endIdx = cleaned.lastIndexOf("}");
  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) {
    throw new Error("INVALID_JSON_STRUCTURE");
  }

  const jsonSubstring = cleaned.slice(startIdx, endIdx + 1);

  let parsedModelOutput: unknown;
  try {
    parsedModelOutput = JSON.parse(jsonSubstring);
  } catch (err) {
    console.error("Failed to parse extracted JSON substring:", err, jsonSubstring);
    throw new Error("JSON_PARSE_ERROR");
  }

  // Pre-process and sanitize model output before strict validation
  if (parsedModelOutput && typeof parsedModelOutput === "object") {
    const rawObj = parsedModelOutput as Record<string, unknown>;
    if (Array.isArray(rawObj.tasks)) {
      const seenSignatures = new Set<string>();
      const sanitizedTasks: unknown[] = [];

      for (const t of rawObj.tasks) {
        if (!t || typeof t !== "object") continue;
        const taskObj = t as Record<string, unknown>;
        const title = typeof taskObj.title === "string" ? taskObj.title.trim() : "";
        if (!title) continue;

        const signature = `${title.toLowerCase()}|${taskObj.scheduledDate}|${taskObj.scheduledTime}|${taskObj.dueDate}|${taskObj.dueTime}|${taskObj.durationMinutes}`;
        if (seenSignatures.has(signature)) continue;
        seenSignatures.add(signature);

        sanitizedTasks.push({
          ...taskObj,
          title,
        });
      }
      rawObj.tasks = sanitizedTasks;
    }
  }

  // Validate strictly with Zod schema
  const validation = ParseTaskResultSchema.safeParse(parsedModelOutput);
  if (!validation.success) {
    console.error("Zod schema validation failed on model output:", validation.error.format());
    throw new Error("VALIDATION_ERROR");
  }

  return validation.data;
}
