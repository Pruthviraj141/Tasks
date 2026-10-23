import React from "react";
import { motion, useReducedMotion } from "motion/react";
import { Calendar, Clock, Flag, AlignLeft, Trash2 } from "lucide-react";
import type { Task } from "../types/task";
import { CircularCheckbox } from "./CircularCheckbox";
import { formatScheduledDate, formatDueDate, formatDuration } from "../lib/dateUtils";
import { cn } from "cn";

interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onClick: (task: Task) => void;
  onDelete: (id: string) => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({
  task,
  onToggle,
  onClick,
  onDelete,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const scheduledLabel = formatScheduledDate(task.scheduledDate, task.scheduledTime);
  const dueInfo = formatDueDate(task.dueDate);
  const durationLabel = formatDuration(task.durationMinutes);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(task.id);
  };

  return (
    <motion.div
      layout
      initial={shouldReduceMotion ? false : { opacity: 0, y: 8, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={shouldReduceMotion ? false : { opacity: 0, height: 0, marginBottom: 0, overflow: "hidden" }}
      transition={{
        duration: 0.22,
        ease: [0.16, 1, 0.3, 1],
      }}
      onClick={() => onClick(task)}
      className={cn(
        "group relative flex items-start gap-3.5 px-3.5 py-3 rounded-2xl cursor-pointer transition-colors duration-150",
        "bg-white/80 hover:bg-white active:bg-[#F4F3EE] border border-[#ECEAE4]/70 hover:border-[#E2DFD7] shadow-[0_1px_2px_rgba(0,0,0,0.02)]",
        task.isCompleted && "bg-[#F7F6F2]/50 hover:bg-[#F7F6F2]/80 border-transparent shadow-none"
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
              "text-[15px] leading-snug font-[450] text-[#1C1C1E] transition-all duration-200 select-none",
              task.isCompleted && "line-through text-[#8E8C85] font-normal"
            )}
          >
            {task.title}
          </p>

          {/* Delete Button (Discreet action) */}
          <button
            type="button"
            onClick={handleDelete}
            aria-label="Delete task"
            className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-1 -m-1 text-[#9CA3AF] hover:text-[#EF4444] rounded-lg shrink-0"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>

        {/* Optional Notes Snippet */}
        {task.notes && !task.isCompleted && (
          <p className="mt-1 text-[13px] text-[#71717A] line-clamp-1 flex items-center gap-1 font-normal">
            <AlignLeft className="size-3 shrink-0 text-[#A1A1AA]" />
            <span className="truncate">{task.notes}</span>
          </p>
        )}

        {/* Secondary Metadata Badges */}
        {(scheduledLabel || dueInfo || durationLabel) && (
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {scheduledLabel && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-[11.5px] px-2 py-0.5 rounded-full font-medium tracking-tight",
                  task.isCompleted
                    ? "bg-[#EFECE6]/60 text-[#8C8982]"
                    : "bg-[#F2F0EA] text-[#55534E]"
                )}
              >
                <Calendar className="size-3 opacity-75" />
                {scheduledLabel}
              </span>
            )}

            {durationLabel && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-[11.5px] px-2 py-0.5 rounded-full font-medium tracking-tight",
                  task.isCompleted
                    ? "bg-[#EFECE6]/60 text-[#8C8982]"
                    : "bg-[#F2F0EA] text-[#55534E]"
                )}
              >
                <Clock className="size-3 opacity-75" />
                {durationLabel}
              </span>
            )}

            {dueInfo && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-[11.5px] px-2 py-0.5 rounded-full font-medium tracking-tight",
                  task.isCompleted
                    ? "bg-[#EFECE6]/60 text-[#8C8982]"
                    : dueInfo.isOverdue
                    ? "bg-[#FEE2E2] text-[#B91C1C]"
                    : "bg-[#FEF3C7] text-[#92400E]"
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
