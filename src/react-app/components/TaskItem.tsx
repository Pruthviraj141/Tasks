import type { MouseEvent } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Calendar, Clock, Flag, AlignLeft, Trash2, Play } from "lucide-react";
import type { Task } from "../types/task";
import { CircularCheckbox } from "./CircularCheckbox";
import { formatScheduledDate, formatDueDate, formatDuration } from "../lib/dateUtils";
import { cn } from "cn";

interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onClick: (task: Task) => void;
  onDelete: (id: string) => void;
  onStartFocus?: (task: Task) => void;
}

export const TaskItem = ({
  task,
  onToggle,
  onClick,
  onDelete,
  onStartFocus,
}: TaskItemProps) => {
  const shouldReduceMotion = useReducedMotion();
  const scheduledLabel = formatScheduledDate(task.scheduledDate, task.scheduledTime);
  const dueInfo = formatDueDate(task.dueDate);
  const durationLabel = formatDuration(task.durationMinutes);

  const handleDelete = (e: MouseEvent) => {
    e.stopPropagation();
    onDelete(task.id);
  };

  return (
    <motion.div
      layout
      initial={shouldReduceMotion ? undefined : { opacity: 0, y: 8, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={shouldReduceMotion ? undefined : { opacity: 0, height: 0, marginBottom: 0, overflow: "hidden" }}
      transition={{
        duration: 0.22,
        ease: [0.16, 1, 0.3, 1],
      }}
      onClick={() => onClick(task)}
      className={cn(
        "group relative flex items-start gap-3.5 px-3.5 py-3 rounded-2xl cursor-pointer transition-colors duration-150",
        "bg-white/80 hover:bg-white active:bg-[#F4F3EE] border border-[#ECEAE4]/70 hover:border-[#E2DFD7] shadow-[0_1px_2px_rgba(0,0,0,0.02)]",
        "dark:bg-[#18181D] dark:hover:bg-[#1F1F25] dark:active:bg-[#141418] dark:border-[#272730] dark:hover:border-[#353540] dark:shadow-[0_1px_4px_rgba(0,0,0,0.3)]",
        task.isCompleted && "bg-[#F7F6F2]/50 hover:bg-[#F7F6F2]/80 border-transparent shadow-none dark:bg-[#141418]/60 dark:hover:bg-[#141418]/90 dark:border-transparent"
      )}
    >
      {/* Circular Completion Control */}
      <div className="pt-0.5 shrink-0">
        <CircularCheckbox
          checked={task.isCompleted}
          onToggle={() => onToggle(task.id)}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0 pr-1">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "text-[15px] leading-snug font-[450] text-[#1C1C1E] dark:text-[#F4F4F6] transition-all duration-200 select-none",
              task.isCompleted && "line-through text-[#8E8C85] dark:text-[#686874] font-normal"
            )}
          >
            {task.title}
          </p>

          {/* Delete Button (Discreet action) */}
          <button
            type="button"
            onClick={handleDelete}
            aria-label="Delete task"
            className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-1 -m-1 text-[#9CA3AF] dark:text-[#686874] hover:text-[#EF4444] dark:hover:text-[#F87171] rounded-lg shrink-0 cursor-pointer"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>

        {/* Optional Notes Snippet */}
        {task.notes && !task.isCompleted && (
          <p className="mt-1 text-[13px] text-[#71717A] dark:text-[#9A9AA6] line-clamp-1 flex items-center gap-1 font-normal">
            <AlignLeft className="size-3 shrink-0 text-[#A1A1AA] dark:text-[#686874]" />
            <span className="truncate">{task.notes}</span>
          </p>
        )}

        {/* Secondary Metadata Badges */}
        {(scheduledLabel || dueInfo || durationLabel) && (
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {scheduledLabel && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-[11.5px] px-2 py-0.5 rounded-full font-medium tracking-tight transition-colors",
                  task.isCompleted
                    ? "bg-[#EFECE6]/60 dark:bg-[#1E1E26] text-[#8C8982] dark:text-[#686874]"
                    : "bg-[#F2F0EA] dark:bg-[#22222A] text-[#55534E] dark:text-[#B4B4C0]"
                )}
              >
                <Calendar className="size-3 opacity-75 text-[#5E5CE6] dark:text-[#7C79F2]" />
                {scheduledLabel}
              </span>
            )}

            {durationLabel && (
              <button
                type="button"
                onClick={(e) => {
                  if (onStartFocus && !task.isCompleted) {
                    e.stopPropagation();
                    onStartFocus(task);
                  }
                }}
                title={!task.isCompleted ? "Start Focus session" : undefined}
                className={cn(
                  "inline-flex items-center gap-1 text-[11.5px] px-2 py-0.5 rounded-full font-medium tracking-tight transition-colors",
                  task.isCompleted
                    ? "bg-[#EFECE6]/60 dark:bg-[#1E1E26] text-[#8C8982] dark:text-[#686874]"
                    : "bg-[#F2F0EA] dark:bg-[#22222A] text-[#55534E] dark:text-[#B4B4C0] hover:bg-[#E2DFD6] dark:hover:bg-[#2B2B36] hover:text-[#5E5CE6] dark:hover:text-[#7C79F2] cursor-pointer"
                )}
              >
                <Clock className="size-3 opacity-75 text-[#5E5CE6] dark:text-[#7C79F2]" />
                {durationLabel}
                {!task.isCompleted && (
                  <Play className="size-2.5 fill-current ml-0.5 text-[#5E5CE6] dark:text-[#7C79F2]" />
                )}
              </button>
            )}

            {dueInfo && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-[11.5px] px-2 py-0.5 rounded-full font-medium tracking-tight transition-colors",
                  task.isCompleted
                    ? "bg-[#EFECE6]/60 dark:bg-[#1E1E26] text-[#8C8982] dark:text-[#686874]"
                    : dueInfo.isOverdue
                    ? "bg-[#FEE2E2] dark:bg-[#3D1414] text-[#B91C1C] dark:text-[#FCA5A5]"
                    : "bg-[#FEF3C7] dark:bg-[#32230D] text-[#92400E] dark:text-[#FDE68A]"
                )}
              >
                <Flag className="size-3 opacity-80" />
                {dueInfo.label}
              </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};
