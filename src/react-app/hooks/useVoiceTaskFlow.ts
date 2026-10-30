import { useReducer, useRef, useState, useCallback, useEffect } from "react";
import type { ProposedTask } from "../../shared/types/voiceTask";
import {
  audioRecorderService,
  type RecordedAudioResult,
} from "../services/audio/AudioRecorderService";
import {
  parseTasksFromTranscript,
  transcribeAndParseAudio,
} from "../services/api/taskParsingApi";
import type { TaskRepository } from "../storage/TaskRepository";
import { notificationService } from "../services/notifications/NotificationService";
import { haptics } from "../lib/haptics";

export type VoiceState =
  | "idle"
  | "checking_availability"
  | "requesting_permission"
  | "listening"
  | "transcript_ready"
  | "parsing"
  | "reviewing"
  | "saving"
  | "success"
  | "error";

interface VoiceFlowState {
  state: VoiceState;
  transcript: string;
  errorMessage: string | null;
  proposedTasks: ProposedTask[];
  overallClarification: string | null;
  savedCount: number;
}

type VoiceAction =
  | { type: "START_CHECK" }
  | { type: "NEED_PERMISSION" }
  | { type: "LISTENING_STARTED" }
  | { type: "UPDATE_TRANSCRIPT"; transcript: string }
  | { type: "START_PARSING" }
  | { type: "PARSE_SUCCESS"; tasks: ProposedTask[]; clarification: string | null }
  | { type: "PARSE_ERROR"; message: string }
  | { type: "UPDATE_PROPOSAL"; index: number; task: ProposedTask }
  | { type: "REMOVE_PROPOSAL"; index: number }
  | { type: "START_SAVING" }
  | { type: "SAVE_SUCCESS"; count: number }
  | { type: "SAVE_ERROR"; message: string }
  | { type: "RESET" }
  | { type: "SET_ERROR"; message: string };

const initialState: VoiceFlowState = {
  state: "idle",
  transcript: "",
  errorMessage: null,
  proposedTasks: [],
  overallClarification: null,
  savedCount: 0,
};

function voiceReducer(state: VoiceFlowState, action: VoiceAction): VoiceFlowState {
  switch (action.type) {
    case "START_CHECK":
      return { ...state, state: "checking_availability", errorMessage: null };
    case "NEED_PERMISSION":
      return { ...state, state: "requesting_permission", errorMessage: null };
    case "LISTENING_STARTED":
      return { ...state, state: "listening", errorMessage: null };
    case "UPDATE_TRANSCRIPT":
      return { ...state, transcript: action.transcript };
    case "START_PARSING":
      return { ...state, state: "parsing", errorMessage: null };
    case "PARSE_SUCCESS":
      return {
        ...state,
        state: "reviewing",
        proposedTasks: action.tasks,
        overallClarification: action.clarification,
        errorMessage: null,
      };
    case "PARSE_ERROR":
      return {
        ...state,
        state: "error",
        errorMessage: action.message,
      };
    case "UPDATE_PROPOSAL": {
      const updated = [...state.proposedTasks];
      updated[action.index] = action.task;
      return { ...state, proposedTasks: updated };
    }
    case "REMOVE_PROPOSAL": {
      const filtered = state.proposedTasks.filter((_, idx) => idx !== action.index);
      return {
        ...state,
        proposedTasks: filtered,
        state: filtered.length === 0 ? "transcript_ready" : "reviewing",
      };
    }
    case "START_SAVING":
      return { ...state, state: "saving", errorMessage: null };
    case "SAVE_SUCCESS":
      return {
        ...state,
        state: "success",
        savedCount: action.count,
        errorMessage: null,
      };
    case "SAVE_ERROR":
      return {
        ...state,
        state: "reviewing",
        errorMessage: action.message,
      };
    case "SET_ERROR":
      return {
        ...state,
        state: "error",
        errorMessage: action.message,
      };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

export function useVoiceTaskFlow(repository: TaskRepository, onSaveComplete?: () => void) {
  const [state, dispatch] = useReducer(voiceReducer, initialState);
  const [selectedLocale, setSelectedLocale] = useState<string>("en-IN");
  const [audioLevel, setAudioLevel] = useState<number>(0.1);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [hasRetainedAudio, setHasRetainedAudio] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const captureReferenceTimestampRef = useRef<string | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const retainedAudioRef = useRef<RecordedAudioResult | null>(null);

  const clearTimer = useCallback(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      audioRecorderService.cancelRecording().catch(() => {});
      clearTimer();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [clearTimer]);

  const startListening = useCallback(async () => {
    dispatch({ type: "START_CHECK" });
    setRecordingSeconds(0);
    setAudioLevel(0.15);
    retainedAudioRef.current = null;
    setHasRetainedAudio(false);

    // Capture stable wall-clock reference date/time when microphone is tapped
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    captureReferenceTimestampRef.current = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;

    const isAvail = await audioRecorderService.isAvailable();
    if (!isAvail) {
      dispatch({
        type: "SET_ERROR",
        message: "Audio recording is not supported in this environment.",
      });
      return;
    }

    dispatch({ type: "NEED_PERMISSION" });
    const hasPerm = await audioRecorderService.checkPermission();
    if (!hasPerm) {
      const granted = await audioRecorderService.requestPermission();
      if (!granted) {
        dispatch({
          type: "SET_ERROR",
          message: "Microphone permission is required to record tasks.",
        });
        return;
      }
    }

    try {
      await audioRecorderService.startRecording((level) => {
        setAudioLevel(level);
      });

      dispatch({ type: "LISTENING_STARTED" });

      clearTimer();
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err: unknown) {
      clearTimer();
      const msg = err instanceof Error ? err.message : "Failed to start recording audio.";
      dispatch({ type: "SET_ERROR", message: msg });
    }
  }, [clearTimer]);

  const stopListening = useCallback(async () => {
    clearTimer();

    let referenceNow = captureReferenceTimestampRef.current;
    if (!referenceNow) {
      referenceNow = new Date().toISOString().slice(0, 19);
    }

    let timeZone = "Asia/Kolkata";
    try {
      timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";
    } catch {
      // Fallback
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortCtrl = new AbortController();
    abortControllerRef.current = abortCtrl;

    try {
      dispatch({ type: "START_PARSING" });

      const recorded = await audioRecorderService.stopRecording();
      // Retain the captured audio recording so it is preserved if network/upload fails
      retainedAudioRef.current = recorded;
      setHasRetainedAudio(true);

      // Send complete audio to Hono backend (transcribes with Groq whisper-large-v3, parses with Groq gpt-oss-20b)
      const result = await transcribeAndParseAudio(
        {
          audioBlob: recorded.blob,
          audioBase64: recorded.base64,
          mimeType: recorded.mimeType,
          referenceNow,
          timeZone,
          locale: selectedLocale || "en-IN",
        },
        abortCtrl.signal
      );

      dispatch({ type: "UPDATE_TRANSCRIPT", transcript: result.transcript });

      if (!result.tasks || result.tasks.length === 0) {
        dispatch({
          type: "PARSE_SUCCESS",
          tasks: [],
          clarification:
            result.clarification ||
            "Could not identify any actionable tasks in the speech. Please review the transcript or try again.",
        });
      } else {
        dispatch({
          type: "PARSE_SUCCESS",
          tasks: result.tasks,
          clarification: result.clarification,
        });
      }

      haptics.voiceRecordingSuccess().catch(() => {});
    } catch (err: unknown) {
      if (err instanceof Error && err.message === "REQUEST_ABORTED") {
        return;
      }
      const message =
        err instanceof Error ? err.message : "Failed to process audio recording.";
      dispatch({ type: "PARSE_ERROR", message });
    }
  }, [clearTimer, selectedLocale]);

  const retryProcessingAudio = useCallback(async () => {
    if (!retainedAudioRef.current) return;

    let referenceNow = captureReferenceTimestampRef.current;
    if (!referenceNow) {
      referenceNow = new Date().toISOString().slice(0, 19);
    }

    let timeZone = "Asia/Kolkata";
    try {
      timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";
    } catch {
      // Fallback
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortCtrl = new AbortController();
    abortControllerRef.current = abortCtrl;

    try {
      dispatch({ type: "START_PARSING" });
      const recorded = retainedAudioRef.current;

      const result = await transcribeAndParseAudio(
        {
          audioBlob: recorded.blob,
          audioBase64: recorded.base64,
          mimeType: recorded.mimeType,
          referenceNow,
          timeZone,
          locale: selectedLocale || "en-IN",
        },
        abortCtrl.signal
      );

      dispatch({ type: "UPDATE_TRANSCRIPT", transcript: result.transcript });

      if (!result.tasks || result.tasks.length === 0) {
        dispatch({
          type: "PARSE_SUCCESS",
          tasks: [],
          clarification:
            result.clarification ||
            "Could not identify any actionable tasks in the speech. Please review the transcript or try again.",
        });
      } else {
        dispatch({
          type: "PARSE_SUCCESS",
          tasks: result.tasks,
          clarification: result.clarification,
        });
      }

      haptics.voiceRecordingSuccess().catch(() => {});
    } catch (err: unknown) {
      if (err instanceof Error && err.message === "REQUEST_ABORTED") {
        return;
      }
      const message =
        err instanceof Error ? err.message : "Failed to process audio recording.";
      dispatch({ type: "PARSE_ERROR", message });
    }
  }, [selectedLocale]);

  const cancelListening = useCallback(async () => {
    clearTimer();
    retainedAudioRef.current = null;
    setHasRetainedAudio(false);
    await audioRecorderService.cancelRecording().catch(() => {});
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    dispatch({ type: "RESET" });
  }, [clearTimer]);

  const updateTranscript = useCallback((text: string) => {
    dispatch({ type: "UPDATE_TRANSCRIPT", transcript: text });
  }, []);

  const submitTranscript = useCallback(
    async (overrideTranscript?: string) => {
      const raw = overrideTranscript !== undefined ? overrideTranscript : state.transcript;
      const trimmed = raw.trim();
      if (!trimmed) {
        dispatch({
          type: "SET_ERROR",
          message: "No words detected. Please speak or type your task.",
        });
        return;
      }

      dispatch({ type: "UPDATE_TRANSCRIPT", transcript: trimmed });
      dispatch({ type: "START_PARSING" });

      let referenceNow = captureReferenceTimestampRef.current;
      if (!referenceNow) {
        referenceNow = new Date().toISOString().slice(0, 19);
      }

      let timeZone = "Asia/Kolkata";
      try {
        timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";
      } catch {
        // Fallback
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const abortCtrl = new AbortController();
      abortControllerRef.current = abortCtrl;

      try {
        const result = await parseTasksFromTranscript(
          {
            transcript: trimmed,
            referenceNow,
            timeZone,
            locale: selectedLocale || "en-IN",
          },
          abortCtrl.signal
        );

        if (!result.tasks || result.tasks.length === 0) {
          dispatch({
            type: "PARSE_SUCCESS",
            tasks: [],
            clarification:
              result.clarification ||
              "Could not identify any actionable tasks. Please try rephrasing.",
          });
        } else {
          dispatch({
            type: "PARSE_SUCCESS",
            tasks: result.tasks,
            clarification: result.clarification,
          });
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.message === "REQUEST_ABORTED") {
          return;
        }
        const message =
          err instanceof Error ? err.message : "Failed to parse tasks from transcript.";
        dispatch({ type: "PARSE_ERROR", message });
      }
    },
    [state.transcript, selectedLocale]
  );

  const updateProposal = useCallback((index: number, task: ProposedTask) => {
    dispatch({ type: "UPDATE_PROPOSAL", index, task });
  }, []);

  const removeProposal = useCallback((index: number) => {
    dispatch({ type: "REMOVE_PROPOSAL", index });
  }, []);

  const confirmAndSave = useCallback(async () => {
    if (state.proposedTasks.length === 0 || state.state === "saving") return;

    dispatch({ type: "START_SAVING" });

    try {
      const savePromises = state.proposedTasks.map(async (proposal) => {
        const createdTask = await repository.createTask({
          title: proposal.title.trim(),
          notes: proposal.notes?.trim() || undefined,
          scheduledDate: proposal.scheduledDate || undefined,
          scheduledTime: proposal.scheduledTime || undefined,
          durationMinutes: proposal.durationMinutes || undefined,
          dueDate: proposal.dueDate || undefined,
          dueTime: proposal.dueTime || undefined,
          reminderDate: proposal.reminderDate || undefined,
          reminderTime: proposal.reminderTime || undefined,
        });

        if (createdTask.reminderDate && createdTask.reminderTime) {
          notificationService.scheduleReminder(createdTask).catch((err) => {
            console.warn("Failed to schedule notification for voice-created task:", err);
          });
        }
        return createdTask;
      });

      const createdTasks = await Promise.all(savePromises);
      dispatch({ type: "SAVE_SUCCESS", count: createdTasks.length });
      haptics.taskSaved().catch(() => {});
      if (onSaveComplete) {
        onSaveComplete();
      }
    } catch (err: unknown) {
      console.error("Failed to save proposed tasks to repository", err);
      dispatch({
        type: "SAVE_ERROR",
        message: "Failed to persist tasks locally. Please try again.",
      });
    }
  }, [state.proposedTasks, state.state, repository, onSaveComplete]);

  const resetFlow = useCallback(() => {
    clearTimer();
    retainedAudioRef.current = null;
    setHasRetainedAudio(false);
    audioRecorderService.cancelRecording().catch(() => {});
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    dispatch({ type: "RESET" });
  }, [clearTimer]);

  return {
    state: state.state,
    transcript: state.transcript,
    errorMessage: state.errorMessage,
    proposedTasks: state.proposedTasks,
    overallClarification: state.overallClarification,
    savedCount: state.savedCount,
    selectedLocale,
    setSelectedLocale,
    audioLevel,
    recordingSeconds,
    hasRetainedAudio,
    startListening,
    stopListening,
    cancelListening,
    retryProcessingAudio,
    updateTranscript,
    submitTranscript,
    updateProposal,
    removeProposal,
    confirmAndSave,
    resetFlow,
  };
}
