import { z } from "zod";

// Date & Time validation helpers
export function isValidCalendarDate(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return (
    date.getFullYear() === y &&
    date.getMonth() === m - 1 &&
    date.getDate() === d
  );
}

export function isValidClockTime(timeStr: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(timeStr)) return false;
  const [h, m] = timeStr.split(":").map(Number);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
}

// Request Schema
export const ParseTaskRequestSchema = z.object({
  transcript: z
    .string()
    .trim()
    .min(1, "Transcript cannot be empty")
    .max(2000, "Transcript exceeds maximum length of 2000 characters"),
  referenceNow: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/,
      "referenceNow must be in YYYY-MM-DDTHH:mm:ss local wall-clock format"
    )
    .refine((val) => {
      const datePart = val.split("T")[0];
      return isValidCalendarDate(datePart);
    }, "Invalid calendar date in referenceNow"),
  timeZone: z
    .string()
    .min(1, "timeZone is required")
    .refine((tz) => {
      try {
        Intl.DateTimeFormat(undefined, { timeZone: tz });
        return true;
      } catch {
        return false;
      }
    }, "Invalid IANA timezone string"),
  locale: z.string().optional().default("en-IN"),
});

export type ParseTaskRequest = z.infer<typeof ParseTaskRequestSchema>;

// Proposed Task Schema
export const ProposedTaskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Task title cannot be empty")
    .max(160, "Task title exceeds 160 characters"),
  notes: z.string().nullable().default(null),
  scheduledDate: z
    .string()
    .nullable()
    .refine(
      (val) => val === null || isValidCalendarDate(val),
      "scheduledDate must be a valid YYYY-MM-DD date"
    )
    .default(null),
  scheduledTime: z
    .string()
    .nullable()
    .refine(
      (val) => val === null || isValidClockTime(val),
      "scheduledTime must be a valid 24h HH:mm time"
    )
    .default(null),
  durationMinutes: z
    .number()
    .int()
    .positive()
    .max(10080, "Duration cannot exceed 7 days (10080 mins)")
    .nullable()
    .default(null),
  dueDate: z
    .string()
    .nullable()
    .refine(
      (val) => val === null || isValidCalendarDate(val),
      "dueDate must be a valid YYYY-MM-DD date"
    )
    .default(null),
  dueTime: z
    .string()
    .nullable()
    .refine(
      (val) => val === null || isValidClockTime(val),
      "dueTime must be a valid 24h HH:mm time"
    )
    .default(null),
  reminderDate: z
    .string()
    .nullable()
    .refine(
      (val) => val === null || isValidCalendarDate(val),
      "reminderDate must be a valid YYYY-MM-DD date"
    )
    .default(null),
  reminderTime: z
    .string()
    .nullable()
    .refine(
      (val) => val === null || isValidClockTime(val),
      "reminderTime must be a valid 24h HH:mm time"
    )
    .default(null),
  clarifications: z.array(z.string()).default([]),
});

export type ProposedTask = z.infer<typeof ProposedTaskSchema>;

// Extracted Result Schema
export const ParseTaskResultSchema = z.object({
  tasks: z.array(ProposedTaskSchema).max(5, "Maximum 5 tasks extracted at once"),
  clarification: z.string().nullable().default(null),
});

export type ParseTaskResult = z.infer<typeof ParseTaskResultSchema>;

// API Response Envelopes
export type ParseTaskSuccessResponse = {
  ok: true;
  data: ParseTaskResult;
};

export type ParseTaskErrorResponse = {
  ok: false;
  error: {
    code: string;
    message: string;
  };
};

export type ParseTaskResponse = ParseTaskSuccessResponse | ParseTaskErrorResponse;
