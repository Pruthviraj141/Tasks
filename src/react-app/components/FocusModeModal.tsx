import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Play, Pause, X, Check, RotateCcw, Sparkles } from "lucide-react";
import type { Task } from "../types/task";
import { haptics } from "../lib/haptics";

interface FocusModeModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onCompleteTask: (taskId: string) => Promise<unknown>;
}

interface PersistedFocusSession {
  taskId: string;
  totalDurationSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
  lastUpdatedTimestamp: number;
}

const STORAGE_KEY = "daymark_focus_session";

function getInitialSession(task: Task) {
  const durationSeconds = (task.durationMinutes || 25) * 60;
  try {
    const savedStr = localStorage.getItem(STORAGE_KEY);
    if (savedStr) {
      const saved: PersistedFocusSession = JSON.parse(savedStr);
      if (saved.taskId === task.id) {
        const now = Date.now();
        if (saved.isRunning) {
          const elapsed = Math.floor((now - saved.lastUpdatedTimestamp) / 1000);
          const rem = Math.max(0, saved.remainingSeconds - elapsed);
          return { remaining: rem, isRunning: rem > 0, isCompleted: rem === 0 };
        }
        return { remaining: saved.remainingSeconds, isRunning: false, isCompleted: false };
      }
    }
  } catch {
    // Storage fallback
  }
  return { remaining: durationSeconds, isRunning: false, isCompleted: false };
}

interface FocusBodyProps {
  task: Task;
  onClose: () => void;
  onCompleteTask: (taskId: string) => Promise<unknown>;
}

const FocusBody = ({ task, onClose, onCompleteTask }: FocusBodyProps) => {
  const durationSeconds = (task.durationMinutes || 25) * 60;

  const [remainingSeconds, setRemainingSeconds] = useState<number>(() => getInitialSession(task).remaining);
  const [isRunning, setIsRunning] = useState<boolean>(() => getInitialSession(task).isRunning);
  const [isCompleted, setIsCompleted] = useState<boolean>(() => getInitialSession(task).isCompleted);

  const lastTimestampRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);

  const persistSession = useCallback(
    (remaining: number, running: boolean) => {
      try {
        const session: PersistedFocusSession = {
          taskId: task.id,
          totalDurationSeconds: durationSeconds,
          remainingSeconds: remaining,
          isRunning: running,
          lastUpdatedTimestamp: Date.now(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      } catch {
        // Ignore
      }
    },
    [task.id, durationSeconds]
  );

  // Timer loop
  useEffect(() => {
    if (!isRunning) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    lastTimestampRef.current = Date.now();

    timerRef.current = window.setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;

      const now = Date.now();
      const elapsed = Math.floor((now - lastTimestampRef.current) / 1000);

      if (elapsed >= 1) {
        lastTimestampRef.current = now;
        setRemainingSeconds((prev) => {
          const next = Math.max(0, prev - elapsed);
          if (next === 0) {
            setIsRunning(false);
            setIsCompleted(true);
            haptics.taskSaved().catch(() => {});
            try {
              localStorage.removeItem(STORAGE_KEY);
            } catch {
              // Ignore
            }
            return 0;
          }
          persistSession(next, true);
          return next;
        });
      }
    }, 500);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isRunning, persistSession]);

  // Handle visibility change (returning from lock-screen or background)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (typeof document === "undefined" || !isRunning) return;

      if (!document.hidden && lastTimestampRef.current > 0) {
        const now = Date.now();
        const elapsed = Math.floor((now - lastTimestampRef.current) / 1000);
        lastTimestampRef.current = now;

        setRemainingSeconds((prev) => {
          const next = Math.max(0, prev - elapsed);
          if (next === 0) {
            setIsRunning(false);
            setIsCompleted(true);
            return 0;
          }
          persistSession(next, true);
          return next;
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isRunning, persistSession]);

  const handleTogglePlay = () => {
    haptics.selection().catch(() => {});
    if (isRunning) {
      setIsRunning(false);
      persistSession(remainingSeconds, false);
    } else {
      if (remainingSeconds === 0) {
        setRemainingSeconds(durationSeconds);
        setIsCompleted(false);
      }
      lastTimestampRef.current = Date.now();
      setIsRunning(true);
      persistSession(remainingSeconds, true);
    }
  };

  const handleReset = () => {
    haptics.selection().catch(() => {});
    setIsRunning(false);
    setIsCompleted(false);
    setRemainingSeconds(durationSeconds);
    persistSession(durationSeconds, false);
  };

  const handleFinishEarly = async () => {
    try {
      await onCompleteTask(task.id);
      haptics.taskCompleted().catch(() => {});
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Ignore
      }
      onClose();
    } catch (err) {
      console.error("Failed to complete task from focus mode", err);
    }
  };

  const handleExit = () => {
    if (isRunning) {
      persistSession(remainingSeconds, false);
    }
    onClose();
  };

  const hours = Math.floor(remainingSeconds / 3600);
  const minutes = Math.floor((remainingSeconds % 3600) / 60);
  const seconds = remainingSeconds % 60;

  const formattedTime =
    hours > 0
      ? `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
      : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const progressRatio = durationSeconds > 0 ? (durationSeconds - remainingSeconds) / durationSeconds : 0;
  const strokeDashoffset = 754 - 754 * progressRatio;

  return (
    <motion.div
      initial={{ scale: 0.94, opacity: 0, y: 16 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.94, opacity: 0, y: 16 }}
      transition={{ type: "spring", damping: 26, stiffness: 280 }}
      className="relative w-full max-w-sm bg-[#16161C] border border-[#2A2A36] rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center overflow-hidden z-10"
    >
      {/* Top Bar with Exit */}
      <div className="w-full flex items-center justify-between mb-2">
        <span className="text-[11px] font-semibold tracking-wider uppercase text-[#7C79F2] flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-[#7C79F2] animate-pulse" />
          Focus Mode
        </span>

        <button
          type="button"
          onClick={handleExit}
          className="p-1.5 text-[#8E8C9A] hover:text-[#F4F4F6] hover:bg-[#22222E] rounded-full transition-colors cursor-pointer"
          title="Exit Focus Mode"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Task Title */}
      <h3 className="text-base font-semibold text-[#F4F4F6] line-clamp-2 max-w-[280px] my-1 leading-snug">
        {task.title}
      </h3>
      <p className="text-xs text-[#8E8C9A] mb-6">
        {task.durationMinutes} minute dedicated session
      </p>

      {/* Circular Progress Ring */}
      <div className="relative size-60 flex items-center justify-center my-2">
        <svg className="size-full -rotate-90 transform" viewBox="0 0 280 280">
          <circle
            cx="140"
            cy="140"
            r="120"
            className="stroke-[#22222E]"
            strokeWidth="8"
            fill="transparent"
          />
          <circle
            cx="140"
            cy="140"
            r="120"
            className="stroke-[#7C79F2] transition-[stroke-dashoffset] duration-500 ease-linear"
            strokeWidth="8"
            strokeDasharray="754"
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-mono font-bold tracking-tight text-[#F4F4F6]">
            {formattedTime}
          </span>
          <span className="text-xs font-medium text-[#8E8C9A] mt-1">
            {isCompleted ? "Session complete!" : isRunning ? "In progress" : "Paused"}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 mt-6 w-full">
        <button
          type="button"
          onClick={handleReset}
          className="p-3 text-[#8E8C9A] hover:text-[#F4F4F6] hover:bg-[#22222E] rounded-2xl transition-all active:scale-95 cursor-pointer"
          title="Reset timer"
        >
          <RotateCcw className="size-5" />
        </button>

        <button
          type="button"
          onClick={handleTogglePlay}
          className="size-16 rounded-2xl bg-gradient-to-tr from-[#6865EE] to-[#8B5CF6] text-white flex items-center justify-center shadow-lg shadow-[#7C79F2]/30 hover:brightness-110 active:scale-95 transition-all cursor-pointer"
          title={isRunning ? "Pause" : "Start"}
        >
          {isRunning ? (
            <Pause className="size-6 fill-current" />
          ) : (
            <Play className="size-6 fill-current ml-0.5" />
          )}
        </button>

        <button
          type="button"
          onClick={handleFinishEarly}
          className="p-3 text-[#8E8C9A] hover:text-[#10B981] hover:bg-[#10B981]/10 rounded-2xl transition-all active:scale-95 cursor-pointer"
          title="Mark task completed and finish"
        >
          <Check className="size-5" />
        </button>
      </div>

      <div className="mt-5 text-[11px] text-[#717182] flex items-center gap-1">
        <Sparkles className="size-3 text-[#7C79F2]" />
        <span>Timestamp-backed session preserves time on sleep</span>
      </div>
    </motion.div>
  );
};

export const FocusModeModal = ({
  task,
  isOpen,
  onClose,
  onCompleteTask,
}: FocusModeModalProps) => {
  if (!isOpen || !task) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={onClose}
          className="fixed inset-0 bg-[#0A0A0D]/85 backdrop-blur-md"
        />
        <FocusBody
          key={task.id}
          task={task}
          onClose={onClose}
          onCompleteTask={onCompleteTask}
        />
      </div>
    </AnimatePresence>
  );
};
