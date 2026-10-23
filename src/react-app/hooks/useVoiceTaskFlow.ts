import { useReducer, useRef, useState, useCallback, useEffect } from "react";
import type { ProposedTask } from "../../shared/types/voiceTask";
import { getSpeechRecognitionService } from "../services/speech";
import { parseTasksFromTranscript } from "../services/api/taskParsingApi";
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
  | { type: "PARTIAL_TRANSCRIPT"; transcript: string }
  | { type: "TRANSCRIPT_READY"; transcript: string }
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
    case "PARTIAL_TRANSCRIPT":
      return { ...state, transcript: action.transcript };
    case "TRANSCRIPT_READY":
      return {
        ...state,
        state: "transcript_ready",
        transcript: action.transcript,
        errorMessage: null,
      };
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
  const speechService = useRef(getSpeechRecognitionService());
  const abortControllerRef = useRef<AbortController | null>(null);
  const captureReferenceTimestampRef = useRef<string | null>(null);

  // Clean up on unmount
  useEffect(() => {
    const currentSpeech = speechService.current;
    return () => {
      currentSpeech.cancel();
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const startListening = useCallback(async (customLocale?: string) => {
    dispatch({ type: "START_CHECK" });

    // Capture stable wall-clock reference date/time when microphone is tapped
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    captureReferenceTimestampRef.current = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;

    const isAvail = await speechService.current.isAvailable();
    if (!isAvail) {
      dispatch({
        type: "SET_ERROR",
        message: "Speech recognition is not supported in this environment.",
      });
      return;
    }

    dispatch({ type: "NEED_PERMISSION" });
    const hasPerm = await speechService.current.checkPermission();
    if (!hasPerm) {
      const granted = await speechService.current.requestPermission();
      if (!granted) {
        dispatch({
          type: "SET_ERROR",
          message: "Microphone permission is required for voice capture.",
        });
        return;
      }
    }

    const localeToUse = customLocale || selectedLocale || "en-IN";

    try {
      await speechService.current.start(
        {
          onPartialResult: (text) => {
            dispatch({ type: "PARTIAL_TRANSCRIPT", transcript: text });
          },
          onFinalResult: (finalText) => {
            haptics.voiceRecordingSuccess().catch(() => {});
            dispatch({ type: "TRANSCRIPT_READY", transcript: finalText });
          },
          onListeningChange: (listening) => {
            if (listening) {
              dispatch({ type: "LISTENING_STARTED" });
            }
          },
          onError: (err) => {
            dispatch({
              type: "SET_ERROR",
              message: `Speech recognition error: ${err}`,
            });
          },
        },
        localeToUse
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to start listening";
      dispatch({ type: "SET_ERROR", message: msg });
    }
  }, [selectedLocale]);

  const stopListening = useCallback(async () => {
    await speechService.current.stop();
  }, []);

  const updateTranscript = useCallback((text: string) => {
    dispatch({ type: "UPDATE_TRANSCRIPT", transcript: text });
  }, []);

  const submitTranscript = useCallback(async () => {
    const trimmed = state.transcript.trim();
    if (!trimmed) {
      dispatch({
        type: "SET_ERROR",
        message: "Cannot parse empty speech transcript.",
      });
      return;
    }

    dispatch({ type: "START_PARSING" });

    // Use captured reference timestamp from microphone tap, or fallback to now if typed
    let referenceNow = captureReferenceTimestampRef.current;
    if (!referenceNow) {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const seconds = String(now.getSeconds()).padStart(2, "0");
      referenceNow = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
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
          clarification: result.clarification || "Could not identify any actionable tasks. Please try rephrasing.",
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
      const message = err instanceof Error ? err.message : "Failed to parse tasks from transcript.";
      dispatch({ type: "PARSE_ERROR", message });
    }
  }, [state.transcript, selectedLocale]);

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
      let saved = 0;
      for (const proposal of state.proposedTasks) {
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

        saved++;
      }

      dispatch({ type: "SAVE_SUCCESS", count: saved });
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
    speechService.current.cancel();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    dispatch({ type: "RESET" });
  }, []);

  return {
    state: state.state,
    transcript: state.transcript,
    errorMessage: state.errorMessage,
    proposedTasks: state.proposedTasks,
    overallClarification: state.overallClarification,
    savedCount: state.savedCount,
    selectedLocale,
    setSelectedLocale,
    startListening,
    stopListening,
    updateTranscript,
    submitTranscript,
    updateProposal,
    removeProposal,
    confirmAndSave,
    resetFlow,
  };
}
