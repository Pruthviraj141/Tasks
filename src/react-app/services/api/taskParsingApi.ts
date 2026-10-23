import type {
  ParseTaskRequest,
  ParseTaskResponse,
  ParseTaskResult,
} from "../../../shared/types/voiceTask";

export function getApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === "string") {
    return envUrl.trim().replace(/\/+$/, "");
  }
  return "";
}

export async function parseTasksFromTranscript(
  request: ParseTaskRequest,
  signal?: AbortSignal
): Promise<ParseTaskResult> {
  const baseUrl = getApiBaseUrl();
  const endpoint = `${baseUrl}/api/parse-task`;

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
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
